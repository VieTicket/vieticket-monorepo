import { useCallback } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useDragEvents } from "./events/useDragEvents";
import { useDeletionEvents } from "./events/useDeletionEvents";
import { useMouseEvents } from "./events/useMouseEvents";
import { useAreaZoom } from "./useAreaZoom";

export const useCanvasEvents = () => {
  const { currentTool } = useCanvasStore();

  const mouseEvents = useMouseEvents();
  const dragEvents = useDragEvents();
  const deletionEvents = useDeletionEvents();
  const areaZoom = useAreaZoom();

  return {
    // Unified event handlers
    handleShapeClick: mouseEvents.clickEvents.handleShapeClick,
    handleRowClick: mouseEvents.clickEvents.handleRowClick,
    handleSeatClick: mouseEvents.clickEvents.handleSeatClick,
    handleStageClick: mouseEvents.clickEvents.handleStageClick,

    // Mouse event handlers
    handleStageMouseDown: mouseEvents.handleStageMouseDown,
    handleStageMouseMove: mouseEvents.handleStageMouseMove,
    handleStageMouseUp: mouseEvents.handleStageMouseUp,

    // Unified drag event handlers
    handleShapeDragStart: dragEvents.handleShapeDragStart,
    handleShapeDragMove: dragEvents.handleShapeDragMove,
    handleShapeDragEnd: dragEvents.handleShapeDragEnd,
    handleRowDragStart: dragEvents.handleRowDragStart,
    handleRowDragMove: dragEvents.handleRowDragMove,
    handleRowDragEnd: dragEvents.handleRowDragEnd,
    handleSeatDragStart: dragEvents.handleSeatDragStart,
    handleSeatDragMove: dragEvents.handleSeatDragMove,
    handleSeatDragEnd: dragEvents.handleSeatDragEnd,

    // Unified deletion
    handleDelete: deletionEvents.handleDelete,
    handleDeleteKey: deletionEvents.handleDeleteKey,

    // Canvas coordinates helper
    getCanvasCoordinates: mouseEvents.getCanvasCoordinates,

    // States
    selectionRect: mouseEvents.selectionEvents.selectionRect,
    isSelecting: mouseEvents.selectionEvents.isSelecting,
    previewShape: mouseEvents.getPreviewShape(),
    isDrawing: mouseEvents.drawingEvents.isDrawing,
    isDrawingPolygon: mouseEvents.polygonEvents.isDrawingPolygon,
    polygonPoints: mouseEvents.polygonEvents.polygonPoints,
    isDragging: dragEvents.isDragging,
    dragType: dragEvents.dragType,
    currentTool,

    // Area functionality
    areaZoom,
    seatDrawing: mouseEvents.seatEvents.seatDrawing,

    // Polygon methods
    cancelPolygon: mouseEvents.polygonEvents.cancelPolygon,
    finishPolygon: mouseEvents.polygonEvents.finishPolygon,
    isNearFirstPoint: mouseEvents.polygonEvents.isNearFirstPoint,

    // Expose unified event groups
    mouseEvents,
    dragEvents,
    deletionEvents,
  };
};
