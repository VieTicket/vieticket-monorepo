import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createShapesSlice } from "../slices/shapes-slice";
import { createHistorySlice } from "../slices/history-slice";
import { createCanvasSlice } from "../slices/canvas-slice";

import type { ShapesSlice } from "../slices/shapes-slice";
import type { HistorySlice } from "../slices/history-slice";
import type { CanvasSlice } from "../slices/canvas-slice";

type CanvasStore = ShapesSlice & HistorySlice & CanvasSlice;

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (...args) => ({
      ...createShapesSlice(...args),
      ...createHistorySlice(...args),
      ...createCanvasSlice(...args),
    }),
    {
      name: "canvas-store",
    }
  )
);

// Selector hooks for better performance
export const useShapes = () => useCanvasStore((state) => state.shapes);
export const useSelectedShapes = () =>
  useCanvasStore((state) => state.selectedShapeIds);
export const useCanvasActions = () =>
  useCanvasStore((state) => ({
    addShape: state.addShape,
    updateShape: state.updateShape,
    deleteShape: state.deleteShape,
    selectShape: state.selectShape,
    clearSelection: state.clearSelection,
    moveShape: state.moveShape,
    duplicateShape: state.duplicateShape,
  }));
