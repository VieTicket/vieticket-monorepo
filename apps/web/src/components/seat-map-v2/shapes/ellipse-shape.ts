import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { generateShapeId } from "../utils";
import { onShapeClick } from "../events/select-events";
import { getEventManager } from "../events/event-manager";

export const createEllipse = (
  x: number,
  y: number,
  radiusX: number,
  radiusY: number
): PixiShape => {
  const graphics = new PIXI.Graphics();

  graphics.stroke({
    width: 2,
    color: 0x047857,
  });

  const radialGradient = new PIXI.FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: 0xffff00 },
      { offset: 1, color: 0x00ff00 },
    ],
    textureSpace: "local",
  });

  // Draw ellipse centered at origin
  graphics.ellipse(0, 0, radiusX, radiusY).fill(radialGradient);

  // Position the graphics
  graphics.position.set(x, y);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "ellipse",
    graphics,
    x,
    y,
    radiusX,
    radiusY,
    color: 0x10b981,
    selected: false,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };

  const eventManager = getEventManager();
  if (eventManager) {
    eventManager.addShapeEvents(shape);
  }
  return shape;
};
