import { create } from "zustand";
import { CanvasItem } from "../types";
import { isEqual } from "lodash";

export interface UndoRedoAction {
  id: string;
  timestamp: number;
  data: {
    before: {
      shapes?: CanvasItem[]; // Only affected shapes
      selectedShapes?: CanvasItem[];
      affectedIds?: string[]; // IDs of shapes that were affected
    };
    after: {
      shapes?: CanvasItem[]; // Only affected shapes
      selectedShapes?: CanvasItem[];
      affectedIds?: string[]; // IDs of shapes that were affected
    };
  };
}

/**
 * Custom cloning function that excludes non-serializable properties
 * like functions, graphics objects, event handlers, etc.
 */
const cloneCanvasItem = (item: CanvasItem): CanvasItem => {
  const cloned = {} as CanvasItem;

  for (const [key, value] of Object.entries(item)) {
    // Skip functions, graphics objects, and other non-serializable properties
    if (
      typeof value === "function" ||
      key === "graphics" ||
      key === "container" ||
      key === "sprite" ||
      key === "texture" ||
      key === "_bounds" ||
      key === "_mask" ||
      key === "parent" ||
      key === "children" ||
      key === "filters" ||
      key === "hitArea" ||
      key === "cursor" ||
      (typeof value === "object" &&
        value !== null &&
        (value.constructor?.name?.includes("PIXI") ||
          value.constructor?.name?.includes("Graphics") ||
          value.constructor?.name?.includes("Container") ||
          value.constructor?.name?.includes("Sprite")))
    ) {
      continue;
    }

    // Clone arrays and objects recursively, but only simple ones
    if (Array.isArray(value)) {
      (cloned as any)[key] = value.map((item) =>
        typeof item === "object" && item !== null ? { ...item } : item
      );
    } else if (typeof value === "object" && value !== null) {
      // Only clone plain objects
      if (value.constructor === Object) {
        (cloned as any)[key] = { ...value };
      }
    } else {
      // Clone primitive values
      (cloned as any)[key] = value;
    }
  }

  return cloned;
};

/**
 * Clone an array of CanvasItems safely
 */
const cloneCanvasItems = (items: CanvasItem[]): CanvasItem[] => {
  return items.map(cloneCanvasItem);
};

interface SeatMapStore {
  // Current state
  shapes: CanvasItem[];
  selectedShapes: CanvasItem[];

  // History state
  historyStack: UndoRedoAction[];
  currentHistoryIndex: number;
  maxHistorySize: number;

  // Shape operations (with built-in history)
  updateShapes: (newShapes: CanvasItem[], saveHistory?: boolean) => void;
  setSelectedShapes: (shapes: CanvasItem[], saveHistory?: boolean) => void;
  deleteShape: (shapeId: string) => void;
  deleteShapes: () => void;
  addShape: (shape: CanvasItem) => void;
  modifyShapes: (shapesToModify: CanvasItem[]) => void;

  // History operations
  undo: () => UndoRedoAction | null;
  redo: () => UndoRedoAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // Internal history helpers
  _saveToHistory: (
    beforeState: Partial<{
      shapes: CanvasItem[];
      selectedShapes: CanvasItem[];
    }>,
    afterState?: Partial<{ shapes: CanvasItem[]; selectedShapes: CanvasItem[] }>
  ) => void;
  _getShapesByIds: (ids: string[]) => CanvasItem[];
  _findAffectedShapes: (
    oldShapes: CanvasItem[],
    newShapes: CanvasItem[]
  ) => { before: CanvasItem[]; after: CanvasItem[]; affectedIds: string[] };
}

