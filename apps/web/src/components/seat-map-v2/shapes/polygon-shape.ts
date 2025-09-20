import * as PIXI from "pixi.js";
import { PolygonShape } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

/**
 * Calculate polygon pivot based on visual bounds (min/max of points)
 */
export const calculatePolygonPivot = (
  points: Array<{ x: number; y: number }>
): { x: number; y: number } => {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
};
export const createPolygon = (
  points: Array<{ x: number; y: number }>,
  cornerRadius: number = 10
): PolygonShape => {
  const graphics = new PIXI.Graphics();

  // ✅ Calculate center point using visual bounds (not arithmetic center)
  const pivot = calculatePolygonPivot(points);

  // Create relative points from the visual center for drawing
  const relativePoints = points.map((point) => ({
    x: point.x - pivot.x,
    y: point.y - pivot.y,
    radius: cornerRadius / 2, // ✅ Initialize each point with individual radius
  }));

  graphics
    .roundShape(relativePoints, cornerRadius)
    .fill(0x9b59b6)
    .stroke({ width: 2, color: 0x8e44ad });

  graphics.position.set(pivot.x, pivot.y);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
  graphics.pivot.set(0, 0);

  const shape: PolygonShape = {
    id: generateShapeId(),
    name: `Polygon`,
    type: "polygon",
    graphics,
    x: graphics.x,
    y: graphics.y,
    points: relativePoints, // Points with individual radii
    cornerRadius,
    color: 0x9b59b6,
    strokeColor: 0x8e44ad,
    strokeWidth: 2,
    selected: false,
    visible: true,
    locked: false,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };

  const eventManager = getEventManager();
  if (eventManager) {
    eventManager.addShapeEvents(shape);
  }
  return shape;
};

export const updatePolygonGraphics = (shape: PolygonShape) => {
  if (!(shape.graphics instanceof PIXI.Graphics)) {
    return;
  }

  const graphics = shape.graphics;
  graphics.clear();

  // ✅ Use individual point radii for drawing
  const relativePoints = shape.points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: point.radius !== undefined ? point.radius : shape.cornerRadius / 2,
  }));

  // ✅ Draw polygon with individual corner radii
  if (relativePoints.length > 0) {
    // Use PIXI's roundShape with individual radii
    graphics
      .roundShape(relativePoints, 0) // Pass 0 as default, use individual radii
      .fill(shape.color)
      .stroke({
        width: shape.strokeWidth,
        color: shape.strokeColor,
      });
  }

  // Update position and transforms
  graphics.x = shape.x;
  graphics.y = shape.y;
  graphics.rotation = shape.rotation || 0;
  graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
  graphics.alpha = shape.opacity || 1;
};
