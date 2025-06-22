import { StateCreator } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Shape, ShapeType, CreateShapeData } from "@/types/seat-map-types";
import { HistorySlice } from "./history-slice";
import { CanvasSlice } from "./canvas-slice";

export interface ShapesSlice {
  shapes: Shape[];
  selectedShapeIds: string[];
  addShape: <T extends ShapeType>(shape: CreateShapeData<T>) => void;
  updateShape: (
    id: string,
    updates: Partial<Omit<Shape, "id" | "type">>
  ) => void;
  deleteShape: (id: string) => void;
  deleteSelectedShapes: () => void;
  selectShape: (id: string, multiSelect?: boolean) => void;
  selectMultipleShapes: (shapeIds: string[]) => void;
  clearSelection: () => void;
  moveShape: (id: string, x: number, y: number) => void;
  duplicateShape: (id: string) => void;
  getShapeById: (id: string) => Shape | undefined;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
}

export const createShapesSlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice,
  [],
  [],
  ShapesSlice
> = (set, get) => ({
  shapes: [],
  selectedShapeIds: [],

  addShape: <T extends ShapeType>(shapeData: CreateShapeData<T>) => {
    const newShape: Shape = {
      ...shapeData,
      id: uuidv4(),
      draggable: true,
      visible: true,
    } as Shape;

    set((state) => ({
      shapes: [...state.shapes, newShape],
      selectedShapeIds: [newShape.id],
    }));
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    }));
  },

  deleteShape: (id) => {
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeIds: state.selectedShapeIds.filter(
        (selectedId) => selectedId !== id
      ),
    }));
  },

  deleteSelectedShapes: () => {
    const { selectedShapeIds } = get();
    set((state) => ({
      shapes: state.shapes.filter(
        (shape) => !selectedShapeIds.includes(shape.id)
      ),
      selectedShapeIds: [],
    }));
  },

  selectShape: (id, multiSelect = false) => {
    set((state) => {
      if (multiSelect) {
        const isSelected = state.selectedShapeIds.includes(id);
        return {
          selectedShapeIds: isSelected
            ? state.selectedShapeIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedShapeIds, id],
        };
      } else {
        return {
          selectedShapeIds: [id],
        };
      }
    });
  },

  selectMultipleShapes: (shapeIds: string[]) => {
    set({ selectedShapeIds: shapeIds });
  },

  clearSelection: () => {
    set({ selectedShapeIds: [] });
  },

  moveShape: (id, x, y) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, x, y } : shape
      ),
    }));
  },

  duplicateShape: (id) => {
    const shape = get().shapes.find((s) => s.id === id);
    if (shape) {
      const duplicatedShape: Shape = {
        ...shape,
        id: uuidv4(),
        x: shape.x + 20,
        y: shape.y + 20,
      };

      set((state) => ({
        shapes: [...state.shapes, duplicatedShape],
        selectedShapeIds: [duplicatedShape.id],
      }));
    }
  },

  getShapeById: (id) => {
    return get().shapes.find((shape) => shape.id === id);
  },

  bringToFront: (id) => {
    set((state) => {
      const shape = state.shapes.find((s) => s.id === id);
      if (shape) {
        const otherShapes = state.shapes.filter((s) => s.id !== id);
        return {
          shapes: [...otherShapes, shape],
        };
      }
      return state;
    });
  },

  sendToBack: (id) => {
    set((state) => {
      const shape = state.shapes.find((s) => s.id === id);
      if (shape) {
        const otherShapes = state.shapes.filter((s) => s.id !== id);
        return {
          shapes: [shape, ...otherShapes],
        };
      }
      return state;
    });
  },
});
