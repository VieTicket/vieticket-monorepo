import { useCallback } from "react";
import {
  useCanvasStore,
  useAreaMode,
  useAreaActions,
} from "@/components/seat-map/store/main-store";

export interface DeletionContext {
  isInAreaMode: boolean;
  selectedShapeIds: string[];
  selectedRowIds: string[];
  selectedSeatIds: string[];
}

export interface DeletionHandlers {
  deleteSelectedShapes: () => void;
  deleteRow: (rowId: string) => string;
  deleteSeat: (seatId: string) => string;
  clearSelection: () => void;
  clearAreaSelections: () => void;
  saveToHistory: () => void;
}

export const useDeletionEvents = () => {
  const {
    selectedShapeIds,
    deleteSelectedShapes,
    clearSelection,
    saveToHistory,
  } = useCanvasStore();

  const { isInAreaMode, selectedRowIds, selectedSeatIds } = useAreaMode();
  const { deleteRow, deleteSeat, clearAreaSelections } = useAreaActions();

  const context: DeletionContext = {
    isInAreaMode,
    selectedShapeIds,
    selectedRowIds,
    selectedSeatIds,
  };

  const handlers: DeletionHandlers = {
    deleteSelectedShapes,
    deleteRow,
    deleteSeat,
    clearSelection,
    clearAreaSelections,
    saveToHistory,
  };

  const handleDelete = useCallback(() => {
    const deleted = processUnifiedDeletion(context, handlers);

    if (deleted.length > 0) {
      handlers.saveToHistory();
    }
  }, [context, handlers]);

  const handleDeleteKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      }
    },
    [handleDelete]
  );

  return {
    handleDelete,
    handleDeleteKey,
  };
};

// Helper Functions
const processUnifiedDeletion = (
  context: DeletionContext,
  handlers: DeletionHandlers
): string[] => {
  const deletedItems: string[] = [];

  if (context.isInAreaMode) {
    // Delete area items (seats and rows)
    deletedItems.push(...deleteAreaItems(context, handlers));
  } else {
    // Delete canvas shapes
    deletedItems.push(...deleteCanvasItems(context, handlers));
  }

  return deletedItems;
};

const deleteAreaItems = (
  context: DeletionContext,
  handlers: DeletionHandlers
): string[] => {
  const deletedItems: string[] = [];

  // Delete selected seats first
  context.selectedSeatIds.forEach((seatId) => {
    const deleted = handlers.deleteSeat(seatId);
    if (deleted) deletedItems.push(deleted);
  });

  // Delete selected rows
  context.selectedRowIds.forEach((rowId) => {
    const deleted = handlers.deleteRow(rowId);
    if (deleted) deletedItems.push(deleted);
  });

  // Clear area selections
  handlers.clearAreaSelections();

  return deletedItems;
};

const deleteCanvasItems = (
  context: DeletionContext,
  handlers: DeletionHandlers
): string[] => {
  const deletedItems: string[] = [];

  if (context.selectedShapeIds.length > 0) {
    // Store the IDs before deletion
    deletedItems.push(...context.selectedShapeIds);

    // Delete selected shapes
    handlers.deleteSelectedShapes();

    // Clear selection
    handlers.clearSelection();
  }

  return deletedItems;
};