export const useSeatMapStore = create<SeatMapStore>((set, get) => ({
  // Current state
  shapes: [],
  selectedShapes: [],

  // History state
  historyStack: [],
  currentHistoryIndex: -1,
  maxHistorySize: 50,

  // ✅ Optimized shape operations with delta-based history
  updateShapes: (newShapes: CanvasItem[], saveHistory: boolean = true) => {
    if (saveHistory) {
      const currentShapes = get().shapes;
      const currentSelected = get().selectedShapes;

      // Find only the shapes that actually changed
      const { before, after, affectedIds } = get()._findAffectedShapes(
        currentShapes,
        newShapes
      );

      // Only save history if something actually changed
      if (affectedIds.length > 0) {
        get()._saveToHistory(
          { shapes: before, selectedShapes: currentSelected },
          { shapes: after, selectedShapes: currentSelected }
        );
      }
    }
    set({ shapes: [...newShapes] });
  },

  setSelectedShapes: (shapes: CanvasItem[], saveHistory: boolean = false) => {
    const currentSelected = get().selectedShapes;

    // Only save to history if selection actually changed and saveHistory is true
    if (saveHistory && !isEqual(currentSelected, shapes)) {
      get()._saveToHistory(
        { selectedShapes: currentSelected },
        { selectedShapes: shapes }
      );
    }

    set({ selectedShapes: shapes });
  },

  deleteShape: (shapeId: string) => {
    const currentShapes = get().shapes;
    const shapeToDelete = currentShapes.find((s) => s.id === shapeId);

    if (!shapeToDelete) return;

    // Save only the deleted shape to history
    get()._saveToHistory({ shapes: [shapeToDelete] }, { shapes: [] });

    const shapes = currentShapes.filter((shape) => shape.id !== shapeId);
    const selectedShapes = get().selectedShapes.filter(
      (shape) => shape.id !== shapeId
    );
    set({ shapes, selectedShapes: [...selectedShapes] });
  },

  deleteShapes: () => {
    const currentShapes = get().shapes;
    const currentSelected = get().selectedShapes;
    const shapesToDelete = currentShapes.filter((shape) => shape.selected);

    if (shapesToDelete.length === 0) return;

    // Save only the deleted shapes to history
    get()._saveToHistory(
      { shapes: shapesToDelete, selectedShapes: currentSelected },
      { shapes: [], selectedShapes: [] }
    );

    const remainingShapes = currentShapes.filter((shape) => !shape.selected);
    set({ shapes: remainingShapes, selectedShapes: [] });
  },

  addShape: (shape: CanvasItem) => {
    const currentShapes = get().shapes;

    // Save only the new shape to history
    get()._saveToHistory({ shapes: [] }, { shapes: [shape] });

    set({ shapes: [...currentShapes, shape] });
  },

  modifyShapes: (shapesToModify: CanvasItem[]) => {
    const currentShapes = get().shapes;
    const beforeShapes = shapesToModify
      .map((modifiedShape) => {
        return currentShapes.find((s) => s.id === modifiedShape.id);
      })
      .filter(Boolean) as CanvasItem[];

    // Save only the modified shapes to history
    get()._saveToHistory(
      { shapes: cloneCanvasItems(beforeShapes) },
      { shapes: cloneCanvasItems(shapesToModify) }
    );

    // Apply modifications
    const updatedShapes = currentShapes.map((shape) => {
      const modifiedShape = shapesToModify.find((m) => m.id === shape.id);
      return modifiedShape || shape;
    });

    set({ shapes: updatedShapes });
  },

  // ✅ History operations
  undo: () => {
    const { historyStack, currentHistoryIndex } = get();

    if (currentHistoryIndex < 0) {
      return null;
    }

    const actionToUndo = historyStack[currentHistoryIndex];
    const newIndex = currentHistoryIndex - 1;

    set({ currentHistoryIndex: newIndex });

    return actionToUndo;
  },

  redo: () => {
    const { historyStack, currentHistoryIndex } = get();

    if (currentHistoryIndex >= historyStack.length - 1) {
      return null;
    }

    const newIndex = currentHistoryIndex + 1;
    const actionToRedo = historyStack[newIndex];

    set({ currentHistoryIndex: newIndex });

    return actionToRedo;
  },

  canUndo: () => {
    const { currentHistoryIndex } = get();
    return currentHistoryIndex >= 0;
  },

  canRedo: () => {
    const { historyStack, currentHistoryIndex } = get();
    return currentHistoryIndex < historyStack.length - 1;
  },

  clearHistory: () => {
    set({
      historyStack: [],
      currentHistoryIndex: -1,
    });
  },

  // ✅ Internal helpers for delta-based history
  _saveToHistory: (
    beforeState: Partial<{
      shapes: CanvasItem[];
      selectedShapes: CanvasItem[];
    }>,
    afterState?: Partial<{ shapes: CanvasItem[]; selectedShapes: CanvasItem[] }>
  ) => {
    const {
      shapes: currentShapes,
      selectedShapes: currentSelected,
      historyStack,
      currentHistoryIndex,
      maxHistorySize,
    } = get();

    const finalAfterState = afterState || {
      shapes: currentShapes,
      selectedShapes: currentSelected,
    };

    const newAction: UndoRedoAction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        before: {
          shapes: beforeState.shapes
            ? cloneCanvasItems(beforeState.shapes)
            : undefined,
          selectedShapes: beforeState.selectedShapes
            ? cloneCanvasItems(beforeState.selectedShapes)
            : undefined,
          affectedIds: beforeState.shapes?.map((s) => s.id) || [],
        },
        after: {
          shapes: finalAfterState.shapes
            ? cloneCanvasItems(finalAfterState.shapes)
            : undefined,
          selectedShapes: finalAfterState.selectedShapes
            ? cloneCanvasItems(finalAfterState.selectedShapes)
            : undefined,
          affectedIds: finalAfterState.shapes?.map((s) => s.id) || [],
        },
      },
    };

    // Remove any actions after current index (if user did undo then new action)
    const newStack = historyStack.slice(0, currentHistoryIndex + 1);

    // Add new action
    newStack.push(newAction);

    // Limit history size
    if (newStack.length > maxHistorySize) {
      newStack.shift();
      set({
        historyStack: newStack,
        currentHistoryIndex: newStack.length - 1,
      });
    } else {
      set({
        historyStack: newStack,
        currentHistoryIndex: newStack.length - 1,
      });
    }
  },

  _getShapesByIds: (ids: string[]) => {
    const currentShapes = get().shapes;
    return ids
      .map((id) => currentShapes.find((s) => s.id === id))
      .filter(Boolean) as CanvasItem[];
  },

  _findAffectedShapes: (oldShapes: CanvasItem[], newShapes: CanvasItem[]) => {
    const before: CanvasItem[] = [];
    const after: CanvasItem[] = [];
    const affectedIds: string[] = [];

    // Find modified or deleted shapes
    oldShapes.forEach((oldShape) => {
      const newShape = newShapes.find((s) => s.id === oldShape.id);
      if (!newShape) {
        // Shape was deleted
        before.push(oldShape);
        affectedIds.push(oldShape.id);
      } else if (
        !isEqual(cloneCanvasItem(oldShape), cloneCanvasItem(newShape))
      ) {
        // Compare cloned versions to avoid function comparison issues
        before.push(oldShape);
        after.push(newShape);
        affectedIds.push(oldShape.id);
      }
    });

    // Find new shapes
    newShapes.forEach((newShape) => {
      const oldShape = oldShapes.find((s) => s.id === newShape.id);
      if (!oldShape) {
        // Shape was added
        after.push(newShape);
        affectedIds.push(newShape.id);
      }
    });

    return { before, after, affectedIds };
  },
}));
