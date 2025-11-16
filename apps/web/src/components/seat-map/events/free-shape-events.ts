// Create: events/freeshape-events.ts
import * as PIXI from "pixi.js";
import {
  stage,
  currentTool,
  freeShapeDrawingState,
  setFreeShapeDrawingState,
} from "../variables";
import { addShapeToStage } from "../shapes/index";
import { createFreeShape, addPointToFreeShape } from "../shapes/free-shape";
import {
  createFreeShapePreview,
  updateFreeShapePreview,
  clearFreeShapePreview,
} from "../preview";

const CLOSE_THRESHOLD = 15; // pixels
const MIN_POINTS = 2;

const isNearFirstPoint = (
  currentPoint: { x: number; y: number },
  firstPoint: { x: number; y: number },
  threshold: number = CLOSE_THRESHOLD
): boolean => {
  const distance = Math.sqrt(
    Math.pow(currentPoint.x - firstPoint.x, 2) +
      Math.pow(currentPoint.y - firstPoint.y, 2)
  );
  return distance <= threshold;
};

export const onFreeShapeStart = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "freeshape") return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const newPoint = { x: localPoint.x, y: localPoint.y };

  if (!freeShapeDrawingState.isDrawing) {
    // Start new free shape
    const newState = {
      isDrawing: true,
      points: [newPoint],
      previewPoints: [newPoint],
      closed: false,
    };
    setFreeShapeDrawingState(newState);
    createFreeShapePreview();
  } else {
    // Add point to existing free shape
    const firstPoint = freeShapeDrawingState.points[0];

    // Check if clicking near first point to close shape
    if (
      freeShapeDrawingState.points.length >= MIN_POINTS &&
      isNearFirstPoint(newPoint, firstPoint)
    ) {
      finishFreeShape(true); // Close the shape
    } else {
      // Add new point
      const newPoints = [...freeShapeDrawingState.points, newPoint];
      const newState = {
        ...freeShapeDrawingState,
        points: newPoints,
        previewPoints: newPoints,
      };
      setFreeShapeDrawingState(newState);
    }
  }
};

export const onFreeShapeMove = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "freeshape" || !freeShapeDrawingState.isDrawing) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const currentPoint = { x: localPoint.x, y: localPoint.y };

  // Update preview with current mouse position
  const previewPoints = [...freeShapeDrawingState.points, currentPoint];

  const newState = {
    ...freeShapeDrawingState,
    previewPoints,
  };
  setFreeShapeDrawingState(newState);

  updateFreeShapePreview(
    previewPoints,
    freeShapeDrawingState.points.length >= MIN_POINTS &&
      isNearFirstPoint(currentPoint, freeShapeDrawingState.points[0])
  );
};

export const finishFreeShape = (closed: boolean = false) => {
  if (freeShapeDrawingState.points.length >= MIN_POINTS) {
    const freeShape = createFreeShape(freeShapeDrawingState.points, closed);
    if (freeShape) {
      addShapeToStage(freeShape);
    }
  }

  resetFreeShapeDrawing();
};

export const resetFreeShapeDrawing = () => {
  setFreeShapeDrawingState({
    isDrawing: false,
    points: [],
    previewPoints: [],
    closed: false,
  });
  clearFreeShapePreview();
};

export const cancelFreeShapeDrawing = () => {
  resetFreeShapeDrawing();
};

// Handle right-click to finish free shape
export const onFreeShapeRightClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "freeshape" || !freeShapeDrawingState.isDrawing) return;

  event.preventDefault();

  if (freeShapeDrawingState.points.length >= MIN_POINTS) {
    finishFreeShape(false); // Don't close the shape
  } else {
    cancelFreeShapeDrawing();
  }
};

// Handle escape key to cancel
export const onFreeShapeEscape = () => {
  if (currentTool === "freeshape" && freeShapeDrawingState.isDrawing) {
    cancelFreeShapeDrawing();
  }
};
