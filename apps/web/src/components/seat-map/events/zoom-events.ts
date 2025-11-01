import * as PIXI from "pixi.js";
import { stage, zoom, pan, setZoom, setPan, pixiApp } from "../variables";
import { updateStageTransform } from "../utils/stageTransform";

export const onStageWheel = (event: PIXI.FederatedWheelEvent) => {
  event.stopPropagation();

  if (!stage || !pixiApp) return;

  const scaleFactor = event.deltaY > 0 ? 0.95 : 1.05;
  const newZoom = Math.max(0.1, Math.min(5, zoom * scaleFactor));

  // Get mouse position relative to the stage
  const globalPoint = event.global;
  const localPoint = stage.toLocal(globalPoint);

  // Calculate the zoom center point
  const zoomCenter = {
    x: localPoint.x,
    y: localPoint.y,
  };

  // Calculate new pan position to zoom towards mouse
  const newPan = {
    x: pan.x - zoomCenter.x * (newZoom - zoom),
    y: pan.y - zoomCenter.y * (newZoom - zoom),
  };

  setZoom(newZoom);
  setPan(newPan);
  updateStageTransform();
};

export const handleZoomIn = () => {
  const newZoom = Math.min(5, zoom * 1.2);
  setZoom(newZoom);
  updateStageTransform();
};

export const handleZoomOut = () => {
  const newZoom = Math.max(0.1, zoom / 1.2);
  setZoom(newZoom);
  updateStageTransform();
};

export const handleResetView = () => {
  setZoom(1);
  setPan({ x: 0, y: 0 });
  updateStageTransform();
};
