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
import { createPolygonEdges, getGuideLines } from "../guide-lines";

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

const isAlignedWithFirstPoint = (
  currentPoint: { x: number; y: number },
  firstPoint: { x: number; y: number },
  threshold: number = 5
): boolean => {
  const isVerticallyAligned =
    Math.abs(currentPoint.x - firstPoint.x) <= threshold;

  const isHorizontallyAligned =
    Math.abs(currentPoint.y - firstPoint.y) <= threshold;

  return isVerticallyAligned || isHorizontallyAligned;
};

const shouldClosePolygon = (
  currentPoint: { x: number; y: number },
  firstPoint: { x: number; y: number }
): boolean => {
  return (
    isNearFirstPoint(currentPoint, firstPoint) ||
    isAlignedWithFirstPoint(currentPoint, firstPoint)
  );
};

export const onPolygonStart = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "polygon") return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    const snapPoints = getPolygonSnapPoints();
    const polygonEdges = getExistingPolygonEdges();

    snapPoint = applyEnhancedPolygonSnapping(
      localPoint.x,
      localPoint.y,
      snapPoints,
      polygonEdges,
      guideLines
    );
  }

  if (!polygonDrawingState.isDrawing) {
    const newState = {
      isDrawing: true,
      points: [snapPoint],
      previewPoints: [snapPoint],
    };
    setPolygonDrawingState(newState);
    createPolygonPreview();

    if (guideLines && stage) {
      const bounds = stage.getBounds();
      guideLines.createGrid(bounds.width * 2, bounds.height * 2);
    }
  } else {
    const firstPoint = polygonDrawingState.points[0];

    if (
      polygonDrawingState.points.length >= MIN_POINTS &&
      shouldClosePolygon(snapPoint, firstPoint)
    ) {
      if (isAlignedWithFirstPoint(snapPoint, firstPoint)) {
        const alignedPoint = { ...snapPoint };

        if (Math.abs(snapPoint.x - firstPoint.x) <= 5) {
          alignedPoint.x = firstPoint.x;
        }

        if (Math.abs(snapPoint.y - firstPoint.y) <= 5) {
          alignedPoint.y = firstPoint.y;
        }

        snapPoint = alignedPoint;
      }

      finishPolygon();
    } else {
      const newPoints = [...polygonDrawingState.points, snapPoint];
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
  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const guideLines = getGuideLines();
  let snapPoint = { x: localPoint.x, y: localPoint.y };

  if (guideLines) {
    const snapPoints = getPolygonSnapPoints();
    const polygonEdges = getExistingPolygonEdges();

    snapPoint = applyEnhancedPolygonSnapping(
      localPoint.x,
      localPoint.y,
      snapPoints,
      polygonEdges,
      guideLines
    );

    guideLines.showSnapGuides(snapPoint.x, snapPoint.y, snapPoints);
    guideLines.showPolygonEdgeGuides(snapPoint.x, snapPoint.y, polygonEdges);
  }
  if (currentTool !== "polygon" || !polygonDrawingState.isDrawing) return;

  const previewPoints = [...polygonDrawingState.points, snapPoint];

  const newState = {
    ...polygonDrawingState,
    previewPoints,
  };
  setPolygonDrawingState(newState);

  updatePolygonPreview(
    previewPoints,
    polygonDrawingState.points.length >= MIN_POINTS &&
      shouldClosePolygon(snapPoint, polygonDrawingState.points[0])
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

export const onPolygonEscape = () => {
  if (currentTool === "polygon" && polygonDrawingState.isDrawing) {
    cancelPolygonDrawing();
  }
};

const applyEnhancedPolygonSnapping = (
  x: number,
  y: number,
  snapPoints: Array<{ x: number; y: number }>,
  polygonEdges: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    slope: number | null;
    intercept: number | null;
  }>,
  guideLines: any
): { x: number; y: number } => {
  const GUIDE_LINE_SNAP_THRESHOLD = 5;

  let finalX = x;
  let finalY = y;

  const gridSnap = guideLines.snapToGrid(x, y);

  const objectSnap = guideLines.snapToPoints(x, y, snapPoints);

  const edgeSnap = guideLines.snapToPolygonEdges(x, y, polygonEdges);

  let alignedToVerticalGuide = false;
  let alignedToHorizontalGuide = false;

  for (const point of snapPoints) {
    const distanceToVerticalLine = Math.abs(x - point.x);
    if (distanceToVerticalLine <= GUIDE_LINE_SNAP_THRESHOLD) {
      finalX = point.x;
      alignedToVerticalGuide = true;
      break;
    }
  }

  for (const point of snapPoints) {
    const distanceToHorizontalLine = Math.abs(y - point.y);
    if (distanceToHorizontalLine <= GUIDE_LINE_SNAP_THRESHOLD) {
      finalY = point.y;
      alignedToHorizontalGuide = true;
      break;
    }
  }

  const edgeDistance = Math.sqrt(
    Math.pow(edgeSnap.x - x, 2) + Math.pow(edgeSnap.y - y, 2)
  );
  if (edgeDistance < GUIDE_LINE_SNAP_THRESHOLD) {
    return edgeSnap;
  }

  if (!alignedToVerticalGuide) {
    const gridDistanceX = Math.abs(gridSnap.x - x);
    const objectDistanceX = Math.abs(objectSnap.x - x);
    finalX = objectDistanceX < gridDistanceX ? objectSnap.x : gridSnap.x;
  }

  if (!alignedToHorizontalGuide) {
    const gridDistanceY = Math.abs(gridSnap.y - y);
    const objectDistanceY = Math.abs(objectSnap.y - y);
    finalY = objectDistanceY < gridDistanceY ? objectSnap.y : gridSnap.y;
  }

  return { x: finalX, y: finalY };
};

const getExistingPolygonEdges = (): Array<{
  start: { x: number; y: number };
  end: { x: number; y: number };
  slope: number | null;
  intercept: number | null;
}> => {
  const allEdges: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    slope: number | null;
    intercept: number | null;
  }> = [];

  shapes.forEach((shape) => {
    if (shape.type === "polygon" && shape.points && shape.points.length >= 3) {
      const worldPoints = shape.points.map((point) => ({
        x: shape.x + point.x,
        y: shape.y + point.y,
      }));

      const edges = createPolygonEdges(worldPoints);
      allEdges.push(...edges);
    }
  });

  if (polygonDrawingState.isDrawing && polygonDrawingState.points.length >= 2) {
    const currentEdges = createPolygonEdges(polygonDrawingState.points);
    allEdges.push(...currentEdges);
  }

  return allEdges;
};

const getPolygonSnapPoints = (): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];

  shapes.forEach((shape) => {
    if (shape.type === "container") return;

    snapPoints.push({ x: shape.x, y: shape.y });

    if (shape.type === "rectangle") {
      const halfWidth = shape.width / 2;
      const halfHeight = shape.height / 2;

      snapPoints.push(
        { x: shape.x - halfWidth, y: shape.y - halfHeight },
        { x: shape.x + halfWidth, y: shape.y - halfHeight },
        { x: shape.x - halfWidth, y: shape.y + halfHeight },
        { x: shape.x + halfWidth, y: shape.y + halfHeight },
        { x: shape.x, y: shape.y - halfHeight },
        { x: shape.x, y: shape.y + halfHeight },
        { x: shape.x - halfWidth, y: shape.y },
        { x: shape.x + halfWidth, y: shape.y }
      );
    } else if (shape.type === "ellipse") {
      snapPoints.push(
        { x: shape.x - shape.radiusX, y: shape.y },
        { x: shape.x + shape.radiusX, y: shape.y },
        { x: shape.x, y: shape.y - shape.radiusY },
        { x: shape.x, y: shape.y + shape.radiusY }
      );
    } else if (shape.type === "polygon" && shape.points) {
      shape.points.forEach((point) => {
        snapPoints.push({ x: shape.x + point.x, y: shape.y + point.y });
      });
    }
  });

  if (polygonDrawingState.isDrawing) {
    polygonDrawingState.points.forEach((point) => {
      snapPoints.push({ x: point.x, y: point.y });
    });
  }

  return snapPoints;
};
