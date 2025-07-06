import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import {
  CircleShape,
  PolygonShape,
  RectShape,
  ShapeWithoutMeta,
  TextShape,
} from "@/types/seat-map-types";
import { v4 as uuidv4 } from "uuid";
import { useTextMeasure } from "@/hooks/useTextMeasure";

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
  const { measureText } = useTextMeasure();

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

    if (width < 5 && height < 5 && shapeType !== "text") return null;

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
        return createTextShape(start);

      default:
        return null;
    }
  };

  // FIX: Update createTextShape to use dynamic sizing
  const createTextShape = (canvasCoords: { x: number; y: number }) => {
    const defaultText = "New Text";
    const defaultFontSize = 16;
    const defaultFontFamily = "Arial";

    // Measure the default text
    const dimensions = measureText(
      defaultText,
      defaultFontSize,
      defaultFontFamily
    );

    return {
      id: uuidv4(),
      type: "text" as const,
      name: defaultText,
      x: canvasCoords.x,
      y: canvasCoords.y,
      fontSize: defaultFontSize,
      fontFamily: defaultFontFamily,
      fontStyle: "normal",
      align: "left",
      fill: "#000000",
      width: dimensions.width,
      height: dimensions.height,
      visible: true,
      draggable: true,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
    };
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
