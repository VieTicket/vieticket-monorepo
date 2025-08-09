import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { generateShapeId } from "../utils";
import { onShapeClick } from "../events/select-events";

export const createPolygon = (
  points: Array<{ x: number; y: number }>,
  cornerRadius: number = 10
): PixiShape => {
  const graphics = new PIXI.Graphics();

  // Convert points to RoundedPoint format for roundShape
  const roundedPoints = points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: cornerRadius / 2, // Individual corner radius
  }));

  graphics
    .roundShape(roundedPoints, cornerRadius)
    .fill(0x9b59b6)
    .stroke({ width: 2, color: 0x8e44ad });

  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  // Calculate center point for positioning
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "polygon",
    graphics,
    x: centerX,
    y: centerY,
    points,
    cornerRadius,
    color: 0x9b59b6,
    selected: false,
  };

  graphics.on("pointerdown", (event: PIXI.FederatedPointerEvent) =>
    onShapeClick(event, shape)
  );
  return shape;
};

export const updatePolygonGraphics = (shape: PixiShape) => {
  if (
    shape.type !== "polygon" ||
    !shape.points ||
    !(shape.graphics instanceof PIXI.Graphics)
  ) {
    return;
  }

  const graphics = shape.graphics;
  graphics.clear();

  // Convert points to RoundedPoint format
  const roundedPoints = shape.points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: (shape.cornerRadius || 10) / 2,
  }));

  graphics
    .roundShape(roundedPoints, shape.cornerRadius || 10)
    .fill(shape.color)
    .stroke({
      width: shape.selected ? 3 : 2,
      color: shape.selected ? 0xfbbf24 : 0x8e44ad,
    });
};
