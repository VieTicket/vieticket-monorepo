import * as PIXI from "pixi.js";
import {
  stage,
  currentTool,
  freeShapeDrawingState,
  setFreeShapeDrawingState,
} from "../variables";
import { addShapeToStage } from "../shapes/index";
import { createFreeShape } from "../shapes/freeshape-shape";
import {
  createFreeShapePreview,
  updateFreeShapePreview,
  clearFreeShapePreview,
} from "../preview";
import { useSeatMapStore } from "../store/seat-map-store";
import { shapes } from "../variables";

const CLOSE_THRESHOLD = 15; // pixels
const MIN_POINTS = 3;

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
    // Start new freeshape
    const newState = {
      isDrawing: true,
      points: [newPoint],
      previewPoints: [newPoint],
      curved: false, // Start with straight edges
    };
    setFreeShapeDrawingState(newState);
    createFreeShapePreview();
  } else {
    // Add point to existing freeshape
    const firstPoint = freeShapeDrawingState.points[0];

    // Check if clicking near first point to close freeshape
    if (
      freeShapeDrawingState.points.length >= MIN_POINTS &&
      isNearFirstPoint(newPoint, firstPoint)
    ) {
      finishFreeShape();
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

export const finishFreeShape = () => {
  if (freeShapeDrawingState.points.length >= MIN_POINTS) {
    const freeShape = createFreeShape(
      freeShapeDrawingState.points,
      freeShapeDrawingState.curved
    );
    addShapeToStage(freeShape);
    useSeatMapStore.getState().updateShapes(shapes);
  }

  resetFreeShapeDrawing();
};

export const resetFreeShapeDrawing = () => {
  setFreeShapeDrawingState({
    isDrawing: false,
    points: [],
    previewPoints: [],
    curved: false,
  });
  clearFreeShapePreview();
};

export const cancelFreeShapeDrawing = () => {
  resetFreeShapeDrawing();
};

// Toggle between straight and curved mode during drawing
export const toggleFreeShapeCurved = () => {
  if (freeShapeDrawingState.isDrawing) {
    setFreeShapeDrawingState({
      ...freeShapeDrawingState,
      curved: !freeShapeDrawingState.curved,
    });
  }
};

// Handle right-click to finish freeshape
export const onFreeShapeRightClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "freeshape" || !freeShapeDrawingState.isDrawing) return;

  event.preventDefault();

  if (freeShapeDrawingState.points.length >= MIN_POINTS) {
    finishFreeShape();
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

// Handle key press for mode switching
export const onFreeShapeKeyDown = (event: KeyboardEvent) => {
  if (currentTool !== "freeshape" || !freeShapeDrawingState.isDrawing) return;

  switch (event.key.toLowerCase()) {
    case "c":
      // Toggle curved mode
      toggleFreeShapeCurved();
      event.preventDefault();
      break;
    case "escape":
      onFreeShapeEscape();
      event.preventDefault();
      break;
  }
};
