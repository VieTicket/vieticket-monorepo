import * as PIXI from "pixi.js";
import {
  stage,
  currentTool,
  isDrawing,
  dragStart,
  zoom,
  pan,
  setDragStart,
  setIsDrawing,
  setPan,
  pixiApp,
} from "../variables";
import { updateStageTransform } from "../utils/stageTransform";

export const onPanStart = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "pan" || !pixiApp) return;

  // Store the starting mouse position in screen coordinates
  const globalPoint = event.global;
  setDragStart({ x: globalPoint.x, y: globalPoint.y });
  setIsDrawing(true);

  // Change cursor to grabbing
  if (pixiApp.canvas) {
    (pixiApp.canvas as HTMLCanvasElement).style.cursor = "grabbing";
  }
};

export const onPanMove = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "pan" || !isDrawing || !dragStart || !pixiApp) return;

  const globalPoint = event.global;

  // Calculate delta in screen coordinates
  const deltaX = globalPoint.x - dragStart.x;
  const deltaY = globalPoint.y - dragStart.y;

  // Apply delta to pan (divide by zoom to get correct world space movement)
  setPan({
    x: pan.x + deltaX / zoom,
    y: pan.y + deltaY / zoom,
  });

  // Update drag start position for next frame
  setDragStart({ x: globalPoint.x, y: globalPoint.y });

  updateStageTransform();
};

export const onPanEnd = () => {
  if (currentTool !== "pan" || !pixiApp) return;

  setIsDrawing(false);
  setDragStart(null);

  // Reset cursor
  if (pixiApp.canvas) {
    (pixiApp.canvas as HTMLCanvasElement).style.cursor = "grab";
  }
};

// Utility function for smooth animated panning
export const animatePanTo = (
  targetX: number,
  targetY: number,
  duration: number = 500
) => {
  const startPan = { x: pan.x, y: pan.y };
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);

    const currentPan = {
      x: startPan.x + (targetX - startPan.x) * easeOut,
      y: startPan.y + (targetY - startPan.y) * easeOut,
    };

    setPan(currentPan);
    updateStageTransform();

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

// Utility function to pan by a specific delta
export const panBy = (deltaX: number, deltaY: number) => {
  setPan({
    x: pan.x + deltaX,
    y: pan.y + deltaY,
  });
  updateStageTransform();
};

// Utility function to pan to show a specific world coordinate at screen center
export const panToCenter = (worldX: number, worldY: number) => {
  setPan({ x: -worldX, y: -worldY });
  updateStageTransform();
};
