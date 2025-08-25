import * as PIXI from "pixi.js";
import { CanvasItem } from "../types";
import {
  stage,
  shapes,
  setPreviouslyClickedShape,
  setWasDragged,
} from "../variables";
import { getSelectionTransform } from "./transform-events";
import { useSeatMapStore } from "../store/seat-map-store";
import { updatePolygonGraphics } from "../shapes";

let isShapeDragging = false;
let dragStart: { x: number; y: number } | null = null;
let draggedShapes: CanvasItem[] = [];
let originalPositions: Array<{ x: number; y: number }> = [];
let originalPolygonPoints: Array<
  Array<{ x: number; y: number; radius?: number }>
> = [];

export const startShapeDrag = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  if (!stage) return;

  const selectionTransform = getSelectionTransform();
  if (selectionTransform?.isCurrentlyTransforming) return;

  const isMultiSelect = event.ctrlKey || event.metaKey;

  if (isMultiSelect) {
    if (shape.selected) {
      draggedShapes = shapes.filter((s) => s.selected);
    } else {
      return;
    }
  } else {
    setPreviouslyClickedShape(
      useSeatMapStore.getState().selectedShapes[0] || null
    );
    shapes.forEach((s) => (s.selected = false));
    shape.selected = true;
    draggedShapes = [shape];

    useSeatMapStore.getState().setSelectedShapes([shape]);
    useSeatMapStore.getState().updateShapes([...shapes]);

    if (selectionTransform) {
      selectionTransform.updateSelection([shape]);
    }
  }

  const localPoint = event.getLocalPosition(stage);
  isShapeDragging = true;
  dragStart = { x: localPoint.x, y: localPoint.y };

  originalPositions = draggedShapes.map((s) => ({
    x: s.x,
    y: s.y,
  }));

  originalPolygonPoints = draggedShapes.map((s) => {
    if (s.type === "polygon" && s.points) {
      return s.points.map((point) => ({ x: point.x, y: point.y }));
    }
    return [];
  });
};

export const handleShapeDrag = (event: PIXI.FederatedPointerEvent) => {
  if (!isShapeDragging || !dragStart || !stage) return;

  const currentPoint = event.getLocalPosition(stage);
  const deltaX = currentPoint.x - dragStart.x;
  const deltaY = currentPoint.y - dragStart.y;

  draggedShapes.forEach((shape, index) => {
    const original = originalPositions[index];

    if (
      shape.type === "polygon" &&
      shape.points &&
      originalPolygonPoints[index]
    ) {
      const originalPoints = originalPolygonPoints[index];
      shape.points = originalPoints.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
        radius: point.radius,
      }));

      shape.x = original.x + deltaX;
      shape.y = original.y + deltaY;

      shape.graphics.position.set(shape.x, shape.y);

      updatePolygonGraphics(shape);
    } else {
      shape.x = original.x + deltaX;
      shape.y = original.y + deltaY;

      shape.graphics.position.set(shape.x, shape.y);
    }
  });

  const selectionTransform = getSelectionTransform();
  console.log(draggedShapes);
  if (selectionTransform && draggedShapes.length > 0) {
    selectionTransform.updateSelection(draggedShapes);
  }
};

export const endShapeDrag = () => {
  if (!isShapeDragging) return;

  isShapeDragging = false;
  dragStart = null;
  draggedShapes = [];
  originalPositions = [];
  originalPolygonPoints = [];

  setWasDragged(true);

  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  useSeatMapStore.getState().setSelectedShapes([...selectedShapes]);
  useSeatMapStore.getState().updateShapes([...shapes]);
};

export const isCurrentlyShapeDragging = (): boolean => {
  return isShapeDragging;
};
