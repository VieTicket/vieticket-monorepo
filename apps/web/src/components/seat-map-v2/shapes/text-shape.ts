import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { generateShapeId } from "../utils";
import { onShapeClick } from "../events/select-events";
import { getEventManager } from "../events/event-manager";

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

  // Set anchor to center for consistent positioning
  textGraphics.anchor.set(0.5, 0.5);
  textGraphics.position.set(x, y);
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
    // Initialize transformation properties
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
