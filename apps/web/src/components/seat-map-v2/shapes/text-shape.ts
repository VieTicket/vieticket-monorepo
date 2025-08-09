import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { generateShapeId } from "../utils";
import { onShapeClick } from "../events/select-events";

export const createText = (x: number, y: number, text: string): PixiShape => {
  const textGraphics = new PIXI.Text({
    text: text,
    style: {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0x374151,
      align: "center",
    },
  });
  textGraphics.x = x;
  textGraphics.y = y;
  textGraphics.eventMode = "static";
  textGraphics.cursor = "pointer";

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "text",
    graphics: textGraphics,
    x,
    y,
    color: 0x374151,
    selected: false,
  };

  textGraphics.on("pointerdown", (event) => onShapeClick(event, shape));
  return shape;
};
