// Create: shapes/free-shape.ts
import * as PIXI from "pixi.js";
import { FreeShape, FreeShapePoint } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

/**
 * Create a smooth control point automatically based on adjacent points
 */
export const calculateAutoControlPoints = (
  points: FreeShapePoint[],
  index: number,
  tension: number = 0.3
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } => {
  const current = points[index];
  const prev = points[index - 1] || points[points.length - 1];
  const next = points[index + 1] || points[0];

  if (!prev || !next) {
    return {
      cp1x: current.x,
      cp1y: current.y,
      cp2x: current.x,
      cp2y: current.y,
    };
  }

  // Calculate tangent vector
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return {
      cp1x: current.x,
      cp1y: current.y,
      cp2x: current.x,
      cp2y: current.y,
    };
  }

  // Normalize and scale by tension
  const scale =
    (tension *
      Math.min(
        Math.sqrt((current.x - prev.x) ** 2 + (current.y - prev.y) ** 2),
        Math.sqrt((next.x - current.x) ** 2 + (next.y - current.y) ** 2)
      )) /
    3;

  const unitX = dx / length;
  const unitY = dy / length;

  return {
    cp1x: current.x - unitX * scale,
    cp1y: current.y - unitY * scale,
    cp2x: current.x + unitX * scale,
    cp2y: current.y + unitY * scale,
  };
};

/**
 * Create a new FreeShape
 */
export const createFreeShape = (
  points: Array<{ x: number; y: number }>,
  closed: boolean = false,
  addShapeEvents: boolean = true,
  id: string = generateShapeId()
): FreeShape => {
  const graphics = new PIXI.Graphics();

  // Convert simple points to FreeShapePoints with auto-generated control points
  const freeShapePoints: FreeShapePoint[] = points.map((point, index) => {
    const freePoint: FreeShapePoint = {
      x: point.x,
      y: point.y,
      type: index === 0 ? "move" : "curve",
    };

    // Add auto-generated control points for curve segments
    if (index > 0 && points.length > 2) {
      const autoCP = calculateAutoControlPoints(
        points.map((p) => ({ ...p, type: "curve" as const })),
        index,
        0.3
      );
      freePoint.cp1x = autoCP.cp1x;
      freePoint.cp1y = autoCP.cp1y;
      freePoint.cp2x = autoCP.cp2x;
      freePoint.cp2y = autoCP.cp2y;
    }

    return freePoint;
  });

  const shape: FreeShape = {
    id,
    name: `Free Shape`,
    type: "freeshape",
    graphics,
    x: 0,
    y: 0,
    points: freeShapePoints,
    closed,
    color: 0x4a90e2,
    strokeColor: 0x2c5aa0,
    strokeWidth: 2,
    smoothness: 0.5,
    selected: false,
    visible: true,
    interactive: true,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };

  updateFreeShapeGraphics(shape);

  const eventManager = getEventManager();
  if (eventManager && addShapeEvents) {
    eventManager.addShapeEvents(shape);
  }

  return shape;
};

/**
 * Update the graphics of a FreeShape
 */
export const updateFreeShapeGraphics = (shape: FreeShape): void => {
  if (!(shape.graphics instanceof PIXI.Graphics)) {
    return;
  }

  const graphics = shape.graphics;
  graphics.clear();

  if (shape.points.length < 2) {
    return;
  }

  // Start the path
  const firstPoint = shape.points[0];
  graphics.moveTo(firstPoint.x, firstPoint.y);

  // Draw curves between points
  for (let i = 1; i < shape.points.length; i++) {
    const point = shape.points[i];
    const prevPoint = shape.points[i - 1];

    if (
      point.type === "curve" &&
      point.cp1x !== undefined &&
      point.cp2x !== undefined
    ) {
      // Use bezier curve with control points
      graphics.bezierCurveTo(
        prevPoint.cp2x || prevPoint.x,
        prevPoint.cp2y || prevPoint.y,
        point.cp1x,
        point.cp1y,
        point.x,
        point.y,
        shape.smoothness
      );
    } else {
      // Fallback to line
      graphics.lineTo(point.x, point.y);
    }
  }

  // Close the shape if needed
  if (shape.closed && shape.points.length > 2) {
    const lastPoint = shape.points[shape.points.length - 1];
    const firstPoint = shape.points[0];

    if (lastPoint.cp2x !== undefined && firstPoint.cp1x !== undefined) {
      graphics.bezierCurveTo(
        lastPoint.cp2x,
        lastPoint.cp2y!,
        firstPoint.cp1x,
        firstPoint.cp1y!,
        firstPoint.x,
        firstPoint.y,
        shape.smoothness
      );
    } else {
      graphics.closePath();
    }
  }

  // Apply fill and stroke
  graphics.fill(shape.color).stroke({
    width: shape.strokeWidth,
    color: shape.strokeColor,
  });

  // Update transforms
  graphics.position.set(shape.x, shape.y);
  graphics.rotation = shape.rotation || 0;
  graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
  graphics.alpha = shape.opacity || 1;
  graphics.visible = shape.visible;
  graphics.interactive = shape.interactive;
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
};

