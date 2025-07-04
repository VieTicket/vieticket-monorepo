import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import {
  CircleShape,
  PolygonShape,
  RectShape,
  ShapeWithoutMeta,
  TextShape,
} from "@/types/seat-map-types";

export const useDrawingEvents = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<{ x: number; y: number } | null>(
    null
  );
  const [previewShape, setPreviewShape] = useState<any>(null);

  const { addShape, saveToHistory, currentTool } = useCanvasStore();

  const handleDrawingMouseDown = (canvasCoords: any, e: any) => {
    setIsDrawing(true);
    setDrawingStart(canvasCoords);
    setDrawingEnd(canvasCoords);
    createPreviewShape(canvasCoords, canvasCoords);
  };

  const handleDrawingMouseMove = (canvasCoords: any) => {
    if (!drawingStart) return;
    setDrawingEnd(canvasCoords);
    createPreviewShape(drawingStart, canvasCoords);
  };

  const handleDrawingMouseUp = (e: any) => {
    if (!drawingStart || !drawingEnd) {
      resetDrawingState();
      return;
    }

    createFinalShape(drawingStart, drawingEnd);
    resetDrawingState();
    saveToHistory();
  };

  const createPreviewShape = (start: any, end: any) => {
    const shape = generateShapeFromCoords(start, end, currentTool);
    setPreviewShape(shape);
  };

  const createFinalShape = (start: any, end: any) => {
    const shape = generateShapeFromCoords(start, end, currentTool);
    if (shape) {
      addShape(shape);
    }
  };

  const generateShapeFromCoords = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    shapeType: string
  ): ShapeWithoutMeta | null => {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);

    if (width < 5 && height < 5) return null;

    switch (shapeType) {
      case "rect":
        return {
          type: "rect" as const,
          x,
          y,
          width,
          height,
          fill: "#f0f0f0",
          stroke: "#000000",
          strokeWidth: 1,
        } satisfies Omit<RectShape, "id" | "visible" | "draggable">;

      case "circle":
        const radius = Math.max(width, height) / 2;
        return {
          type: "circle" as const,
          x: start.x + (end.x - start.x) / 2,
          y: start.y + (end.y - start.y) / 2,
          radius,
          fill: "#e0e0ff",
          stroke: "#000000",
          strokeWidth: 1,
        } satisfies Omit<CircleShape, "id" | "visible" | "draggable">;

      case "text":
        return {
          type: "text" as const,
          x: start.x,
          y: start.y,
          name: "New Text",
          fontSize: 16,
          fill: "#000000",
          width: Math.max(100, width),
        } satisfies Omit<TextShape, "id" | "visible" | "draggable">;

      default:
        return null;
    }
  };

  const resetDrawingState = () => {
    setIsDrawing(false);
    setDrawingStart(null);
    setDrawingEnd(null);
    setPreviewShape(null);
  };

  return {
    isDrawing,
    previewShape,
    handleDrawingMouseDown,
    handleDrawingMouseMove,
    handleDrawingMouseUp,
    resetDrawingState,
  };
};
