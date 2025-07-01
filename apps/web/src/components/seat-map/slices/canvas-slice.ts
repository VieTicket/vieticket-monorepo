import { StateCreator } from "zustand";
import { ShapesSlice } from "./shapes-slice";
import { HistorySlice } from "./history-slice";
import { ToolType } from "../main-toolbar";
import { AreaToolType } from "../area-toolbar";

export interface CanvasSlice {
  canvasSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  currentTool: ToolType | AreaToolType;
  showGrid: boolean;
  showHitCanvas: boolean;

  setCanvasSize: (width: number, height: number) => void;
  setViewportSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setCurrentTool: (tool: ToolType) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setShowGrid: (show: boolean) => void;
  setShowHitCanvas: (show: boolean) => void;

  updateMultipleShapes: (
    updates: Array<{ id: string; updates: Record<string, any> }>
  ) => void;
  duplicateShapes: () => void;
  deleteShapes: (shapeIds: string[]) => void;
}

export const createCanvasSlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice,
  [],
  [],
  CanvasSlice
> = (set, get) => ({
  currentTool: "select",
  canvasSize: { width: 4000, height: 3000 },
  viewportSize: { width: 800, height: 600 },
  zoom: 1,
  pan: { x: 0, y: 0 },
  showGrid: false,
  showHitCanvas: false,

  setCurrentTool: (tool) => {
    set({ currentTool: tool });
    if (tool !== "select") {
      set({ selectedShapeIds: [] });
    }
  },

  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
  },

  setViewportSize: (width, height) => {
    set({ viewportSize: { width, height } });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setPan: (x, y) => {
    set({ pan: { x, y } });
  },

  setShowGrid: (show) => set({ showGrid: show }),
  setShowHitCanvas: (show) => set({ showHitCanvas: show }),

  resetView: () => {
    const { viewportSize } = get();
    // Center the canvas
    const centerX =
      (viewportSize.width - viewportSize.width * 5) / 2 +
      viewportSize.width * 2;
    const centerY =
      (viewportSize.height - viewportSize.height * 5) / 2 +
      viewportSize.height * 2;

    set({
      zoom: 1,
      pan: { x: centerX, y: centerY },
    });
  },

  zoomIn: () => {
    const { zoom, setZoom } = get();
    const newZoom = Math.min(zoom * 1.2, 10); // Max zoom 10x
    setZoom(newZoom);
  },

  zoomOut: () => {
    const { zoom, setZoom } = get();
    const newZoom = Math.max(zoom / 1.2, 0.1); // Min zoom 0.1x
    setZoom(newZoom);
  },

  updateMultipleShapes: (updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        const update = updates.find((u) => u.id === shape.id);
        return update ? { ...shape, ...update.updates } : shape;
      }),
    }));
  },

  duplicateShapes: () => {
    const state = get();
    const shapesToDuplicate = state.shapes.filter((s) =>
      state.selectedShapeIds.includes(s.id)
    );
    const newShapes = shapesToDuplicate.map((shape) => ({
      ...shape,
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: shape.x + 20,
      y: shape.y + 20,
    }));

    set((state) => ({
      shapes: [...state.shapes, ...newShapes],
      selectedShapeIds: newShapes.map((s) => s.id),
    }));
  },

  deleteShapes: (shapeIds) => {
    set((state) => ({
      shapes: state.shapes.filter((s) => !shapeIds.includes(s.id)),
      selectedShapeIds: [],
    }));
  },
});
