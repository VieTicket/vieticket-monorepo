import * as PIXI from "pixi.js";
import {
  stage,
  currentTool,
  polygonDrawingState,
  setPolygonDrawingState,
  shapes,
} from "../variables";
import { addShapeToStage } from "../shapes/index";
import { createPolygon } from "../shapes/polygon-shape";
import {
  createPolygonPreview,
  updatePolygonPreview,
  clearPolygonPreview,
} from "../preview";
import { getGuideLines } from "../guide-lines";

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

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    snapPoint = guideLines.snapToGrid(localPoint.x, localPoint.y);

    // Get snap points (including existing polygon points and other shapes)
    const snapPoints = getPolygonSnapPoints();
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

    // ✅ Show snap guides during polygon drawing
    guideLines.showSnapGuides(snapPoint.x, snapPoint.y, snapPoints);
  }

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

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    snapPoint = guideLines.snapToGrid(localPoint.x, localPoint.y);

    // Get snap points (including existing polygon points and other shapes)
    const snapPoints = getPolygonSnapPoints();
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

    // ✅ Show snap guides during polygon drawing
    guideLines.showSnapGuides(snapPoint.x, snapPoint.y, snapPoints);
  }
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
  const guideLines = getGuideLines();
  if (guideLines) {
    guideLines.clearAll();
  }

  if (polygonDrawingState.points.length >= MIN_POINTS) {
    const polygon = createPolygon(polygonDrawingState.points, 10);
    if (polygon) {
      addShapeToStage(polygon);
    }
  }

  resetPolygonDrawing();
};

export const resetPolygonDrawing = () => {
  const guideLines = getGuideLines();
  if (guideLines) {
    guideLines.clearAll();
  }

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

const getPolygonSnapPoints = (): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];

  // Add existing shape snap points
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
    } else if (shape.type === "polygon" && shape.points) {
      // Add existing polygon points
      shape.points.forEach((point) => {
        snapPoints.push({ x: shape.x + point.x, y: shape.y + point.y });
      });
    }
  });

  // Add current polygon points (excluding the last preview point)
  if (polygonDrawingState.isDrawing) {
    polygonDrawingState.points.forEach((point) => {
      snapPoints.push({ x: point.x, y: point.y });
    });
  }

  return snapPoints;
};
