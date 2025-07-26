import { StateCreator } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  Shape,
  ShapeWithoutMeta,
  AnyShapeUpdate,
  PolygonShape, // Use the more flexible type
} from "@/types/seat-map-types";

import type { HistorySlice } from "./history-slice";
import type { CanvasSlice } from "./canvas-slice";
import type { AreaSlice } from "./area-slice";
import { calculatePolygonCenter } from "../utils/polygon-utils";

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

    if (newShape.type === "polygon") {
      const polygonShape = newShape as PolygonShape;
      if (polygonShape.points && !polygonShape.center) {
        polygonShape.center = calculatePolygonCenter(polygonShape.points);
      }
    }

    set((state) => ({
      shapes: [...state.shapes, newShape],
    }));
    get().saveToHistory();
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        if (shape.id === id) {
          if (shape.type === "polygon") {
            const polygonShape = shape as PolygonShape;

            // If this is a drag operation (x, y changes), update center instead
            if (
              updates.x !== undefined &&
              updates.y !== undefined &&
              !updates.points &&
              !updates.center
            ) {
              const deltaX = (updates.x || 0) - (shape.x || 0);
              const deltaY = (updates.y || 0) - (shape.y || 0);

              return {
                ...shape,
                center: {
                  x: polygonShape.center.x + deltaX,
                  y: polygonShape.center.y + deltaY,
                },
                // Keep the original x, y for compatibility but don't change points
                x: updates.x || shape.x,
                y: updates.y || shape.y,
              };
            }
            if (updates.x !== undefined || updates.y !== undefined) {
              polygonShape.points = polygonShape.points.map((point) => ({
                x:
                  point.x +
                  (updates.x || polygonShape.x) -
                  (polygonShape.x || 0) +
                  polygonShape.x,
                y:
                  point.y +
                  (updates.y || polygonShape.y) -
                  (polygonShape.y || 0) +
                  polygonShape.y,
              }));
              polygonShape.x = 0;
              polygonShape.y = 0;

              return {
                ...polygonShape,
                center: calculatePolygonCenter(polygonShape.points),
              };
            }
          }

          return { ...shape, ...updates };
        }
        return shape;
      }),
    }));
    get().saveToHistory();
  },

  deleteShape: (id) => {
    set((state) => ({
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeIds: state.selectedShapeIds.filter(
        (selectedId) => selectedId !== id
      ),
    }));
    get().saveToHistory();
  },

  deleteSelectedShapes: () => {
    const { selectedShapeIds } = get();
    set((state) => ({
      shapes: state.shapes.filter(
        (shape) => !selectedShapeIds.includes(shape.id)
      ),
      selectedShapeIds: [],
    }));
    get().saveToHistory();
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
    get().saveToHistory();
  },

  duplicateShape: (id) => {
    const { shapes } = get();
    const shape = shapes.find((s) => s.id === id);
    if (shape) {
      const duplicatedShape: Shape = {
        ...shape,
        id: uuidv4(),
      };

      // FIX: Special handling for polygon shapes - offset points, not center
      if (shape.type === "polygon") {
        const polygonShape = shape as PolygonShape;
        // Keep the same center position
        (duplicatedShape as PolygonShape).center = {
          x: polygonShape.center.x + 20,
          y: polygonShape.center.y + 20,
        };
        // Offset the polygon points by 20px
        (duplicatedShape as PolygonShape).points = polygonShape.points.map(
          (point) => ({
            x: point.x + 20,
            y: point.y + 20,
          })
        );

        // FIX: Duplicate rows and seats with new IDs
        if (polygonShape.rows && polygonShape.rows.length > 0) {
          (duplicatedShape as PolygonShape).rows = polygonShape.rows.map(
            (row) => ({
              ...row,
              id: uuidv4(), // New row ID
              area: duplicatedShape.id,
              seats: row.seats.map((seat) => ({
                ...seat,
                id: uuidv4(),
              })),
            })
          );
        }

        // Keep original x, y for compatibility
        duplicatedShape.x = shape.x;
        duplicatedShape.y = shape.y;
      } else {
        // For other shapes, use x, y coordinates
        duplicatedShape.x = shape.x + 20;
        duplicatedShape.y = shape.y + 20;
      }

      set((state) => ({
        shapes: [...state.shapes, duplicatedShape],
        selectedShapeIds: [duplicatedShape.id],
      }));
      get().saveToHistory();
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
      };

      // FIX: Special handling for polygon shapes - offset points, not center
      if (shape.type === "polygon") {
        const polygonShape = shape as PolygonShape;
        // Keep the same center position
        (duplicatedShape as PolygonShape).center = {
          x: polygonShape.center.x + 20,
          y: polygonShape.center.y + 20,
        };
        // Offset the polygon points by 20px
        (duplicatedShape as PolygonShape).points = polygonShape.points.map(
          (point) => ({
            x: point.x + 20,
            y: point.y + 20,
          })
        );

        // FIX: Duplicate rows and seats with new IDs
        if (polygonShape.rows && polygonShape.rows.length > 0) {
          (duplicatedShape as PolygonShape).rows = polygonShape.rows.map(
            (row) => ({
              ...row,
              id: uuidv4(),
              area: duplicatedShape.id,
              seats: row.seats.map((seat) => ({
                ...seat,
                id: uuidv4(),
              })),
            })
          );
        }

        // Keep original x, y for compatibility
        duplicatedShape.x = shape.x;
        duplicatedShape.y = shape.y;
      } else {
        // For other shapes, use x, y coordinates
        duplicatedShape.x = shape.x + 20;
        duplicatedShape.y = shape.y + 20;
      }

      newShapes.push(duplicatedShape);
    });

    set((state) => ({
      shapes: [...state.shapes, ...newShapes],
      selectedShapeIds: newShapes.map((s) => s.id),
    }));
    get().saveToHistory();
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
