import { create } from "zustand";
import { PixiShape } from "../types";

interface SeatMapStore {
  shapes: PixiShape[];
  selectedShapes: PixiShape[];
  updateShapes: (newShapes: PixiShape[]) => void;
  setSelectedShapes: (shapes: PixiShape[]) => void;
  deleteShape: (shapeId: string) => void;
  deleteShapes: () => void;
}

export const useSeatMapStore = create<SeatMapStore>((set, get) => ({
  shapes: [],
  selectedShapes: [],

  updateShapes: (newShapes: PixiShape[]) => {
    set({ shapes: [...newShapes] });
  },

  setSelectedShapes: (shapes: PixiShape[]) => {
    set({ selectedShapes: shapes });
  },

  deleteShape: (shapeId: string) => {
    const shapes = get().shapes.filter((shape) => shape.id !== shapeId);
    const selectedShapes = get().selectedShapes.filter(
      (shape) => shape.id !== shapeId
    );
    set({ shapes, selectedShapes: [...selectedShapes] });
  },

  deleteShapes: () => {
    const shapes = get().shapes.filter((shape) => !shape.selected);
    set({ shapes, selectedShapes: [] });
  },
}));
