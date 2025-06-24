import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { Shape } from "@/types/seat-map-types";

export const useSelectionEvents = () => {
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

  const {
    shapes,
    selectedShapeIds,
    clearSelection,
    selectShape,
    selectMultipleShapes,
  } = useCanvasStore();

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

  const resetSelectionState = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionRect(null);
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
    isSelecting,
    selectionRect,
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
    resetSelectionState,
  };
};
