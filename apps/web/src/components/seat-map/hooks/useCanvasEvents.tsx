import { useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useSelectionEvents } from "./events/useSelectionEvents";
import { useDrawingEvents } from "./events/useDrawingEvents";
import { usePolygonEvents } from "./events/usePolygonEvents";
import { useDragEvents } from "./events/useDragEvents";
import { useStageRef } from "../providers/stage-provider";
import { createHitFunc } from "../utils/shape-hit-detection";

export const useCanvasEvents = () => {
  const { currentTool, selectShape, clearSelection, zoom, pan, shapes } =
    useCanvasStore();
  const stageRef = useStageRef();

  const selectionEvents = useSelectionEvents();
  const drawingEvents = useDrawingEvents();
  const polygonEvents = usePolygonEvents();
  const dragEvents = useDragEvents();

  const getCanvasCoordinates = (pointerPosition: any) => {
    return {
      x: (pointerPosition.x - pan.x) / zoom,
      y: (pointerPosition.y - pan.y) / zoom,
    };
  };

  const handleShapeClick = (shapeId: string, e: any) => {
    if (currentTool !== "select") return;
    e.cancelBubble = true;

    const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;
    selectShape(shapeId, multiSelect);
  };

  const handleStageClick = (e: any) => {
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
  };

  // Update the refreshHitDetection function in useCanvasEvents.tsx
  const refreshHitDetection = () => {
    if (stageRef.current) {
      const stage = stageRef.current;
      const layer = stage.getLayers()[0];

      if (layer) {
        // Method 1: Force hit canvas regeneration
        const hitCanvas = layer.getHitCanvas();
        if (hitCanvas) {
          const context = hitCanvas.getContext();

          const canvas = hitCanvas._canvas;

          // Force regeneration by changing canvas size
          const currentWidth = canvas.width;
          canvas.width = currentWidth + 1;
          canvas.width = currentWidth;
        }

        // Method 2: Update all shapes' hit functions
        layer.getChildren().forEach((child: any) => {
          if (child.attrs?.id && shapes.find((s) => s.id === child.attrs.id)) {
            const shape = shapes.find((s) => s.id === child.attrs.id);
            if (shape) {
              const newHitFunc = createHitFunc(shape);
              if (newHitFunc) {
                child.hitFunc(newHitFunc);
              }
            }
          }
        });

        // Method 3: Force complete redraw
        layer.batchDraw();

        // Method 4: Clear hit region cache
        setTimeout(() => {
          layer.draw();
        }, 16);
      }
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

    refreshHitDetection,
    getCanvasCoordinates,

    selectionRect: selectionEvents.selectionRect,
    isSelecting: selectionEvents.isSelecting,
    previewShape: getPreviewShape(),
    isDrawing: drawingEvents.isDrawing,
    isDrawingPolygon: polygonEvents.isDrawingPolygon,
    polygonPoints: polygonEvents.polygonPoints,
    currentTool,

    cancelPolygon: polygonEvents.cancelPolygon,
    finishPolygon: polygonEvents.finishPolygon,
    isNearFirstPoint: polygonEvents.isNearFirstPoint,
  };
};
