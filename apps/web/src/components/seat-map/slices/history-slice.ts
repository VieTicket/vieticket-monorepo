import { StateCreator } from "zustand";
import { Shape } from "@/types/seat-map-types";
import { ShapesSlice } from "./shapes-slice";
import { CanvasSlice } from "./canvas-slice";
import { AreaSlice } from "./area-slice";

const STORAGE_KEY = "canvas-editor-state";
let saveToStorageTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_DELAY = 1000; // 1 second debounce

// Helper function for debounced saving to session storage
const debouncedSaveToStorage = (stateToSave: any) => {
  // Clear any existing timeout
  if (saveToStorageTimeout) {
    clearTimeout(saveToStorageTimeout);
  }

  // Set a new timeout
  saveToStorageTimeout = setTimeout(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      console.log("Canvas state saved to session storage (debounced)");
    } catch (error) {
      console.error("Failed to save canvas state to session storage:", error);
    }
    saveToStorageTimeout = null;
  }, DEBOUNCE_DELAY);
};

export interface HistorySlice {
  history: Shape[][];
  historyIndex: number;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  loadFromStorage: () => boolean;
  clearStorage: () => void;
  forceStorageSave: () => void; // New method to force immediate save
}

export const createHistorySlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice & AreaSlice,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: [],
  historyIndex: -1,

  saveToHistory: () => {
    const { shapes, history, historyIndex, isInAreaMode, zoomedArea } = get();

    // Skip if we're just repeating the same state
    if (historyIndex >= 0) {
      const currentHistoryState = JSON.stringify(history[historyIndex]);
      const newState = JSON.stringify(shapes);
      if (currentHistoryState === newState) return;
    }

    // Create a clean copy of the shapes for history
    const cleanShapes = JSON.parse(JSON.stringify(shapes));

    // Create new history by removing future states (if any)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cleanShapes);

    // Limit history size to prevent memory issues
    const limitedHistory = newHistory.slice(-50);
    const newIndex = Math.min(newHistory.length - 1, 49);

    set({
      history: limitedHistory,
      historyIndex: newIndex,
    });

    // Use debounced save to session storage
    const stateToSave = {
      shapes: cleanShapes,
      historyIndex: newIndex,
      history: limitedHistory,
      timestamp: new Date().toISOString(),
    };

    debouncedSaveToStorage(stateToSave);
  },

  undo: () => {
    const { history, historyIndex, isInAreaMode } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousShapes = JSON.parse(JSON.stringify(history[newIndex]));

      // If in area mode, we need to maintain the zoomed area reference
      if (isInAreaMode) {
        const { zoomedArea } = get();
        const updatedZoomedArea = previousShapes.find(
          (shape: any) => shape.id === zoomedArea?.id
        );

        set({
          shapes: previousShapes,
          historyIndex: newIndex,
          selectedShapeIds: [],
          selectedRowIds: [],
          selectedSeatIds: [],
          zoomedArea: updatedZoomedArea || null,
        });
      } else {
        set({
          shapes: previousShapes,
          historyIndex: newIndex,
          selectedShapeIds: [],
        });
      }

      // Use debounced save for undo as well
      const stateToSave = {
        shapes: previousShapes,
        historyIndex: newIndex,
        history: history,
        isInAreaMode,
        zoomedAreaId: isInAreaMode ? get().zoomedArea?.id || null : null,
        timestamp: new Date().toISOString(),
      };

      debouncedSaveToStorage(stateToSave);
    }
  },

  redo: () => {
    const { history, historyIndex, isInAreaMode } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextShapes = JSON.parse(JSON.stringify(history[newIndex]));

      // If in area mode, we need to maintain the zoomed area reference
      if (isInAreaMode) {
        const { zoomedArea } = get();
        const updatedZoomedArea = nextShapes.find(
          (shape: any) => shape.id === zoomedArea?.id
        );

        set({
          shapes: nextShapes,
          historyIndex: newIndex,
          selectedShapeIds: [],
          selectedRowIds: [],
          selectedSeatIds: [],
          zoomedArea: updatedZoomedArea || null,
        });
      } else {
        set({
          shapes: nextShapes,
          historyIndex: newIndex,
          selectedShapeIds: [],
        });
      }

      // Use debounced save for redo as well
      const stateToSave = {
        shapes: nextShapes,
        historyIndex: newIndex,
        history: history,
        isInAreaMode,
        zoomedAreaId: isInAreaMode ? get().zoomedArea?.id || null : null,
        timestamp: new Date().toISOString(),
      };

      debouncedSaveToStorage(stateToSave);
    }
  },

  // Force an immediate save to storage - useful for critical operations
  forceStorageSave: () => {
    const { shapes, history, historyIndex, isInAreaMode, zoomedArea } = get();

    // Cancel any pending debounced save
    if (saveToStorageTimeout) {
      clearTimeout(saveToStorageTimeout);
      saveToStorageTimeout = null;
    }

    try {
      const stateToSave = {
        shapes,
        historyIndex,
        history,
        isInAreaMode,
        zoomedAreaId: zoomedArea?.id || null,
        timestamp: new Date().toISOString(),
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      console.log("Canvas state force-saved to session storage");
    } catch (error) {
      console.error(
        "Failed to force-save canvas state to session storage:",
        error
      );
    }
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // Function to load state from sessionStorage
  loadFromStorage: () => {
    try {
      const storedState = sessionStorage.getItem(STORAGE_KEY);

      if (!storedState) {
        return false;
      }

      const parsedState = JSON.parse(storedState);

      // Check if the stored state is valid and has shapes
      if (
        !parsedState ||
        !parsedState.shapes ||
        !Array.isArray(parsedState.shapes)
      ) {
        return false;
      }

      // Load the state into the store
      set({
        shapes: parsedState.shapes,
        history: parsedState.history || [parsedState.shapes],
        historyIndex: parsedState.historyIndex || 0,
        selectedShapeIds: [],
        selectedRowIds: [],
        selectedSeatIds: [],
      });

      return true;
    } catch (error) {
      console.error("Failed to load canvas state from session storage:", error);
      return false;
    }
  },

  // Function to clear sessionStorage
  clearStorage: () => {
    try {
      // Cancel any pending debounced save
      if (saveToStorageTimeout) {
        clearTimeout(saveToStorageTimeout);
        saveToStorageTimeout = null;
      }

      sessionStorage.removeItem(STORAGE_KEY);
      console.log("Canvas session storage cleared");
    } catch (error) {
      console.error("Failed to clear canvas session storage:", error);
    }
  },
});
