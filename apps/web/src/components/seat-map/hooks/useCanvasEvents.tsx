// useCanvasEvents.tsx - Fix click vs drag issue
import { useState, useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import {
  CircleShape,
  PolygonShape,
  RectShape,
  Shape,
  ShapeWithoutMeta,
  TextShape,
} from "@/types/seat-map-types";

export const useCanvasEvents = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [initialShapePositions, setInitialShapePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Drawing and selection states remain the same
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawingEnd, setDrawingEnd] = useState<{ x: number; y: number } | null>(
    null
  );
  const [previewShape, setPreviewShape] = useState<any>(null);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<any>(null);

  const stageRef = useRef<any>(null);

  const {
    shapes,
    selectedShapeIds,
    currentTool,
    updateShape,
    selectShape,
    clearSelection,
    saveToHistory,
    selectMultipleShapes,
    addShape,
    zoom,
    pan,
  } = useCanvasStore();

  // SIMPLE click handler - only for selection
  const handleShapeClick = (shapeId: string, e: any) => {
    if (currentTool !== "select") return;

    // Don't select if we just finished dragging
    if (isDragging) return;

    const evt = e.evt || e;
    if (evt) {
      evt.cancelBubble = true;
      evt.stopPropagation && evt.stopPropagation();
    }

    e.cancelBubble = true;
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    const multiSelect = evt?.ctrlKey || evt?.metaKey || false;
    selectShape(shapeId, multiSelect);
  };

  // SIMPLE drag handlers
  const handleShapeDragStart = (shapeId: string, e: any) => {
    if (currentTool !== "select") return;

    setIsDragging(true);

    // Auto-select if not already selected
    if (!selectedShapeIds.includes(shapeId)) {
      selectShape(shapeId, false);
    }

    const target = e.target;
    setDragStart({ x: target.x(), y: target.y() });

    // Store initial positions for multi-shape drag
    const currentSelectedIds = selectedShapeIds.includes(shapeId)
      ? selectedShapeIds
      : [shapeId];
    const positions = new Map();
    currentSelectedIds.forEach((id: string) => {
      const shape = shapes.find((s) => s.id === id);
      if (shape) {
        positions.set(id, { x: shape.x, y: shape.y });
      }
    });
    setInitialShapePositions(positions);
  };

  const handleShapeDragMove = (shapeId: string, e: any) => {
    if (currentTool !== "select" || !isDragging || !dragStart) return;

    const target = e.target;
    const deltaX = target.x() - dragStart.x;
    const deltaY = target.y() - dragStart.y;

    // Update OTHER selected shapes (not the one being dragged)
    initialShapePositions.forEach((initialPos, id) => {
      if (id !== shapeId) {
        updateShape(id, {
          x: initialPos.x + deltaX,
          y: initialPos.y + deltaY,
        });
      }
    });
  };

  const handleShapeDragEnd = (shapeId: string, e: any) => {
    if (currentTool !== "select") return;

    if (isDragging) {
      const target = e.target;
      updateShape(shapeId, {
        x: target.x(),
        y: target.y(),
      });
      saveToHistory();
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setInitialShapePositions(new Map());

    // Small delay to prevent click after drag
    setTimeout(() => setIsDragging(false), 50);
  };

  // Stage handlers remain the same...
  const getCanvasCoordinates = (pointerPosition: any) => {
    return {
      x: (pointerPosition.x - pan.x) / zoom,
      y: (pointerPosition.y - pan.y) / zoom,
    };
  };

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      clearSelection();
    }
  };

  // Stage mouse down handler - switches between selection and drawing modes
  const handleStageMouseDown = (e: any) => {
    // Only handle clicks on empty space (stage)
    if (e.target !== e.target.getStage()) {
      return;
    }

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const canvasCoords = getCanvasCoordinates(pointerPosition);

    if (currentTool === "select") {
      // Selection mode
      handleSelectionMouseDown(canvasCoords, e);
    } else {
      // Drawing mode
      handleDrawingMouseDown(canvasCoords, e);
    }
  };

  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const canvasCoords = getCanvasCoordinates(pointerPosition);

    if (currentTool === "select" && isSelecting) {
      handleSelectionMouseMove(canvasCoords);
    } else if (currentTool !== "select" && isDrawing) {
      handleDrawingMouseMove(canvasCoords);
    }
  };

  const handleStageMouseUp = (e: any) => {
    if (currentTool === "select" && isSelecting) {
      handleSelectionMouseUp(e);
    } else if (currentTool !== "select" && isDrawing) {
      handleDrawingMouseUp(e);
    }
  };

  // Selection handlers
  const handleSelectionMouseDown = (canvasCoords: any, e: any) => {
    setIsSelecting(true);
    setSelectionStart(canvasCoords);
    setSelectionEnd(canvasCoords);
    setSelectionRect({
      x: canvasCoords.x,
      y: canvasCoords.y,
      width: 0,
      height: 0,
    });

    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      clearSelection();
    }
  };

  const handleSelectionMouseMove = (canvasCoords: any) => {
    if (!selectionStart) return;

    setSelectionEnd(canvasCoords);

    const rect = {
      x: Math.min(selectionStart.x, canvasCoords.x),
      y: Math.min(selectionStart.y, canvasCoords.y),
      width: Math.abs(canvasCoords.x - selectionStart.x),
      height: Math.abs(canvasCoords.y - selectionStart.y),
    };

    setSelectionRect(rect);
  };

  const handleSelectionMouseUp = (e: any) => {
    if (!selectionRect) {
      resetSelectionState();
      return;
    }

    const shapesInSelection = shapes.filter((shape) =>
      isShapeInRectangle(shape, selectionRect)
    );

    if (shapesInSelection.length > 0) {
      const shapeIds = shapesInSelection.map((shape) => shape.id);
      const multiSelect = e.evt.ctrlKey || e.evt.metaKey;

      if (multiSelect) {
        shapeIds.forEach((id) => {
          if (!selectedShapeIds.includes(id)) {
            selectShape(id, true);
          }
        });
      } else {
        selectMultipleShapes(shapeIds);
      }
    }

    resetSelectionState();
  };

  // Drawing handlers
  const handleDrawingMouseDown = (canvasCoords: any, e: any) => {
    setIsDrawing(true);
    setDrawingStart(canvasCoords);
    setDrawingEnd(canvasCoords);

    // Create initial preview shape
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

    // Create the actual shape
    createFinalShape(drawingStart, drawingEnd);
    resetDrawingState();
    saveToHistory();
  };

  // Helper functions
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

    // Don't create shapes that are too small
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
          text: "New Text",
          fontSize: 16,
          fill: "#000000",
          width: Math.max(100, width),
        } satisfies Omit<TextShape, "id" | "visible" | "draggable">;

      case "polygon":
        return {
          type: "polygon" as const,
          x,
          y,
          points: [0, 0, width, 0, width, height, 0, height],
          fill: "#ffe0e0",
          stroke: "#000000",
          strokeWidth: 1,
          closed: true,
        } satisfies Omit<PolygonShape, "id" | "visible" | "draggable">;

      default:
        return null;
    }
  };

  const resetSelectionState = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionRect(null);
  };

  const resetDrawingState = () => {
    setIsDrawing(false);
    setDrawingStart(null);
    setDrawingEnd(null);
    setPreviewShape(null);
  };

  const isShapeInRectangle = (
    shape: Shape,
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    let shapeLeft = shape.x;
    let shapeTop = shape.y;
    let shapeRight = shape.x;
    let shapeBottom = shape.y;

    switch (shape.type) {
      case "rect":
        shapeRight = shape.x + shape.width;
        shapeBottom = shape.y + shape.height;
        break;
      case "circle":
        shapeLeft = shape.x - shape.radius;
        shapeTop = shape.y - shape.radius;
        shapeRight = shape.x + shape.radius;
        shapeBottom = shape.y + shape.radius;
        break;
      case "text":
        shapeRight = shape.x + (shape.width || 100);
        shapeBottom = shape.y + (shape.fontSize || 16);
        break;
      case "polygon":
        if (shape.points && shape.points.length >= 2) {
          let minX = shape.x + shape.points[0];
          let maxX = shape.x + shape.points[0];
          let minY = shape.y + shape.points[1];
          let maxY = shape.y + shape.points[1];

          for (let i = 2; i < shape.points.length; i += 2) {
            minX = Math.min(minX, shape.x + shape.points[i]);
            maxX = Math.max(maxX, shape.x + shape.points[i]);
            minY = Math.min(minY, shape.y + shape.points[i + 1]);
            maxY = Math.max(maxY, shape.points[i + 1]);
          }

          shapeLeft = minX;
          shapeTop = minY;
          shapeRight = maxX;
          shapeBottom = maxY;
        }
        break;
    }

    return !(
      shapeRight < rect.x ||
      shapeLeft > rect.x + rect.width ||
      shapeBottom < rect.y ||
      shapeTop > rect.y + rect.height
    );
  };

  return {
    // Shape handlers
    handleShapeClick,
    handleStageClick,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,

    // Stage handlers (mode-aware)
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,

    // State
    selectionRect,
    isSelecting,
    previewShape,
    isDrawing,
    currentTool,

    // Refs
    stageRef,
  };
};
