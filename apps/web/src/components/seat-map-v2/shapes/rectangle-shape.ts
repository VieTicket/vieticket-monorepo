import * as PIXI from "pixi.js";
import { RectangleShape } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

export const createRectangle = (
  x: number,
  y: number,
  width: number,
  height: number
): RectangleShape => {
  const graphics = new PIXI.Graphics();
  graphics
    .roundRect(-width / 2, -height / 2, width, height, 10)
    .fill(0x3b82f6)
    .stroke({ width: 2, color: 0x1e40af });

  // Position the graphics at the center
  graphics.position.set(x + width / 2, y + height / 2);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const shape: RectangleShape = {
    id: generateShapeId(),
    name: `Rectangle`,
    type: "rectangle",
    graphics,
    x: x + width / 2, // Center point
    y: y + height / 2, // Center point
    width,
    height,
    cornerRadius: 10,
    color: 0x3b82f6,
    strokeColor: 0x1e40af,
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
