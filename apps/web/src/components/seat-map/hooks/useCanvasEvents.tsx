import { useCallback, useMemo, useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useDragEvents } from "./events/useDragEvents";
import { useMouseEvents } from "./events/useMouseEvents";
import { useAreaZoom } from "./useAreaZoom";

export const useCanvasEvents = () => {
  const { currentTool } = useCanvasStore();

  const mouseEvents = useMouseEvents();
  const dragEvents = useDragEvents();
  const areaZoom = useAreaZoom();

  // Keep track of previous event handlers for stable references
  const previousHandlersRef = useRef({
    handleShapeClick: (shapeId: string, e: any) => {},
    handleStageClick: (e: any) => {},
    // Initialize with empty functions
  });

  // Main event handlers with proper memoization
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

  // Update refs for stable references
  previousHandlersRef.current.handleShapeClick = handleShapeClick;
  previousHandlersRef.current.handleStageClick = handleStageClick;

  // Return a stable object reference with memoized sub-objects
  return useMemo(
    () => ({
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

      // States - group into sub-objects for better memoization
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
      guideLines: mouseEvents.areaEvents.guideLines,
    }),
    [
      // Only include dependencies that should trigger a recreation of this object
      handleShapeClick,
      handleStageClick,
      mouseEvents.handleStageMouseDown,
      mouseEvents.handleStageMouseMove,
      mouseEvents.handleStageMouseUp,
      dragEvents.handleShapeDragStart,
      dragEvents.handleShapeDragMove,
      dragEvents.handleShapeDragEnd,
      dragEvents.handleRowDragStart,
      dragEvents.handleRowDragMove,
      dragEvents.handleRowDragEnd,
      dragEvents.handleSeatDragStart,
      dragEvents.handleSeatDragMove,
      dragEvents.handleSeatDragEnd,
      mouseEvents.getCanvasCoordinates,
      mouseEvents.selectionEvents.selectionRect,
      mouseEvents.selectionEvents.isSelecting,
      mouseEvents.getPreviewShape(),
      mouseEvents.drawingEvents.isDrawing,
      mouseEvents.areaEvents.isDrawingPolygon,
      mouseEvents.areaEvents.polygonPoints,
      dragEvents.isDragging,
      dragEvents.dragType,
      dragEvents.draggedItemId,
      currentTool,
      areaZoom,
      mouseEvents.seatEvents.seatDrawing,
      mouseEvents.inAreaEvents.handleRowClick,
      mouseEvents.inAreaEvents.handleSeatClick,
      mouseEvents.inAreaEvents.handleSeatDoubleClick,
      mouseEvents.inAreaEvents.handleRowDoubleClick,
      mouseEvents.areaEvents.cancelPolygon,
      mouseEvents.areaEvents.finishPolygon,
      mouseEvents.areaEvents.isNearFirstPoint,
      mouseEvents.areaEvents.guideLines,
    ]
  );
};
