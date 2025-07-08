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
  updateRowPosition: (id: string, deltaX: number, deltaY: number) => void;
  updateMultipleRowPositions: (
    updates: { rowId: string; deltaX: number; deltaY: number }[]
  ) => void;
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
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
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
  const {
    updateRow,
    updateSeat,
    updateRowPosition,
    updateMultipleRowPositions,
    selectRow,
    selectSeat,
  } = useAreaActions();

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
    updateRowPosition,
    updateMultipleRowPositions,
    selectShape,
    selectRow,
    selectSeat,
    saveToHistory,
  };

  const handleDragStart = useCallback(
    (itemId: string, itemType: "shape" | "row" | "seat", e: any) => {
      if (context.currentTool !== "select") {
        return;
      }

      // FIX: Block seat dragging completely in area mode
      if (itemType === "seat" && context.isInAreaMode) {
        e.cancelBubble = true;
        return;
      }

      // FIX: Only allow row dragging in area mode
      if (itemType === "row" && !context.isInAreaMode) {
        return;
      }

      setIsDragging(true);
      setDragType(itemType);
      setDraggedItemId(itemId);

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
      if (!isDragging || !dragStartRef.current || draggedItemId !== itemId) {
        return;
      }

      const target = e.target;
      const deltaX = target.x() - dragStartRef.current.x;
      const deltaY = target.y() - dragStartRef.current.y;

      // FIX: Don't update visual positions during drag for rows
      // The Konva Group will handle the visual updates automatically
      if (dragType === "row") {
        updateOtherRowVisualPositions(
          itemId,
          deltaX,
          deltaY,
          initialPositionsRef.current,
          e,
          context
        );
      } else {
        updateVisualPositions(
          itemId,
          deltaX,
          deltaY,
          dragType!,
          initialPositionsRef.current,
          e
        );
      }
    },
    [isDragging, draggedItemId, dragType, context]
  );

  const handleDragEnd = useCallback(
    (itemId: string, e: any) => {
      if (!isDragging || !dragStartRef.current || draggedItemId !== itemId) {
        return;
      }

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
        handlers,
        context
      );

      // Save to history
      handlers.saveToHistory();

      // Reset drag state
      resetDragState();
    },
    [isDragging, draggedItemId, dragType, context, handlers]
  );

  const resetDragState = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
    setDraggedItemId(null);
    dragStartRef.current = null;
    initialPositionsRef.current.clear();
  }, []);

  return {
    isDragging,
    dragType,
    draggedItemId,
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
    resetDragState,
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
      // FIX: Auto-select row if not selected
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
      // FIX: Block seat dragging in area mode
      if (context.isInAreaMode) {
        return positions;
      }

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

// FIX: Update only other selected rows, not the seats within them
const updateOtherRowVisualPositions = (
  itemId: string,
  deltaX: number,
  deltaY: number,
  initialPositions: Map<string, { x: number; y: number }>,
  e: any,
  context: DragContext
) => {
  const stage = e.target.getStage();

  initialPositions.forEach((initialPos, rowId) => {
    if (rowId !== itemId) {
      // Only update other selected rows visually
      const rowNode = stage.findOne(`#row-${rowId}`);
      if (rowNode) {
        rowNode.x(initialPos.x + deltaX);
        rowNode.y(initialPos.y + deltaY);
      }
    }
    // FIX: Don't update individual seat positions during drag
    // They will move with their parent row group automatically
  });
};

// FIX: Keep the original updateRowVisualPositions but remove seat updates
const updateRowVisualPositions = (
  itemId: string,
  deltaX: number,
  deltaY: number,
  initialPositions: Map<string, { x: number; y: number }>,
  e: any,
  context: DragContext
) => {
  // FIX: Use the new function instead
  updateOtherRowVisualPositions(
    itemId,
    deltaX,
    deltaY,
    initialPositions,
    e,
    context
  );
};

const updateVisualPositions = (
  itemId: string,
  deltaX: number,
  deltaY: number,
  dragType: "shape" | "row" | "seat",
  initialPositions: Map<string, { x: number; y: number }>,
  e: any
) => {
  const stage = e.target.getStage();

  initialPositions.forEach((initialPos, id) => {
    if (id !== itemId) {
      const node = stage.findOne(`#${id}`);
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
  handlers: DragHandlers,
  context: DragContext
) => {
  switch (dragType) {
    case "shape":
      const updates: { id: string; updates: any }[] = [];

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
      // FIX: Use proper row position update methods
      const rowUpdates = Array.from(initialPositions.keys()).map((rowId) => ({
        rowId,
        deltaX,
        deltaY,
      }));

      if (rowUpdates.length === 1) {
        handlers.updateRowPosition(itemId, deltaX, deltaY);
      } else {
        handlers.updateMultipleRowPositions(rowUpdates);
      }
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
