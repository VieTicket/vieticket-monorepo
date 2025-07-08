import { useCallback } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useDragEvents } from "./events/useDragEvents";
import { useMouseEvents } from "./events/useMouseEvents";
import { useAreaZoom } from "./useAreaZoom";

export const useCanvasEvents = () => {
  const { currentTool } = useCanvasStore();

  const mouseEvents = useMouseEvents();
  const dragEvents = useDragEvents();
  const areaZoom = useAreaZoom();

  // Main event handlers
  const handleShapeClick = useCallback(
    (shapeId: string, e: any) => {
      if (mouseEvents.clickEvents?.handleShapeClick) {
        mouseEvents.clickEvents.handleShapeClick(shapeId, e);
      }
    },
    [mouseEvents.clickEvents]
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (mouseEvents.clickEvents?.handleStageClick) {
        mouseEvents.clickEvents.handleStageClick(e);
      }
      mouseEvents.inAreaEvents.handleStageClick(e);
    },
    [mouseEvents.clickEvents, mouseEvents.inAreaEvents]
  );

  return {
    // General event handlers
    handleShapeClick,
    handleStageClick,

    // Mouse event handlers
    handleStageMouseDown: mouseEvents.handleStageMouseDown,
    handleStageMouseMove: mouseEvents.handleStageMouseMove,
    handleStageMouseUp: mouseEvents.handleStageMouseUp,

    // Drag event handlers (unified)
    handleShapeDragStart: dragEvents.handleShapeDragStart,
    handleShapeDragMove: dragEvents.handleShapeDragMove,
    handleShapeDragEnd: dragEvents.handleShapeDragEnd,
    handleRowDragStart: dragEvents.handleRowDragStart,
    handleRowDragMove: dragEvents.handleRowDragMove,
    handleRowDragEnd: dragEvents.handleRowDragEnd,
    handleSeatDragStart: dragEvents.handleSeatDragStart,
    handleSeatDragMove: dragEvents.handleSeatDragMove,
    handleSeatDragEnd: dragEvents.handleSeatDragEnd,

    // Canvas coordinates helper
    getCanvasCoordinates: mouseEvents.getCanvasCoordinates,

    // States
    selectionRect: mouseEvents.selectionEvents.selectionRect,
    isSelecting: mouseEvents.selectionEvents.isSelecting,
    previewShape: mouseEvents.getPreviewShape(),
    isDrawing: mouseEvents.drawingEvents.isDrawing,
    isDrawingPolygon: mouseEvents.areaEvents.isDrawingPolygon,
    polygonPoints: mouseEvents.areaEvents.polygonPoints,
    isDragging: dragEvents.isDragging,
    dragType: dragEvents.dragType,
    draggedItemId: dragEvents.draggedItemId,
    currentTool,

    // Area functionality
    areaZoom,
    seatDrawing: mouseEvents.seatEvents.seatDrawing,

    // Area-specific handlers
    handleRowClick: mouseEvents.inAreaEvents.handleRowClick,
    handleSeatClick: mouseEvents.inAreaEvents.handleSeatClick,
    handleSeatDoubleClick: mouseEvents.inAreaEvents.handleSeatDoubleClick,
    handleRowDoubleClick: mouseEvents.inAreaEvents.handleRowDoubleClick,

    // Polygon methods
    cancelPolygon: mouseEvents.areaEvents.cancelPolygon,
    finishPolygon: mouseEvents.areaEvents.finishPolygon,
    isNearFirstPoint: mouseEvents.areaEvents.isNearFirstPoint,

    // Expose event groups
    mouseEvents,
    dragEvents,
  };
};
