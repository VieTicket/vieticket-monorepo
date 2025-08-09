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
} from "../variables";
import { updateStageTransform } from "../utils";

export const onPanStart = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "pan") return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  setDragStart({ x: localPoint.x, y: localPoint.y });
  setIsDrawing(true);
};

export const onPanMove = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "pan" || !isDrawing || !dragStart) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  const deltaX = localPoint.x - dragStart.x;
  const deltaY = localPoint.y - dragStart.y;
  setPan({ x: pan.x + deltaX * zoom, y: pan.y + deltaY * zoom });
  updateStageTransform();
};

export const onPanEnd = () => {
  if (currentTool !== "pan") return;

  setIsDrawing(false);
  setDragStart(null);
};
