// Create freeshape-shape.ts
import * as PIXI from "pixi.js";
import { FreeShape, FreeShapePoint } from "../types";
import { generateShapeId } from "./index";
import { getEventManager } from "../events/event-manager";

export const createFreeShape = (
  points: Array<{ x: number; y: number }>,
  curved: boolean = false
): FreeShape => {
  const graphics = new PIXI.Graphics();

  // Convert points to FreeShapePoints
  const freeShapePoints: FreeShapePoint[] = points.map((point, index) => ({
    x: point.x,
    y: point.y,
    isCurved: curved && index > 0, // First point can't have curve
    // Initialize control points for curved edges
    controlPoint1:
      curved && index > 0
        ? {
            x: point.x - 30,
            y: point.y - 15,
          }
        : undefined,
    controlPoint2:
      curved && index > 0
        ? {
            x: point.x - 15,
            y: point.y + 15,
          }
        : undefined,
  }));

  const shape: FreeShape = {
    id: generateShapeId(),
    name: `FreeShape ${Date.now()}`,
    type: "freeshape",
    graphics,
    x: 0, // FreeShape uses absolute coordinates
    y: 0,
    points: freeShapePoints,
    color: 0x3b82f6, // Blue color to distinguish from polygon
    strokeColor: 0x1e40af,
    strokeWidth: 2,
    selected: false,
    visible: true,
    locked: false,
    rotation: 0, // Always 0 - not used
    scaleX: 1, // Always 1 - not used
    scaleY: 1, // Always 1 - not used
    opacity: 1,
    editMode: false,
    controlPointGraphics: [],
  };

  updateFreeShapeGraphics(shape);

  const eventManager = getEventManager();
  if (eventManager) {
    eventManager.addShapeEvents(shape);
  }

  return shape;
};

export const updateFreeShapeGraphics = (shape: FreeShape) => {
  if (!(shape.graphics instanceof PIXI.Graphics)) {
    return;
  }

  const graphics = shape.graphics;
  graphics.clear();

  if (shape.points.length < 2) return;

  // Start drawing the path
  const firstPoint = shape.points[0];
  graphics.moveTo(firstPoint.x, firstPoint.y);

  // Draw each segment
  for (let i = 1; i < shape.points.length; i++) {
    const point = shape.points[i];

    if (point.isCurved && point.controlPoint1 && point.controlPoint2) {
      // Draw bezier curve
      graphics.bezierCurveTo(
        point.controlPoint1.x,
        point.controlPoint1.y,
        point.controlPoint2.x,
        point.controlPoint2.y,
        point.x,
        point.y
      );
    } else {
      // Draw straight line
      graphics.lineTo(point.x, point.y);
    }
  }

  // Close the shape if it has enough points
  if (shape.points.length > 2) {
    const lastPoint = shape.points[shape.points.length - 1];
    const firstPoint = shape.points[0];

    if (
      lastPoint.isCurved &&
      lastPoint.controlPoint1 &&
      lastPoint.controlPoint2
    ) {
      graphics.bezierCurveTo(
        lastPoint.controlPoint1.x,
        lastPoint.controlPoint1.y,
        lastPoint.controlPoint2.x,
        lastPoint.controlPoint2.y,
        firstPoint.x,
        firstPoint.y
      );
    } else {
      graphics.lineTo(firstPoint.x, firstPoint.y);
    }
  }

  // Apply styling
  graphics.fill(shape.color).stroke({
    width: shape.selected ? 3 : shape.strokeWidth,
    color: shape.selected ? 0xfbbf24 : shape.strokeColor,
  });

  // Position the graphics
  graphics.position.set(shape.x, shape.y);
  graphics.alpha = shape.opacity;
  graphics.visible = shape.visible;

  // Draw control points if in edit mode
  if (shape.editMode) {
    drawControlPoints(shape);
  }
};

const drawControlPoints = (shape: FreeShape) => {
  // Clear existing control point graphics
  shape.controlPointGraphics.forEach((g) => g.destroy());
  shape.controlPointGraphics = [];

  shape.points.forEach((point, index) => {
    if (point.isCurved && point.controlPoint1 && point.controlPoint2) {
      // Draw control point handles
      const cp1Graphics = new PIXI.Graphics();
      cp1Graphics
        .circle(point.controlPoint1.x, point.controlPoint1.y, 4)
        .fill(0xff0000)
        .stroke({ width: 1, color: 0x000000 });
      cp1Graphics.eventMode = "static";
      cp1Graphics.cursor = "move";

      const cp2Graphics = new PIXI.Graphics();
      cp2Graphics
        .circle(point.controlPoint2.x, point.controlPoint2.y, 4)
        .fill(0x00ff00)
        .stroke({ width: 1, color: 0x000000 });
      cp2Graphics.eventMode = "static";
      cp2Graphics.cursor = "move";

      // Draw connection lines
      const connectionGraphics = new PIXI.Graphics();
      connectionGraphics
        .moveTo(point.x, point.y)
        .lineTo(point.controlPoint1.x, point.controlPoint1.y)
        .moveTo(point.x, point.y)
        .lineTo(point.controlPoint2.x, point.controlPoint2.y)
        .stroke({ width: 1, color: 0xcccccc, alpha: 0.7 });

      shape.graphics.parent?.addChild(connectionGraphics);
      shape.graphics.parent?.addChild(cp1Graphics);
      shape.graphics.parent?.addChild(cp2Graphics);

      shape.controlPointGraphics.push(
        connectionGraphics,
        cp1Graphics,
        cp2Graphics
      );
    }

    // Draw main point handle
    const pointGraphics = new PIXI.Graphics();
    pointGraphics
      .circle(point.x, point.y, 5)
      .fill(0x0000ff)
      .stroke({ width: 2, color: 0xffffff });
    pointGraphics.eventMode = "static";
    pointGraphics.cursor = "move";

    shape.graphics.parent?.addChild(pointGraphics);
    shape.controlPointGraphics.push(pointGraphics);
  });
};

// Utility functions for transformations without scale/rotate
export const mirrorFreeShapeHorizontally = (
  shape: FreeShape,
  centerX?: number
) => {
  const center =
    centerX ??
    shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;

  shape.points.forEach((point) => {
    point.x = 2 * center - point.x;

    if (point.controlPoint1) {
      point.controlPoint1.x = 2 * center - point.controlPoint1.x;
    }
    if (point.controlPoint2) {
      point.controlPoint2.x = 2 * center - point.controlPoint2.x;
    }
  });

  updateFreeShapeGraphics(shape);
};

export const mirrorFreeShapeVertically = (
  shape: FreeShape,
  centerY?: number
) => {
  const center =
    centerY ??
    shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

  shape.points.forEach((point) => {
    point.y = 2 * center - point.y;

    if (point.controlPoint1) {
      point.controlPoint1.y = 2 * center - point.controlPoint1.y;
    }
    if (point.controlPoint2) {
      point.controlPoint2.y = 2 * center - point.controlPoint2.y;
    }
  });

  updateFreeShapeGraphics(shape);
};

export const toggleFreeShapeEditMode = (shape: FreeShape) => {
  shape.editMode = !shape.editMode;
  updateFreeShapeGraphics(shape);
};
