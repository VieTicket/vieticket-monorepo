import { useState, useCallback, useRef } from "react";
import {
  useCanvasStore,
  useAreaMode,
  useAreaActions,
} from "@/components/seat-map/store/main-store";

export interface DragContext {
  isInAreaMode: boolean;
  currentTool: string;
  selectedShapeIds: string[];
  selectedRowIds: string[];
  selectedSeatIds: string[];
  shapes: any[];
  zoomedArea: any;
}

export interface DragHandlers {
  updateShape: (id: string, updates: any) => void;
  updateMultipleShapes: (updates: { id: string; updates: any }[]) => void;
  updateRow: (id: string, updates: any) => void;
  updateSeat: (id: string, updates: any) => void;
  selectShape: (id: string, multiSelect: boolean) => void;
  selectRow: (id: string, multiSelect: boolean) => void;
  selectSeat: (id: string, multiSelect: boolean) => void;
  saveToHistory: () => void;
}

export const useDragEvents = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<"shape" | "row" | "seat" | null>(
    null
  );
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  );

  const {
    currentTool,
    selectedShapeIds,
    shapes,
    updateShape,
    updateMultipleShapes,
    selectShape,
    saveToHistory,
  } = useCanvasStore();

  const { isInAreaMode, zoomedArea, selectedRowIds, selectedSeatIds } =
    useAreaMode();
  const { updateRow, updateSeat, selectRow, selectSeat } = useAreaActions();

  const context: DragContext = {
    isInAreaMode,
    currentTool,
    selectedShapeIds,
    selectedRowIds,
    selectedSeatIds,
    shapes,
    zoomedArea,
  };

  const handlers: DragHandlers = {
    updateShape,
    updateMultipleShapes,
    updateRow,
    updateSeat,
    selectShape,
    selectRow,
    selectSeat,
    saveToHistory,
  };

  const handleDragStart = useCallback(
    (itemId: string, itemType: "shape" | "row" | "seat", e: any) => {
      if (context.currentTool !== "select") return;

      setIsDragging(true);
      setDragType(itemType);

      const target = e.target;
      dragStartRef.current = { x: target.x(), y: target.y() };

      // Auto-select and store initial positions
      const positions = processInitialPositions(
        itemId,
        itemType,
        context,
        handlers
      );
      initialPositionsRef.current = positions;
    },
    [context, handlers]
  );

  const handleDragMove = useCallback(
    (itemId: string, e: any) => {
      if (
        !isDragging ||
        !dragStartRef.current ||
        context.currentTool !== "select"
      )
        return;

      const target = e.target;
      const deltaX = target.x() - dragStartRef.current.x;
      const deltaY = target.y() - dragStartRef.current.y;

      // Update visual positions without state changes during drag
      updateVisualPositions(
        itemId,
        deltaX,
        deltaY,
        dragType!,
        initialPositionsRef.current,
        e
      );
    },
    [isDragging, dragType, context.currentTool]
  );

  const handleDragEnd = useCallback(
    (itemId: string, e: any) => {
      if (
        !isDragging ||
        !dragStartRef.current ||
        context.currentTool !== "select"
      )
        return;

      const target = e.target;
      const deltaX = target.x() - dragStartRef.current.x;
      const deltaY = target.y() - dragStartRef.current.y;

      // Apply final state updates
      applyFinalUpdates(
        itemId,
        deltaX,
        deltaY,
        dragType!,
        initialPositionsRef.current,
        handlers
      );

      // Save to history
      handlers.saveToHistory();

      // Reset drag state
      resetDragState();
    },
    [isDragging, dragType, context.currentTool, handlers]
  );

  const resetDragState = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    dragStartRef.current = null;
    initialPositionsRef.current.clear();
  }, []);

  return {
    isDragging,
    dragType,
    handleShapeDragStart: (shapeId: string, e: any) =>
      handleDragStart(shapeId, "shape", e),
    handleShapeDragMove: (shapeId: string, e: any) =>
      handleDragMove(shapeId, e),
    handleShapeDragEnd: (shapeId: string, e: any) => handleDragEnd(shapeId, e),
    handleRowDragStart: (rowId: string, e: any) =>
      handleDragStart(rowId, "row", e),
    handleRowDragMove: (rowId: string, e: any) => handleDragMove(rowId, e),
    handleRowDragEnd: (rowId: string, e: any) => handleDragEnd(rowId, e),
    handleSeatDragStart: (seatId: string, e: any) =>
      handleDragStart(seatId, "seat", e),
    handleSeatDragMove: (seatId: string, e: any) => handleDragMove(seatId, e),
    handleSeatDragEnd: (seatId: string, e: any) => handleDragEnd(seatId, e),
  };
};

