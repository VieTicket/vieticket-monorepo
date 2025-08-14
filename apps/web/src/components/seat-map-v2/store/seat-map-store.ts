import { create } from "zustand";
import { CanvasItem } from "../types";

interface SeatMapStore {
  shapes: CanvasItem[];
  selectedShapes: CanvasItem[];
  updateShapes: (newShapes: CanvasItem[]) => void;
  setSelectedShapes: (shapes: CanvasItem[]) => void;
  deleteShape: (shapeId: string) => void;
  deleteShapes: () => void;
}

export const useSeatMapStore = create<SeatMapStore>((set, get) => ({
  shapes: [],
  selectedShapes: [],

  updateShapes: (newShapes: CanvasItem[]) => {
    set({ shapes: [...newShapes] });
  },

  setSelectedShapes: (shapes: CanvasItem[]) => {
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
