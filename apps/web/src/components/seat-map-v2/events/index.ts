import * as PIXI from "pixi.js";
import { onStageWheel } from "./zoom-events";
import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onDrawStart, onDrawMove, onDrawEnd } from "./draw-events";
import { onStageClick } from "./select-events";
import { currentTool } from "../variables";
import {
  onPolygonStart,
  onPolygonMove,
  onPolygonRightClick,
} from "./polygon-events";

export const onStagePointerDown = (event: PIXI.FederatedPointerEvent) => {
  // Handle different tools
  switch (currentTool) {
    case "pan":
      onPanStart(event);
      break;
    case "rectangle":
    case "ellipse":
    case "text":
      onDrawStart(event);
      break;
    case "polygon":
      onPolygonStart(event);
      break;
    case "select":
      onStageClick(event);
      break;
  }
};

export const onStagePointerMove = (event: PIXI.FederatedPointerEvent) => {
  // Handle different tools
  switch (currentTool) {
    case "pan":
      onPanMove(event);
      break;
    case "rectangle":
    case "ellipse":
      onDrawMove(event);
      break;
    case "polygon":
      onPolygonMove(event);
      break;
  }
};

export const onStagePointerUp = (event: PIXI.FederatedPointerEvent) => {
  // Handle different tools
  switch (currentTool) {
    case "pan":
      onPanEnd();
      break;
    case "rectangle":
    case "ellipse":
      onDrawEnd(event);
      break;
  }
};

// Add right-click handling for polygon
export const onStageRightClick = (event: PIXI.FederatedPointerEvent) => {
  onPolygonRightClick(event);
};

// Export zoom events
export { onStageWheel } from "./zoom-events";
export { onShapeClick } from "./select-events";

// Export individual event handlers for direct use
export { handleZoomIn, handleZoomOut, handleResetView } from "./zoom-events";
