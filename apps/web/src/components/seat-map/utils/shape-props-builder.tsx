import { Shape } from "@/types/seat-map-types";
import { createHitFunc } from "./shape-hit-detection";

export const buildShapeProps = (
  shape: Shape,
  isSelected: boolean,
  eventHandlers: any
) => {
  // Extract only the props that should be passed to Konva components
  const {
    handleShapeClick,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
    // Remove these from spread to avoid passing unnecessary props
    handleStageClick,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    selectionRect,
    isSelecting,
    previewShape,
    isDrawing,
    currentTool,
    stageRef,
    children,
    ...cleanEventHandlers
  } = eventHandlers;

  const baseProps = {
    // Don't include key here - it will be extracted in renderShape
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation || 0,
    scaleX: shape.scaleX || 1,
    scaleY: shape.scaleY || 1,
    visible: shape.visible !== false,
    opacity: shape.opacity ?? 1,
    draggable: true,
    listening: true,
    perfectDrawEnabled: false,

    // Fixed event handlers with proper logging
    onClick: (e: any) => {
      e.cancelBubble = true;
      handleShapeClick?.(shape.id, e);
    },
    onTap: (e: any) => {
      e.cancelBubble = true;
      handleShapeClick?.(shape.id, e);
    },
    onDragStart: (e: any) => {
      handleShapeDragStart?.(shape.id, e);
    },
    onDragMove: (e: any) => {
      handleShapeDragMove?.(shape.id, e);
    },
    onDragEnd: (e: any) => {
      handleShapeDragEnd?.(shape.id, e);
    },
  };

  return baseProps;
};