// Helper Functions
const processInitialPositions = (
  itemId: string,
  itemType: "shape" | "row" | "seat",
  context: DragContext,
  handlers: DragHandlers
): Map<string, { x: number; y: number }> => {
  const positions = new Map();

  switch (itemType) {
    case "shape":
      if (!context.selectedShapeIds.includes(itemId)) {
        handlers.selectShape(itemId, false);
      }
      const selectedIds = context.selectedShapeIds.includes(itemId)
        ? context.selectedShapeIds
        : [itemId];

      selectedIds.forEach((id) => {
        const shape = context.shapes.find((s) => s.id === id);
        if (shape) {
          positions.set(id, { x: shape.x, y: shape.y });
        }
      });
      break;

    case "row":
      if (!context.selectedRowIds.includes(itemId)) {
        handlers.selectRow(itemId, false);
      }
      const selectedRowIds = context.selectedRowIds.includes(itemId)
        ? context.selectedRowIds
        : [itemId];

      selectedRowIds.forEach((id) => {
        const row = context.zoomedArea?.rows?.find((r: any) => r.id === id);
        if (row) {
          positions.set(id, { x: row.startX || 0, y: row.startY || 0 });
        }
      });
      break;

    case "seat":
      if (!context.selectedSeatIds.includes(itemId)) {
        handlers.selectSeat(itemId, false);
      }
      const selectedSeatIds = context.selectedSeatIds.includes(itemId)
        ? context.selectedSeatIds
        : [itemId];

      selectedSeatIds.forEach((id) => {
        const seat = findSeatById(id, context.zoomedArea);
        if (seat) {
          positions.set(id, { x: seat.x, y: seat.y });
        }
      });
      break;
  }

  return positions;
};

const updateVisualPositions = (
  itemId: string,
  deltaX: number,
  deltaY: number,
  dragType: "shape" | "row" | "seat",
  initialPositions: Map<string, { x: number; y: number }>,
  e: any
) => {
  initialPositions.forEach((initialPos, id) => {
    if (id !== itemId) {
      const node = e.target.getStage().findOne(`#${id}`);
      if (node) {
        node.x(initialPos.x + deltaX);
        node.y(initialPos.y + deltaY);
      }
    }
  });
};

const applyFinalUpdates = (
  itemId: string,
  deltaX: number,
  deltaY: number,
  dragType: "shape" | "row" | "seat",
  initialPositions: Map<string, { x: number; y: number }>,
  handlers: DragHandlers
) => {
  const updates: { id: string; updates: any }[] = [];

  switch (dragType) {
    case "shape":
      initialPositions.forEach((initialPos, id) => {
        if (id !== itemId) {
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
      handlers.updateShape(itemId, {
        x: initialPositions.get(itemId)!.x + deltaX,
        y: initialPositions.get(itemId)!.y + deltaY,
      });

      if (updates.length > 0) {
        handlers.updateMultipleShapes(updates);
      }
      break;

    case "row":
      initialPositions.forEach((initialPos, id) => {
        handlers.updateRow(id, {
          startX: initialPos.x + deltaX,
          startY: initialPos.y + deltaY,
        });
      });
      break;

    case "seat":
      initialPositions.forEach((initialPos, id) => {
        handlers.updateSeat(id, {
          x: initialPos.x + deltaX,
          y: initialPos.y + deltaY,
        });
      });
      break;
  }
};

const findSeatById = (seatId: string, zoomedArea: any) => {
  if (!zoomedArea?.rows) return null;

  for (const row of zoomedArea.rows) {
    const seat = row.seats?.find((s: any) => s.id === seatId);
    if (seat) return seat;
  }
  return null;
};
