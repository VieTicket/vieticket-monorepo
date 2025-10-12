import * as PIXI from "pixi.js";
import { PolygonShape } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

export const createPolygon = (
  points: Array<{ x: number; y: number }>,
  cornerRadius: number = 10
): PolygonShape => {
  const graphics = new PIXI.Graphics();

  // Calculate center point for positioning
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Create relative points from center for drawing
  const relativePoints = points.map((point) => ({
    x: point.x - centerX,
    y: point.y - centerY,
    radius: cornerRadius / 2,
  }));

  graphics
    .roundShape(relativePoints, cornerRadius)
    .fill(0x9b59b6)
    .stroke({ width: 2, color: 0x8e44ad });

  // Position the graphics at the center
  graphics.x = centerX;
  graphics.y = centerY;
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const shape: PolygonShape = {
    id: generateShapeId(),
    name: `Polygon`,
    type: "polygon",
    graphics,
    x: centerX,
    y: centerY,
    points: relativePoints,
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

  // Calculate center point
  const centerX =
    shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
  const centerY =
    shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

  // Create relative points from center
  const relativePoints = shape.points.map((point) => ({
    x: point.x - centerX,
    y: point.y - centerY,
    radius: shape.cornerRadius / 2,
  }));

  graphics
    .roundShape(relativePoints, shape.cornerRadius)
    .fill(shape.color)
    .stroke({
      width: shape.selected ? 3 : shape.strokeWidth,
      color: shape.selected ? 0xfbbf24 : shape.strokeColor,
    });

  // Update position to center
  graphics.x = shape.x;
  graphics.y = shape.y;
};
