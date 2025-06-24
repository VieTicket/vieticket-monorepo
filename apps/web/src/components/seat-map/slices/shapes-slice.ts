import { StateCreator } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  Shape,
  ShapeType,
  CreateShapeData,
  ShapeWithoutMeta,
} from "@/types/seat-map-types";
import { HistorySlice } from "./history-slice";
import { CanvasSlice } from "./canvas-slice";

export interface ShapesSlice {
  shapes: Shape[];
  selectedShapeIds: string[];
  isEditing: boolean;
  editingShapeId: string | null;
  addShape: (shape: ShapeWithoutMeta) => void;
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
  selectAll: () => void;
  duplicateSelectedShapes: () => void;
  startEditing: (shapeId: string) => void;
  stopEditing: () => void;
  isShapeEditing: (shapeId: string) => boolean;
}

export const createShapesSlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice,
  [],
  [],
  ShapesSlice
> = (set, get) => ({
  shapes: [],
  selectedShapeIds: [],
  isEditing: false,
  editingShapeId: null,

  addShape: (shapeData) => {
    const newShape: Shape = {
      id: uuidv4(),
      visible: true,
      draggable: true,
      ...shapeData,
    };

    set((state) => ({
      shapes: [...state.shapes, newShape],
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

  selectAll: () => {
    const { shapes } = get();
    const allShapeIds = shapes.map((shape) => shape.id);
    set({ selectedShapeIds: allShapeIds });
  },

  duplicateSelectedShapes: () => {
    const { shapes, selectedShapeIds, addShape } = get();
    const selectedShapes = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    );

    const newShapeIds: string[] = [];

    selectedShapes.forEach((shape) => {
      const duplicatedShape = {
        ...shape,
        x: shape.x + 20, // Offset the duplicate
        y: shape.y + 20,
        id: undefined, // Let addShape generate new ID
      };

      // Remove the id so addShape can generate a new one
      delete (duplicatedShape as any).id;

      addShape(duplicatedShape);
      // You'd need to capture the new ID if you want to select the duplicates
    });
  },
  startEditing: (shapeId: string) => {
    set({
      isEditing: true,
      editingShapeId: shapeId,
    });
  },

  stopEditing: () => {
    set({
      isEditing: false,
      editingShapeId: null,
    });
  },

  isShapeEditing: (shapeId: string) => {
    const { isEditing, editingShapeId } = get();
    return isEditing && editingShapeId === shapeId;
  },
});
