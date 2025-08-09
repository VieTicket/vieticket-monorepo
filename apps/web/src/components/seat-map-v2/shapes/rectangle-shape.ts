import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { generateShapeId } from "../utils";
import { onShapeClick } from "../events/select-events";

export const createRectangle = (
  x: number,
  y: number,
  width: number,
  height: number
): PixiShape => {
  const graphics = new PIXI.Graphics();
  graphics
    .roundRect(x, y, width, height, 10)
    .fill(0x3b82f6)
    .stroke({ width: 2, color: 0x1e40af });
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "rectangle",
    graphics,
    x,
    y,
    width,
    height,
    color: 0x3b82f6,
    selected: false,
  };

  graphics.on("pointerdown", (event) => onShapeClick(event, shape));
  return shape;
};
