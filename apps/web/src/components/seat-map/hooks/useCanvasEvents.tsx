import { useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useSelectionEvents } from "./events/useSelectionEvents";
import { useDrawingEvents } from "./events/useDrawingEvents";
import { usePolygonEvents } from "./events/usePolygonEvents";
import { useDragEvents } from "./events/useDragEvents";
import { useAreaZoom } from "./useAreaZoom";
import { useRowDrawing } from "./useRowDrawing";
import { useStageRef } from "../providers/stage-provider";
import { useSeatDrawing } from "./useSeatDrawing";

export const useCanvasEvents = () => {
  const { currentTool, selectShape, clearSelection, zoom, pan, shapes } =
    useCanvasStore();
  const stageRef = useStageRef();

  const selectionEvents = useSelectionEvents();
  const drawingEvents = useDrawingEvents();
  const polygonEvents = usePolygonEvents();
  const dragEvents = useDragEvents();
  const areaZoom = useAreaZoom();
  const rowDrawing = useRowDrawing();
  const seatDrawing = useSeatDrawing();

  // NEW: Track double-click
  const lastClickTime = useRef(0);
  const lastClickTarget = useRef<string | null>(null);

  const getCanvasCoordinates = (pointerPosition: any) => {
    return {
      x: (pointerPosition.x - pan.x) / zoom,
      y: (pointerPosition.y - pan.y) / zoom,
    };
  };

  const handleShapeClick = (shapeId: string, e: any) => {
    if (currentTool !== "select") return;
    e.cancelBubble = true;

    // NEW: Handle double-click for area zoom
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime.current;

    if (timeDiff < 300 && lastClickTarget.current === shapeId) {
      // Double-click detected
      const shape = shapes.find((s) => s.id === shapeId);
      if (shape && shape.type === "polygon") {
        areaZoom.handleAreaDoubleClick(shapeId);
        return;
      }
    }

    lastClickTime.current = currentTime;
    lastClickTarget.current = shapeId;

    // Regular single click
    const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;
    selectShape(shapeId, multiSelect);
  };

  // NEW: Handle area-specific clicks
  const handleRowClick = (rowId: string, e: any) => {
    e.cancelBubble = true;
    console.log("Row clicked:", rowId);
    // TODO: Implement row selection logic
  };

  const handleSeatClick = (seatId: string, e: any) => {
    e.cancelBubble = true;
    console.log("Seat clicked:", seatId);
    // TODO: Implement seat selection logic
  };

  const handleStageClick = (e: any) => {
    console.log("Stage clicked");
    if (e.target === e.target.getStage()) {
      clearSelection();
    }
  };

  const handleStageMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const canvasCoords = getCanvasCoordinates(pointerPosition);

    const isStageTarget = e.target === stage;
    const isPolygonPreview =
      currentTool === "polygon" &&
      polygonEvents.isDrawingPolygon &&
      (e.target.constructor.name === "Line" ||
        e.target.attrs?.id === "preview" ||
        e.target.attrs?.id === "polygon-preview");

    if (!isStageTarget && !isPolygonPreview) {
      return;
    }

    switch (currentTool) {
      case "select":
        if (isStageTarget) {
          selectionEvents.handleSelectionMouseDown(canvasCoords, e);
        }
        break;
      case "polygon":
        polygonEvents.handlePolygonMouseDown(canvasCoords, e);
        break;
      default:
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
      // } else if (currentTool === "row" && rowDrawing.isDrawingRow) {
      // rowDrawing.updateRowPreview(canvasCoords);
    } else if (
      currentTool !== "select" &&
      currentTool !== "polygon" &&
      currentTool !== "row" &&
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
      currentTool !== "row" &&
      drawingEvents.isDrawing
    ) {
      drawingEvents.handleDrawingMouseUp(e);
    }
  };

  const getPreviewShape = () => {
    if (currentTool === "polygon") {
      return polygonEvents.previewShape;
    } else {
      return drawingEvents.previewShape;
    }
  };

  return {
    handleShapeClick,
    handleStageClick,
    ...dragEvents,

    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,

    getCanvasCoordinates,

    // Selection and drawing states
    selectionRect: selectionEvents.selectionRect,
    isSelecting: selectionEvents.isSelecting,
    previewShape: getPreviewShape(),
    isDrawing: drawingEvents.isDrawing,
    isDrawingPolygon: polygonEvents.isDrawingPolygon,
    polygonPoints: polygonEvents.polygonPoints,
    currentTool,

    // Drag state
    isDragging: dragEvents.isDragging,

    // Area and row functionality
    areaZoom,
    rowDrawing,
    seatDrawing,

    // Area-specific handlers
    handleRowClick,
    handleSeatClick,

    // Polygon methods
    cancelPolygon: polygonEvents.cancelPolygon,
    finishPolygon: polygonEvents.finishPolygon,
    isNearFirstPoint: polygonEvents.isNearFirstPoint,
  };
};
