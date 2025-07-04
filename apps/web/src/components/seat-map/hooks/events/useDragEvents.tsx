import { useState, useCallback, useRef } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

export const useDragEvents = () => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialShapePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Get a stable reference to the store itself, not its values
  const store = useCanvasStore;

  // FIX: Use useCallback to memoize the event handlers
  const handleShapeDragStart = useCallback((shapeId: string, e: any) => {
    // FIX: Use getState to get fresh state values inside event handlers
    const { currentTool, selectedShapeIds, shapes, selectShape } = store.getState();

    if (currentTool !== "select") return;

    setIsDragging(true);

    // Auto-select if not already selected
    if (!selectedShapeIds.includes(shapeId)) {
      selectShape(shapeId, false);
    }

    const target = e.target;
    dragStartRef.current = { x: target.x(), y: target.y() };

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

    initialShapePositionsRef.current = positions;
  }, [store]);

  // FIX: Use batch update pattern to avoid re-renders during drag
  const handleShapeDragMove = useCallback((shapeId: string, e: any) => {
    const { currentTool } = store.getState();

    if (currentTool !== "select" || !isDragging || !dragStartRef.current) return;

    const target = e.target;
    const deltaX = target.x() - dragStartRef.current.x;
    const deltaY = target.y() - dragStartRef.current.y;

    // FIX: Use direct DOM manipulation during drag instead of state updates
    // Update the visual position of the shapes without updating state
    initialShapePositionsRef.current.forEach((initialPos, id) => {
      if (id !== shapeId) {
        // Find the Konva node and update it directly
        const node = e.target.getStage().findOne(`#${id}`);
        if (node) {
          node.x(initialPos.x + deltaX);
          node.y(initialPos.y + deltaY);
        }
      }
    });

    // No state updates during drag move - we'll do it all at once on drag end
  }, [isDragging, store]);

  // Update state only on drag end
  const handleShapeDragEnd = useCallback((shapeId: string, e: any) => {
    const { currentTool, updateShape, updateMultipleShapes, saveToHistory } = store.getState();

    if (currentTool !== "select" || !isDragging || !dragStartRef.current) return;

    const target = e.target;
    const deltaX = target.x() - dragStartRef.current.x;
    const deltaY = target.y() - dragStartRef.current.y;

    // Prepare updates for all dragged shapes
    const updates: { id: string; updates: any }[] = [];

    // Update all selected shapes
    initialShapePositionsRef.current.forEach((initialPos, id) => {
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

    // Update the dragged shape
    updateShape(shapeId, {
      x: target.x(),
      y: target.y(),
    });

    // Apply batch updates for other shapes
    if (updates.length > 0) {
      updateMultipleShapes(updates);
    }

    // Save to history once at the end
    saveToHistory();

    // Reset drag state
    setIsDragging(false);
    dragStartRef.current = null;
    initialShapePositionsRef.current.clear();
  }, [isDragging, store]);

  return {
    isDragging,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
  };
};
