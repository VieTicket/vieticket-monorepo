import { stage, zoom, pan, pixiApp } from "../variables";

export const updateStageTransform = () => {
  if (!stage || !pixiApp) return;

  // Apply zoom
  stage.scale.set(zoom, zoom);

  // Apply pan with proper infinite canvas positioning
  // Stage is already centered at viewport center, so we apply pan offset
  stage.position.set(
    pixiApp.screen.width / 2 + pan.x * zoom,
    pixiApp.screen.height / 2 + pan.y * zoom
  );
};

// Utility function to convert screen coordinates to world coordinates
export const screenToWorld = (
  screenX: number,
  screenY: number
): { x: number; y: number } => {
  if (!stage || !pixiApp) return { x: screenX, y: screenY };

  // Account for stage position and zoom
  const worldX = (screenX - pixiApp.screen.width / 2 - pan.x * zoom) / zoom;
  const worldY = (screenY - pixiApp.screen.height / 2 - pan.y * zoom) / zoom;

  return { x: worldX, y: worldY };
};

// Utility function to convert world coordinates to screen coordinates
export const worldToScreen = (
  worldX: number,
  worldY: number
): { x: number; y: number } => {
  if (!stage || !pixiApp) return { x: worldX, y: worldY };

  const screenX = worldX * zoom + pixiApp.screen.width / 2 + pan.x * zoom;
  const screenY = worldY * zoom + pixiApp.screen.height / 2 + pan.y * zoom;

  return { x: screenX, y: screenY };
};

// Get the current viewport bounds in world coordinates
export const getViewportBounds = (): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
} => {
  if (!pixiApp) {
    return {
      left: 0,
      right: 800,
      top: 0,
      bottom: 600,
      width: 800,
      height: 600,
    };
  }

  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(
    pixiApp.screen.width,
    pixiApp.screen.height
  );

  return {
    left: topLeft.x,
    right: bottomRight.x,
    top: topLeft.y,
    bottom: bottomRight.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
};
