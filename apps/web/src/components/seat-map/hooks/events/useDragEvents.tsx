import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

export const useDragEvents = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [initialShapePositions, setInitialShapePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  const {
    shapes,
    selectedShapeIds,
    currentTool,
    updateShape,
    updateMultipleShapes,
    selectShape,
    saveToHistory,
  } = useCanvasStore();

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

    // Prepare batch updates for all selected shapes except the one being dragged
    const updates: { id: string; updates: any }[] = [];

    initialShapePositions.forEach((initialPos, id) => {
      if (id !== shapeId) {
        updates.push({
          id,
          updates: {
            x: initialPos.x + deltaX,
            y: initialPos.y + deltaY,
          },
        });
      }
    });

    if (updates.length > 0) {
      updateMultipleShapes(updates);
    }
  };

  const handleShapeDragEnd = (shapeId: string, e: any) => {
    if (currentTool !== "select" || !isDragging) return;

    const target = e.target;
    updateShape(shapeId, {
      x: target.x(),
      y: target.y(),
    });
    saveToHistory();

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setInitialShapePositions(new Map());
  };

  return {
    isDragging,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
  };
};
