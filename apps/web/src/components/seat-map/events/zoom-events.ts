import * as PIXI from "pixi.js";
import { stage, zoom, pan, setZoom, setPan, pixiApp } from "../variables";
import { updateStageTransform } from "../utils/stageTransform";
// ✅ Touch state management using active pointers
interface TouchState {
  activePointers: Map<number, PIXI.Point>;
  initialDistance: number | null;
  initialZoom: number | null;
  initialCenter: { x: number; y: number } | null;
}

const touchState: TouchState = {
  activePointers: new Map(),
  initialDistance: null,
  initialZoom: null,
  initialCenter: null,
};

// ✅ Calculate distance between two points
const calculateDistance = (point1: PIXI.Point, point2: PIXI.Point): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// ✅ Calculate center point between two points
const calculateCenter = (
  point1: PIXI.Point,
  point2: PIXI.Point
): { x: number; y: number } => {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2,
  };
};

// ✅ Handle touch start - track pointer
export const onTouchStart = (event: PIXI.FederatedPointerEvent) => {
  if (!stage) return;

  const pointerId = event.pointerId;
  const globalPoint = event.global.clone();

  touchState.activePointers.set(pointerId, globalPoint);

  // If we have 2 pointers, initialize pinch-to-zoom
  if (touchState.activePointers.size === 2) {
    const pointers = Array.from(touchState.activePointers.values());
    touchState.initialDistance = calculateDistance(pointers[0], pointers[1]);
    touchState.initialZoom = zoom;

    const center = calculateCenter(pointers[0], pointers[1]);
    const localCenter = stage.toLocal(new PIXI.Point(center.x, center.y));
    touchState.initialCenter = { x: localCenter.x, y: localCenter.y };
  }
};

// ✅ Handle touch move - handle pinch-to-zoom
export const onTouchMove = (event: PIXI.FederatedPointerEvent) => {
  if (!stage || !pixiApp) return;

  const pointerId = event.pointerId;

  // Only update if this pointer is being tracked
  if (!touchState.activePointers.has(pointerId)) return;

  const globalPoint = event.global.clone();
  touchState.activePointers.set(pointerId, globalPoint);

  // Handle pinch-to-zoom with 2 pointers
  if (
    touchState.activePointers.size === 2 &&
    touchState.initialDistance !== null &&
    touchState.initialZoom !== null &&
    touchState.initialCenter !== null
  ) {
    event.stopPropagation();

    const pointers = Array.from(touchState.activePointers.values());
    const currentDistance = calculateDistance(pointers[0], pointers[1]);

    // Calculate zoom based on pinch distance
    const scale = currentDistance / touchState.initialDistance;
    const newZoom = Math.max(0.1, Math.min(5, touchState.initialZoom * scale));

    // Calculate pan to keep the pinch center stationary
    const zoomDelta = newZoom - zoom;
    const newPan = {
      x: pan.x - touchState.initialCenter.x * zoomDelta,
      y: pan.y - touchState.initialCenter.y * zoomDelta,
    };

    setZoom(newZoom);
    setPan(newPan);
    updateStageTransform();
  }
};

// ✅ Handle touch end - clean up pointer state
export const onTouchEnd = (event: PIXI.FederatedPointerEvent) => {
  const pointerId = event.pointerId;
  touchState.activePointers.delete(pointerId);

  // Reset pinch state if we no longer have 2 pointers
  if (touchState.activePointers.size < 2) {
    touchState.initialDistance = null;
    touchState.initialZoom = null;
    touchState.initialCenter = null;
  }

  // If we still have 2 pointers after one ended, reinitialize
  if (touchState.activePointers.size === 2 && stage) {
    const pointers = Array.from(touchState.activePointers.values());
    touchState.initialDistance = calculateDistance(pointers[0], pointers[1]);
    touchState.initialZoom = zoom;

    const center = calculateCenter(pointers[0], pointers[1]);
    const localCenter = stage.toLocal(new PIXI.Point(center.x, center.y));
    touchState.initialCenter = { x: localCenter.x, y: localCenter.y };
  }
};

// ✅ Reset touch state (call on cleanup)
export const resetTouchState = () => {
  touchState.activePointers.clear();
  touchState.initialDistance = null;
  touchState.initialZoom = null;
  touchState.initialCenter = null;
};

// ✅ Get active pointer count
export const getActivePointerCount = (): number => {
  return touchState.activePointers.size;
};

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
