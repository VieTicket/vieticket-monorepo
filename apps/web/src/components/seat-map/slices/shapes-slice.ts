import { StateCreator } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  Shape,
  ShapeWithoutMeta,
  AnyShapeUpdate, // Use the more flexible type
} from "@/types/seat-map-types";

import type { HistorySlice } from "./history-slice";
import type { CanvasSlice } from "./canvas-slice";
import type { AreaSlice } from "./area-slice";

export interface ShapesSlice {
  shapes: Shape[];
  selectedShapeIds: string[];
  isEditing: boolean;
  editingShapeId: string | null;
  addShape: (shape: ShapeWithoutMeta) => void;
  // FIXED: Use the more flexible update type
  updateShape: (id: string, updates: AnyShapeUpdate) => void;
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
  syncAreaToShape: () => void;
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

  // FIXED: Use the more flexible update type
  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? { ...shape, ...updates } : shape
      ),
    }));

    // Sync with area mode if updating the zoomed area
    // const { zoomedArea, updateZoomedArea } = get();
    // if (zoomedArea && id === zoomedArea.id) {
    //   updateZoomedArea(updates);
    // }
  },

  syncAreaToShape: () => {
    // const { zoomedArea } = get();
    // if (zoomedArea) {
    //   // Update the main shape with area data
    //   set((state) => ({
    //     shapes: state.shapes.map((shape) =>
    //       shape.id === zoomedArea.id
    //         ? {
    //             ...shape,
    //             rows: zoomedArea.rows,
    //             seats: zoomedArea.seats,
    //           }
    //         : shape
    //     ),
    //   }));
    // }
  },

  deleteShape: (id) => {
    // const { exitAreaMode, zoomedArea } = get();

    // // If deleting the currently zoomed area, exit area mode
    // if (zoomedArea && id === zoomedArea.id) {
    //   exitAreaMode();
    // }

    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeIds: state.selectedShapeIds.filter(
        (selectedId) => selectedId !== id
      ),
    }));
  },

  deleteSelectedShapes: () => {
    const { selectedShapeIds } = get();

    // // Check if the zoomed area is being deleted
    // if (zoomedArea && selectedShapeIds.includes(zoomedArea.id)) {
    //   exitAreaMode();
    // }

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
    const { shapes } = get();
    const shape = shapes.find((s) => s.id === id);
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
    const { shapes } = get();
    return shapes.find((shape) => shape.id === id);
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
    const { shapes, selectedShapeIds } = get();
    const selectedShapes = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    );

    const newShapes: Shape[] = [];
    selectedShapes.forEach((shape) => {
      const duplicatedShape: Shape = {
        ...shape,
        id: uuidv4(),
        x: shape.x + 20,
        y: shape.y + 20,
      };
      newShapes.push(duplicatedShape);
    });

    set((state) => ({
      shapes: [...state.shapes, ...newShapes],
      selectedShapeIds: newShapes.map((s) => s.id),
    }));
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
