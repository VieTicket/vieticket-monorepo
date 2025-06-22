import { useState, useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { Shape } from "@/types/seat-map-types";

export const useCanvasEvents = () => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedShapeId, setDraggedShapeId] = useState<string | null>(null);
  const [initialShapePositions, setInitialShapePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Selection rectangle state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const stageRef = useRef<any>(null);

  const {
    shapes,
    selectedShapeIds,
    updateShape,
    selectShape,
    clearSelection,
    saveToHistory,
    selectMultipleShapes,
    zoom,
    pan,
  } = useCanvasStore();

  const handleShapeClick = (shapeId: string, e: any) => {
    e.cancelBubble = true;
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
    selectShape(shapeId, multiSelect);
  };

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      clearSelection();
    }
  };

  const handleContextMenu = (e: any) => {
    e.evt.preventDefault();
  };

  // Selection rectangle handlers
  const handleStageMouseDown = (e: any) => {
    // Only start selection if clicking on empty space (stage)
    if (e.target !== e.target.getStage()) {
      return;
    }

    // Get pointer position relative to stage
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();

    // Adjust for zoom and pan
    const x = (pointerPosition.x - pan.x) / zoom;
    const y = (pointerPosition.y - pan.y) / zoom;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setSelectionRect({ x, y, width: 0, height: 0 });

    // Clear selection if not holding Ctrl/Cmd
    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      clearSelection();
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!isSelecting || !selectionStart) {
      return;
    }

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();

    // Adjust for zoom and pan
    const x = (pointerPosition.x - pan.x) / zoom;
    const y = (pointerPosition.y - pan.y) / zoom;

    setSelectionEnd({ x, y });

    // Calculate rectangle bounds
    const rect = {
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
    };

    setSelectionRect(rect);
  };

  const handleStageMouseUp = (e: any) => {
    if (!isSelecting || !selectionRect) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      setSelectionRect(null);
      return;
    }

    // Find shapes within selection rectangle
    const shapesInSelection = shapes.filter((shape) => {
      return isShapeInRectangle(shape, selectionRect);
    });

    // Select the shapes
    if (shapesInSelection.length > 0) {
      const shapeIds = shapesInSelection.map((shape) => shape.id);
      const multiSelect = e.evt.ctrlKey || e.evt.metaKey;

      if (multiSelect) {
        // Add to existing selection
        shapeIds.forEach((id) => {
          if (!selectedShapeIds.includes(id)) {
            selectShape(id, true);
          }
        });
      } else {
        // Replace selection
        selectMultipleShapes(shapeIds);
      }
    }

    // Reset selection state
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionRect(null);
  };

  // Helper function to check if shape is within rectangle
  const isShapeInRectangle = (
    shape: Shape,
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    let shapeLeft = shape.x;
    let shapeTop = shape.y;
    let shapeRight = shape.x;
    let shapeBottom = shape.y;

    // Calculate shape bounds based on type
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
            maxY = Math.max(maxY, shape.y + shape.points[i + 1]);
          }

          shapeLeft = minX;
          shapeTop = minY;
          shapeRight = maxX;
          shapeBottom = maxY;
        }
        break;
    }

    // Check if shape intersects with selection rectangle
    return !(
      shapeRight < rect.x ||
      shapeLeft > rect.x + rect.width ||
      shapeBottom < rect.y ||
      shapeTop > rect.y + rect.height
    );
  };

  // Shape drag handlers - FIXED VERSION
  const handleShapeDragStart = (shapeId: string, e: any) => {
    // If shape is not selected, select it first
    if (!selectedShapeIds.includes(shapeId)) {
      selectShape(shapeId, false); // Select only this shape
    }

    setIsDragging(true);
    setDraggedShapeId(shapeId);

    // Store the initial position of the dragged shape
    setDragStart({
      x: e.target.x(),
      y: e.target.y(),
    });

    // Store initial positions of ALL selected shapes (including the newly selected one if applicable)
    const currentSelectedIds = selectedShapeIds.includes(shapeId)
      ? selectedShapeIds
      : [shapeId]; // If shape wasn't selected, only this shape will be moved

    const positions = new Map<string, { x: number; y: number }>();
    currentSelectedIds.forEach((id: string) => {
      const shape = shapes.find((s: Shape) => s.id === id);
      if (shape) {
        positions.set(id, { x: shape.x, y: shape.y });
      }
    });
    setInitialShapePositions(positions);
  };

  const handleShapeDragMove = (shapeId: string, e: any) => {
    if (!isDragging || !dragStart || draggedShapeId !== shapeId) {
      return;
    }

    // Calculate the delta from the initial drag position
    const deltaX = e.target.x() - dragStart.x;
    const deltaY = e.target.y() - dragStart.y;

    // Update all shapes that were selected when drag started (excluding the dragged shape itself)
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
    if (!isDragging || !dragStart || draggedShapeId !== shapeId) {
      return;
    }

    // Update the dragged shape's position in the store
    // (Konva updates the shape's visual position, but we need to update our store)
    updateShape(shapeId, {
      x: e.target.x(),
      y: e.target.y(),
    });

    // The other selected shapes were already updated in handleShapeDragMove

    setIsDragging(false);
    setDragStart(null);
    setDraggedShapeId(null);
    setInitialShapePositions(new Map());
    saveToHistory();
  };

  return {
    // Shape handlers
    handleShapeClick,
    handleStageClick,
    handleContextMenu,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,

    // Selection rectangle handlers
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,

    // Selection rectangle state
    selectionRect,
    isSelecting,

    // Refs
    stageRef,
  };
};