/**
 * Add a new point to the FreeShape
 */
export const addPointToFreeShape = (
  shape: FreeShape,
  x: number,
  y: number,
  type: "curve" | "line" = "curve"
): void => {
  const newPoint: FreeShapePoint = {
    x,
    y,
    type,
  };

  // Auto-generate control points for smooth curves
  if (type === "curve" && shape.points.length > 0) {
    const prevPoint = shape.points[shape.points.length - 1];
    const autoCP = calculateAutoControlPoints(
      [...shape.points, newPoint],
      shape.points.length,
      0.3
    );

    newPoint.cp1x = autoCP.cp1x;
    newPoint.cp1y = autoCP.cp1y;
    newPoint.cp2x = autoCP.cp2x;
    newPoint.cp2y = autoCP.cp2y;

    // Update previous point's control points
    if (prevPoint.type === "curve") {
      const prevAutoCP = calculateAutoControlPoints(
        [...shape.points, newPoint],
        shape.points.length - 1,
        0.3
      );
      prevPoint.cp2x = prevAutoCP.cp2x;
      prevPoint.cp2y = prevAutoCP.cp2y;
    }
  }

  shape.points.push(newPoint);
  updateFreeShapeGraphics(shape);
};

/**
 * Update a control point of a FreeShape
 */
export const updateFreeShapeControlPoint = (
  shape: FreeShape,
  pointIndex: number,
  controlPointType: "cp1" | "cp2",
  x: number,
  y: number
): void => {
  const point = shape.points[pointIndex];
  if (!point) return;

  if (controlPointType === "cp1") {
    point.cp1x = x;
    point.cp1y = y;
  } else {
    point.cp2x = x;
    point.cp2y = y;
  }

  updateFreeShapeGraphics(shape);
};

/**
 * Update a main point of a FreeShape
 */
export const updateFreeShapePoint = (
  shape: FreeShape,
  pointIndex: number,
  x: number,
  y: number,
  updateControlPoints: boolean = true
): void => {
  const point = shape.points[pointIndex];
  if (!point) return;

  const deltaX = x - point.x;
  const deltaY = y - point.y;

  point.x = x;
  point.y = y;

  // Optionally move control points with the main point
  if (updateControlPoints && point.type === "curve") {
    if (point.cp1x !== undefined) {
      point.cp1x += deltaX;
      point.cp1y! += deltaY;
    }
    if (point.cp2x !== undefined) {
      point.cp2x += deltaX;
      point.cp2y! += deltaY;
    }
  }

  updateFreeShapeGraphics(shape);
};

/**
 * Remove a point from the FreeShape
 */
export const removeFreeShapePoint = (
  shape: FreeShape,
  pointIndex: number
): void => {
  if (pointIndex < 0 || pointIndex >= shape.points.length) return;
  if (shape.points.length <= 2) return; // Keep minimum 2 points

  shape.points.splice(pointIndex, 1);

  // Recalculate control points for adjacent points
  if (shape.points.length > 2) {
    const prevIndex = Math.max(0, pointIndex - 1);
    const nextIndex = Math.min(shape.points.length - 1, pointIndex);

    [prevIndex, nextIndex].forEach((index) => {
      const point = shape.points[index];
      if (point && point.type === "curve") {
        const autoCP = calculateAutoControlPoints(shape.points, index, 0.3);
        point.cp1x = autoCP.cp1x;
        point.cp1y = autoCP.cp1y;
        point.cp2x = autoCP.cp2x;
        point.cp2y = autoCP.cp2y;
      }
    });
  }

  updateFreeShapeGraphics(shape);
};

/**
 * Convert the FreeShape to a smooth curve by auto-generating all control points
 */
export const smoothenFreeShape = (
  shape: FreeShape,
  tension: number = 0.3
): void => {
  shape.points.forEach((point, index) => {
    if (point.type === "curve") {
      const autoCP = calculateAutoControlPoints(shape.points, index, tension);
      point.cp1x = autoCP.cp1x;
      point.cp1y = autoCP.cp1y;
      point.cp2x = autoCP.cp2x;
      point.cp2y = autoCP.cp2y;
    }
  });

  updateFreeShapeGraphics(shape);
};

/**
 * Get the bounding box of the FreeShape
 */
export const getFreeShapeBounds = (
  shape: FreeShape
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} => {
  if (shape.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = shape.points[0].x;
  let minY = shape.points[0].y;
  let maxX = shape.points[0].x;
  let maxY = shape.points[0].y;

  // Check all main points and control points
  shape.points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);

    if (point.cp1x !== undefined) {
      minX = Math.min(minX, point.cp1x);
      minY = Math.min(minY, point.cp1y!);
      maxX = Math.max(maxX, point.cp1x);
      maxY = Math.max(maxY, point.cp1y!);
    }

    if (point.cp2x !== undefined) {
      minX = Math.min(minX, point.cp2x);
      minY = Math.min(minY, point.cp2y!);
      maxX = Math.max(maxX, point.cp2x);
      maxY = Math.max(maxY, point.cp2y!);
    }
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};
