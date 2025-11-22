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
import { getGuideLines } from "../guide-lines";

export const onDrawStart = (event: PIXI.FederatedPointerEvent) => {
  if (!["rectangle", "ellipse", "text"].includes(currentTool)) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    snapPoint = guideLines.snapToGrid(localPoint.x, localPoint.y);

    // Get existing shape snap points
    const snapPoints = getExistingShapeSnapPoints();
    const objectSnapPoint = guideLines.snapToPoints(
      localPoint.x,
      localPoint.y,
      snapPoints
    );

    // Use object snap if closer than grid snap
    const gridDistance = Math.sqrt(
      Math.pow(snapPoint.x - localPoint.x, 2) +
        Math.pow(snapPoint.y - localPoint.y, 2)
    );
    const objectDistance = Math.sqrt(
      Math.pow(objectSnapPoint.x - localPoint.x, 2) +
        Math.pow(objectSnapPoint.y - localPoint.y, 2)
    );

    if (objectDistance < gridDistance) {
      snapPoint = objectSnapPoint;
    }
  }
  setDragStart({ x: localPoint.x, y: localPoint.y });
  setIsDrawing(true);

  if (currentTool === "text") {
    const shape = createText(localPoint.x, localPoint.y, "Sample Text");
    addShapeToStage(shape);
    useSeatMapStore.getState().updateShapes(shapes, false);
  } else if (currentTool === "rectangle" || currentTool === "ellipse") {
    createPreviewGraphics();

    if (guideLines && stage) {
      const bounds = stage.getBounds();
      guideLines.createGrid(bounds.width * 2, bounds.height * 2);
    }
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

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    snapPoint = guideLines.snapToGrid(localPoint.x, localPoint.y);

    // Get snap points and show guides
    const snapPoints = getExistingShapeSnapPoints();
    const objectSnapPoint = guideLines.snapToPoints(
      localPoint.x,
      localPoint.y,
      snapPoints
    );

    if (
      objectSnapPoint.x !== localPoint.x ||
      objectSnapPoint.y !== localPoint.y
    ) {
      snapPoint = objectSnapPoint;
    }

    // Show snap guides
    guideLines.showSnapGuides(snapPoint.x, snapPoint.y, snapPoints);
  }

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

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    snapPoint = guideLines.snapToGrid(localPoint.x, localPoint.y);

    const snapPoints = getExistingShapeSnapPoints();
    const objectSnapPoint = guideLines.snapToPoints(
      localPoint.x,
      localPoint.y,
      snapPoints
    );

    const gridDistance = Math.sqrt(
      Math.pow(snapPoint.x - localPoint.x, 2) +
        Math.pow(snapPoint.y - localPoint.y, 2)
    );
    const objectDistance = Math.sqrt(
      Math.pow(objectSnapPoint.x - localPoint.x, 2) +
        Math.pow(objectSnapPoint.y - localPoint.y, 2)
    );

    if (objectDistance < gridDistance) {
      snapPoint = objectSnapPoint;
    }

    // ✅ Clear guides after drawing
    guideLines.clearAll();
  }

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
    useSeatMapStore.getState().updateShapes(shapes, true);
  }
};

const getExistingShapeSnapPoints = (): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];

  shapes.forEach((shape) => {
    if (shape.type === "container") return;

    // Add shape center
    snapPoints.push({ x: shape.x, y: shape.y });

    // Add shape corners/edges based on type
    if (shape.type === "rectangle") {
      const halfWidth = shape.width / 2;
      const halfHeight = shape.height / 2;

      snapPoints.push(
        { x: shape.x - halfWidth, y: shape.y - halfHeight }, // Top-left
        { x: shape.x + halfWidth, y: shape.y - halfHeight }, // Top-right
        { x: shape.x - halfWidth, y: shape.y + halfHeight }, // Bottom-left
        { x: shape.x + halfWidth, y: shape.y + halfHeight }, // Bottom-right
        { x: shape.x, y: shape.y - halfHeight }, // Top-center
        { x: shape.x, y: shape.y + halfHeight }, // Bottom-center
        { x: shape.x - halfWidth, y: shape.y }, // Left-center
        { x: shape.x + halfWidth, y: shape.y } // Right-center
      );
    } else if (shape.type === "ellipse") {
      snapPoints.push(
        { x: shape.x - shape.radiusX, y: shape.y }, // Left
        { x: shape.x + shape.radiusX, y: shape.y }, // Right
        { x: shape.x, y: shape.y - shape.radiusY }, // Top
        { x: shape.x, y: shape.y + shape.radiusY } // Bottom
      );
    }
  });

  return snapPoints;
};
