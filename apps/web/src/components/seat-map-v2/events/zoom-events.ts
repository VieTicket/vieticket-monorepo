import * as PIXI from "pixi.js";
import { stage, zoom, pan, setZoom, setPan, pixiApp } from "../variables";
import { updateStageTransform } from "../utils/stageTransform";

export const onStageWheel = (event: PIXI.FederatedWheelEvent) => {
  event.preventDefault();

  if (!stage || !pixiApp) return;

  const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(5, zoom * scaleFactor));

  // Get mouse position in world coordinates
  const globalPoint = event.global;

  // Convert mouse position to world coordinates before zoom
  const mouseWorldX =
    (globalPoint.x - pixiApp.screen.width / 2 - pan.x * zoom) / zoom;
  const mouseWorldY =
    (globalPoint.y - pixiApp.screen.height / 2 - pan.y * zoom) / zoom;

  // Calculate new pan to keep mouse position fixed during zoom
  const newPanX =
    (globalPoint.x - pixiApp.screen.width / 2) / newZoom - mouseWorldX;
  const newPanY =
    (globalPoint.y - pixiApp.screen.height / 2) / newZoom - mouseWorldY;

  setZoom(newZoom);
  setPan({ x: newPanX, y: newPanY });
  updateStageTransform();
};

export const handleZoomIn = () => {
  if (!pixiApp) return;

  const newZoom = Math.min(5, zoom * 1.2);

  // Zoom towards center of viewport
  const centerX = pixiApp.screen.width / 2;
  const centerY = pixiApp.screen.height / 2;

  // Convert center to world coordinates before zoom
  const centerWorldX =
    (centerX - pixiApp.screen.width / 2 - pan.x * zoom) / zoom;
  const centerWorldY =
    (centerY - pixiApp.screen.height / 2 - pan.y * zoom) / zoom;

  // Calculate new pan to keep center fixed
  const newPanX = (centerX - pixiApp.screen.width / 2) / newZoom - centerWorldX;
  const newPanY =
    (centerY - pixiApp.screen.height / 2) / newZoom - centerWorldY;

  setZoom(newZoom);
  setPan({ x: newPanX, y: newPanY });
  updateStageTransform();
};

export const handleZoomOut = () => {
  if (!pixiApp) return;

  const newZoom = Math.max(0.1, zoom / 1.2);

  // Zoom towards center of viewport
  const centerX = pixiApp.screen.width / 2;
  const centerY = pixiApp.screen.height / 2;

  // Convert center to world coordinates before zoom
  const centerWorldX =
    (centerX - pixiApp.screen.width / 2 - pan.x * zoom) / zoom;
  const centerWorldY =
    (centerY - pixiApp.screen.height / 2 - pan.y * zoom) / zoom;

  // Calculate new pan to keep center fixed
  const newPanX = (centerX - pixiApp.screen.width / 2) / newZoom - centerWorldX;
  const newPanY =
    (centerY - pixiApp.screen.height / 2) / newZoom - centerWorldY;

  setZoom(newZoom);
  setPan({ x: newPanX, y: newPanY });
  updateStageTransform();
};

export const handleResetView = () => {
  setZoom(1);
  setPan({ x: 0, y: 0 }); // Reset to world center
  updateStageTransform();
};

// Utility function to zoom to fit specific bounds
export const zoomToFit = (
  bounds: { x: number; y: number; width: number; height: number },
  padding: number = 50
) => {
  if (!pixiApp) return;

  const viewportWidth = pixiApp.screen.width - padding * 2;
  const viewportHeight = pixiApp.screen.height - padding * 2;

  // Calculate zoom to fit bounds
  const scaleX = viewportWidth / bounds.width;
  const scaleY = viewportHeight / bounds.height;
  const newZoom = Math.min(scaleX, scaleY, 5); // Cap at max zoom

  // Calculate pan to center the bounds
  const boundsCenter = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };

  const newPanX = -boundsCenter.x;
  const newPanY = -boundsCenter.y;

  setZoom(Math.max(0.1, newZoom));
  setPan({ x: newPanX, y: newPanY });
  updateStageTransform();
};

// Utility function to zoom to specific world point
export const zoomToPoint = (
  worldX: number,
  worldY: number,
  targetZoom: number = 1
) => {
  const clampedZoom = Math.max(0.1, Math.min(5, targetZoom));

  setZoom(clampedZoom);
  setPan({ x: -worldX, y: -worldY });
  updateStageTransform();
};
