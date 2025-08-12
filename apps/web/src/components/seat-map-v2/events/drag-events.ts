import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { stage, shapes } from "../variables";
import { getSelectionTransform } from "./transform-events";
import { useSeatMapStore } from "../store/seat-map-store";
import { updatePolygonGraphics } from "../shapes";

// Track dragging state
let isShapeDragging = false;
let dragStart: { x: number; y: number } | null = null;
let draggedShapes: PixiShape[] = [];
let originalPositions: Array<{ x: number; y: number }> = [];
let originalPolygonPoints: Array<
  Array<{ x: number; y: number; radius?: number }>
> = []; // Store original polygon points

export const startShapeDrag = (
  event: PIXI.FederatedPointerEvent,
  shape: PixiShape
) => {
  if (!stage) return;

  const selectionTransform = getSelectionTransform();
  if (selectionTransform?.isCurrentlyTransforming) return;

  // Check for multi-select (Ctrl/Cmd key)
  const isMultiSelect = event.ctrlKey || event.metaKey;

  if (isMultiSelect) {
    // Multi-select behavior
    if (shape.selected) {
      // Drag all selected shapes
      draggedShapes = shapes.filter((s) => s.selected);
    } else {
      // Shape is not selected, don't start drag (user wants to select it first)
      return;
    }
  } else {
    // Single select behavior - unselect all and drag current shape
    shapes.forEach((s) => (s.selected = false));
    shape.selected = true;
    draggedShapes = [shape];

    // Update store with new selection
    useSeatMapStore.getState().setSelectedShapes([shape]);
    useSeatMapStore.getState().updateShapes([...shapes]);

    // Update selection transform
    if (selectionTransform) {
      selectionTransform.updateSelection([shape]);
    }
  }

  const localPoint = event.getLocalPosition(stage);
  isShapeDragging = true;
  dragStart = { x: localPoint.x, y: localPoint.y };

  // Store original positions
  originalPositions = draggedShapes.map((s) => ({
    x: s.x,
    y: s.y,
  }));

  // Store original polygon points for polygon shapes
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

  // Update positions of all dragged shapes
  draggedShapes.forEach((shape, index) => {
    const original = originalPositions[index];

    if (
      shape.type === "polygon" &&
      shape.points &&
      originalPolygonPoints[index]
    ) {
      // For polygon shapes, update individual points instead of x,y
      const originalPoints = originalPolygonPoints[index];
      shape.points = originalPoints.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
        radius: point.radius, // Preserve radius if it exists
      }));

      // Update the center position for consistency (optional, but helps with other calculations)
      shape.x = original.x + deltaX;
      shape.y = original.y + deltaY;

      // Update the graphics position
      shape.graphics.position.set(shape.x, shape.y);

      updatePolygonGraphics(shape);
    } else {
      // For non-polygon shapes, update x,y normally
      shape.x = original.x + deltaX;
      shape.y = original.y + deltaY;

      // Update PIXI graphics position
      shape.graphics.position.set(shape.x, shape.y);
    }
  });

  // Update selection transform if shapes are selected
  const selectionTransform = getSelectionTransform();
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

  // Update store with final positions
  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  useSeatMapStore.getState().setSelectedShapes([...selectedShapes]);
  useSeatMapStore.getState().updateShapes([...shapes]);
};

// Export function to check if currently dragging shapes
export const isCurrentlyShapeDragging = (): boolean => {
  return isShapeDragging;
};
