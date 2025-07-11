import { useCallback } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useSelectionEvents } from "./useSelectionEvents";
import { useClickEvents } from "./useClickEvents";
import { useDrawingEvents } from "./useDrawingEvents";
import { useAreaEvents } from "./useAreaEvents";
import { useInAreaEvents } from "./useInAreaEvents";
import { useSeatEvents } from "./useSeatEvents";

export const useMouseEvents = () => {
  const { currentTool, zoom, pan } = useCanvasStore();

  const selectionEvents = useSelectionEvents();
  const clickEvents = useClickEvents();
  const drawingEvents = useDrawingEvents();
  const areaEvents = useAreaEvents();
  const inAreaEvents = useInAreaEvents();
  const seatEvents = useSeatEvents();

  const getCanvasCoordinates = useCallback(
    (pointerPosition: any) => {
      return {
        x: (pointerPosition.x - pan.x) / zoom,
        y: (pointerPosition.y - pan.y) / zoom,
      };
    },
    [zoom, pan]
  );

  const handleStageMouseDown = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      const canvasCoords = getCanvasCoordinates(pointerPosition);

      const isStageTarget = e.target === stage;
      const isPolygonPreview =
        currentTool === "polygon" &&
        areaEvents.isDrawingPolygon &&
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
          areaEvents.handlePolygonMouseDown(canvasCoords, e);
          break;
        case "seat-grid":
          if (isStageTarget) {
            seatEvents.handleSeatGridMouseDown(canvasCoords);
          }
          break;
        case "seat-row":
          if (isStageTarget) {
            seatEvents.handleSeatRowMouseDown(canvasCoords);
          }
          break;
        default:
          if (isStageTarget) {
            drawingEvents.handleDrawingMouseDown(canvasCoords, e);
          }
          break;
      }
    },
    [
      currentTool,
      getCanvasCoordinates,
      selectionEvents,
      areaEvents,
      seatEvents,
      drawingEvents,
    ]
  );

  const handleStageMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      const canvasCoords = getCanvasCoordinates(pointerPosition);

      if (currentTool === "select" && selectionEvents.isSelecting) {
        selectionEvents.handleSelectionMouseMove(canvasCoords);
      } else if (currentTool === "polygon" && areaEvents.isDrawingPolygon) {
        areaEvents.handlePolygonMouseMove(canvasCoords);
      } else if (currentTool === "seat-grid" || currentTool === "seat-row") {
        seatEvents.handleSeatMouseMove(canvasCoords);
      } else if (
        currentTool !== "select" &&
        currentTool !== "polygon" &&
        drawingEvents.isDrawing
      ) {
        drawingEvents.handleDrawingMouseMove(canvasCoords);
      }
    },
    [
      currentTool,
      getCanvasCoordinates,
      selectionEvents,
      areaEvents,
      seatEvents,
      drawingEvents,
    ]
  );

  const handleStageMouseUp = useCallback(
    (e: any) => {
      if (currentTool === "select" && selectionEvents.isSelecting) {
        selectionEvents.handleSelectionMouseUp(e);
      } else if (
        currentTool !== "select" &&
        currentTool !== "polygon" &&
        currentTool !== "seat-grid" &&
        currentTool !== "seat-row" &&
        drawingEvents.isDrawing
      ) {
        drawingEvents.handleDrawingMouseUp(e);
      }
    },
    [currentTool, selectionEvents, drawingEvents]
  );

  const getPreviewShape = useCallback(() => {
    if (currentTool === "polygon") {
      return areaEvents.previewShape;
    } else {
      return drawingEvents.previewShape;
    }
  }, [currentTool, areaEvents.previewShape, drawingEvents.previewShape]);

  return {
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    getCanvasCoordinates,
    getPreviewShape,

    // Event handlers
    clickEvents,
    selectionEvents,
    drawingEvents,
    areaEvents,
    inAreaEvents,
    seatEvents,
  };
};
