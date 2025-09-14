import { v4 as uuidv4 } from "uuid";
import { stage, zoom, pan, pixiApp } from "../variables";
import * as PIXI from "pixi.js";

export const generateShapeId = () => uuidv4();

export const updateStageTransform = () => {
  if (stage && pixiApp) {
    stage.scale.set(zoom);
    stage.position.set(pan.x, pan.y);

    // Update the hit area to account for the transform
    updateStageHitArea();
  }
};

export const updateStageHitArea = () => {
  if (!stage || !pixiApp) return;

  // Calculate the bounds of the visible area in stage coordinates
  const app = pixiApp;
  const stageScale = stage.scale.x; // Assuming uniform scaling
  const stagePos = stage.position;

  // Calculate the area that should be interactive
  // This represents the screen area in stage coordinate space
  const hitArea = new PIXI.Rectangle(
    -stagePos.x / stageScale,
    -stagePos.y / stageScale,
    app.screen.width / stageScale,
    app.screen.height / stageScale
  );

  stage.hitArea = hitArea;
};
