import * as PIXI from "pixi.js";
import {
  stage,
  currentTool,
  polygonDrawingState,
  setPolygonDrawingState,
} from "../variables";
import { addShapeToStage } from "../shapes/index";
import { createPolygon } from "../shapes/polygon-shape";
import {
  createPolygonPreview,
  updatePolygonPreview,
  clearPolygonPreview,
} from "../preview";

const CLOSE_THRESHOLD = 15;
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

export const onPolygonStart = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "polygon") return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const newPoint = { x: localPoint.x, y: localPoint.y };

  if (!polygonDrawingState.isDrawing) {
    const newState = {
      isDrawing: true,
      points: [newPoint],
      previewPoints: [newPoint],
    };
    setPolygonDrawingState(newState);
    createPolygonPreview();
  } else {
    const firstPoint = polygonDrawingState.points[0];

    if (
      polygonDrawingState.points.length >= MIN_POINTS &&
      isNearFirstPoint(newPoint, firstPoint)
    ) {
      finishPolygon();
    } else {
      const newPoints = [...polygonDrawingState.points, newPoint];
      const newState = {
        ...polygonDrawingState,
        points: newPoints,
        previewPoints: newPoints,
      };
      setPolygonDrawingState(newState);
    }
  }
};

export const onPolygonMove = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "polygon" || !polygonDrawingState.isDrawing) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const currentPoint = { x: localPoint.x, y: localPoint.y };

  const previewPoints = [...polygonDrawingState.points, currentPoint];

  const newState = {
    ...polygonDrawingState,
    previewPoints,
  };
  setPolygonDrawingState(newState);

  updatePolygonPreview(
    previewPoints,
    polygonDrawingState.points.length >= MIN_POINTS &&
      isNearFirstPoint(currentPoint, polygonDrawingState.points[0])
  );
};

export const finishPolygon = () => {
  if (polygonDrawingState.points.length >= MIN_POINTS) {
    const polygon = createPolygon(polygonDrawingState.points, 10);
    if (polygon) {
      addShapeToStage(polygon);
    }
  }

  resetPolygonDrawing();
};

export const resetPolygonDrawing = () => {
  setPolygonDrawingState({
    isDrawing: false,
    points: [],
    previewPoints: [],
  });
  clearPolygonPreview();
};

export const cancelPolygonDrawing = () => {
  resetPolygonDrawing();
};

export const onPolygonRightClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "polygon" || !polygonDrawingState.isDrawing) return;

  event.preventDefault();

  if (polygonDrawingState.points.length >= MIN_POINTS) {
    finishPolygon();
  } else {
    cancelPolygonDrawing();
  }
};

export const onPolygonEscape = () => {
  if (currentTool === "polygon" && polygonDrawingState.isDrawing) {
    cancelPolygonDrawing();
  }
};
