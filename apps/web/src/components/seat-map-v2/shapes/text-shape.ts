import * as PIXI from "pixi.js";
import { TextShape } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

export const createText = (x: number, y: number, text: string): TextShape => {
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

  const shape: TextShape = {
    id: generateShapeId(),
    name: `Text ${Date.now()}`,
    type: "text",
    graphics: textGraphics,
    x,
    y,
    text,
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: "normal",
    textAlign: "center",
    color: 0x374151,
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
