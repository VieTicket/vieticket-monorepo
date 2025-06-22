import { StateCreator } from "zustand";
import { Shape } from "@/types/seat-map-types";
import { ShapesSlice } from "./shapes-slice";
import { CanvasSlice } from "./canvas-slice";

export interface HistorySlice {
  history: Shape[][];
  historyIndex: number;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const createHistorySlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: [],
  historyIndex: -1,

  saveToHistory: () => {
    const { shapes, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(shapes)));

    set({
      history: newHistory.slice(-50),
      historyIndex: Math.min(newHistory.length - 1, 49),
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousShapes = JSON.parse(JSON.stringify(history[newIndex]));
      set({
        shapes: previousShapes,
        historyIndex: newIndex,
        selectedShapeIds: [],
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextShapes = JSON.parse(JSON.stringify(history[newIndex]));
      set({
        shapes: nextShapes,
        historyIndex: newIndex,
        selectedShapeIds: [],
      });
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
});
