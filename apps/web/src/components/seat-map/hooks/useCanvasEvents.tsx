// Refactored main hook that orchestrates all events

import { useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useSelectionEvents } from "./events/useSelectionEvents";
import { useDrawingEvents } from "./events/useDrawingEvents";
import { usePolygonEvents } from "./events/usePolygonEvents";
import { useDragEvents } from "./events/useDragEvents";

export const useCanvasEvents = () => {
  const stageRef = useRef<any>(null);

  const { currentTool, selectShape, clearSelection, zoom, pan } =
    useCanvasStore();

  // Import all event handlers
  const selectionEvents = useSelectionEvents();
  const drawingEvents = useDrawingEvents();
  const polygonEvents = usePolygonEvents();
  const dragEvents = useDragEvents();

  // Main coordinate helper
  const getCanvasCoordinates = (pointerPosition: any) => {
    return {
      x: (pointerPosition.x - pan.x) / zoom,
      y: (pointerPosition.y - pan.y) / zoom,
    };
  };

  // Shape click handler
  const handleShapeClick = (shapeId: string, e: any) => {
    if (currentTool !== "select") return;
    e.cancelBubble = true;

    const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;
    selectShape(shapeId, multiSelect);
  };

  // Stage click handler
  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      clearSelection();
    }
  };

  const handleStageMouseDown = (e: any) => {
    console.log("event target:", e.target);
    console.log("event target constructor:", e.target.constructor.name);
    console.log("event target type:", e.target.getStage());

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const canvasCoords = getCanvasCoordinates(pointerPosition);

    // FIXED: Allow polygon events when target is Stage OR when we're drawing a polygon
    // and the target is the preview polygon line
    const isStageTarget = e.target === stage;
    const isPolygonPreview =
      currentTool === "polygon" &&
      polygonEvents.isDrawingPolygon &&
      (e.target.constructor.name === "Line" ||
        e.target.attrs?.id === "preview" ||
        e.target.attrs?.id === "polygon-preview");

    // For other tools, only allow stage clicks
    if (!isStageTarget && !isPolygonPreview) {
      return;
    }

    console.log("Stage mouse down at:", canvasCoords);
    switch (currentTool) {
      case "select":
        // Only allow selection on actual stage clicks
        if (isStageTarget) {
          selectionEvents.handleSelectionMouseDown(canvasCoords, e);
        }
        break;
      case "polygon":
        console.log("Polygon tool active");
        polygonEvents.handlePolygonMouseDown(canvasCoords, e);
        break;
      default:
        // Only allow drawing on actual stage clicks
        if (isStageTarget) {
          drawingEvents.handleDrawingMouseDown(canvasCoords, e);
        }
        break;
    }
  };
  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const canvasCoords = getCanvasCoordinates(pointerPosition);
    if (currentTool === "select" && selectionEvents.isSelecting) {
      selectionEvents.handleSelectionMouseMove(canvasCoords);
    } else if (currentTool === "polygon" && polygonEvents.isDrawingPolygon) {
      polygonEvents.handlePolygonMouseMove(canvasCoords);
    } else if (
      currentTool !== "select" &&
      currentTool !== "polygon" &&
      drawingEvents.isDrawing
    ) {
      drawingEvents.handleDrawingMouseMove(canvasCoords);
    }
  };

  const handleStageMouseUp = (e: any) => {
    if (currentTool === "select" && selectionEvents.isSelecting) {
      selectionEvents.handleSelectionMouseUp(e);
    } else if (
      currentTool !== "select" &&
      currentTool !== "polygon" &&
      drawingEvents.isDrawing
    ) {
      drawingEvents.handleDrawingMouseUp(e);
    }
    // Note: Polygon doesn't use mouse up, only mouse down
  };

  // Hit detection refresh
  const refreshHitDetection = () => {
    if (stageRef.current) {
      const stage = stageRef.current;
      const layer = stage.getLayers()[0];
      if (layer) {
        layer.batchDraw();
      }
    }
  };

  // Get the appropriate preview shape based on current tool
  const getPreviewShape = () => {
    if (currentTool === "polygon") {
      return polygonEvents.previewShape;
    } else {
      return drawingEvents.previewShape;
    }
  };

  return {
    // Shape handlers
    handleShapeClick,
    handleStageClick,
    ...dragEvents,

    // Stage handlers
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,

    // Utility
    refreshHitDetection,
    getCanvasCoordinates,

    // State from different event handlers
    selectionRect: selectionEvents.selectionRect,
    isSelecting: selectionEvents.isSelecting,
    previewShape: getPreviewShape(),
    isDrawing: drawingEvents.isDrawing,
    isDrawingPolygon: polygonEvents.isDrawingPolygon,
    polygonPoints: polygonEvents.polygonPoints,
    currentTool,

    // Refs
    stageRef,

    // Polygon specific handlers for UI
    cancelPolygon: polygonEvents.cancelPolygon,
    finishPolygon: polygonEvents.finishPolygon,
    isNearFirstPoint: polygonEvents.isNearFirstPoint,
  };
};
