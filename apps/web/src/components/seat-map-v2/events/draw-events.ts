import * as PIXI from "pixi.js";
import {
  stage,
  currentTool,
  isDrawing,
  dragStart,
  setIsDrawing,
  setDragStart,
} from "../variables";
import {
  createText,
  addShapeToStage,
  createRectangle,
  createEllipse,
} from "../shapes/index";
import {
  createPreviewGraphics,
  updatePreviewShape,
  clearPreview,
} from "../preview";
import { useSeatMapStore } from "../store/seat-map-store";
import { shapes } from "../variables";

export const onDrawStart = (event: PIXI.FederatedPointerEvent) => {
  if (!["rectangle", "ellipse", "text"].includes(currentTool)) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  setDragStart({ x: localPoint.x, y: localPoint.y });
  setIsDrawing(true);

  if (currentTool === "text") {
    const shape = createText(localPoint.x, localPoint.y, "Sample Text");
    addShapeToStage(shape);
    useSeatMapStore.getState().updateShapes(shapes);
  } else if (currentTool === "rectangle" || currentTool === "ellipse") {
    createPreviewGraphics();
  }
};

export const onDrawMove = (event: PIXI.FederatedPointerEvent) => {
  if (
    !["rectangle", "ellipse"].includes(currentTool) ||
    !isDrawing ||
    !dragStart
  )
    return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  updatePreviewShape(dragStart.x, dragStart.y, localPoint.x, localPoint.y);
};

export const onDrawEnd = (event: PIXI.FederatedPointerEvent) => {
  if (
    !["rectangle", "ellipse"].includes(currentTool) ||
    !isDrawing ||
    !dragStart
  )
    return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  let shapeCreated = false;

  if (currentTool === "rectangle") {
    const width = Math.abs(localPoint.x - dragStart.x);
    const height = Math.abs(localPoint.y - dragStart.y);
    if (width > 10 && height > 10) {
      const x = Math.min(dragStart.x, localPoint.x);
      const y = Math.min(dragStart.y, localPoint.y);
      const shape = createRectangle(x, y, width, height);
      addShapeToStage(shape);
      shapeCreated = true;
    }
  } else if (currentTool === "ellipse") {
    const radiusX = Math.abs(localPoint.x - dragStart.x) / 2;
    const radiusY = Math.abs(localPoint.y - dragStart.y) / 2;
    if (radiusX > 10 && radiusY > 10) {
      const centerX = (dragStart.x + localPoint.x) / 2;
      const centerY = (dragStart.y + localPoint.y) / 2;
      const shape = createEllipse(centerX, centerY, radiusX, radiusY);
      addShapeToStage(shape);
      shapeCreated = true;
    }
  }

  clearPreview();
  setIsDrawing(false);
  setDragStart(null);

  if (shapeCreated) {
    useSeatMapStore.getState().updateShapes(shapes);
  }
};
