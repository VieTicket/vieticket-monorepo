import { StateCreator } from "zustand";
import { ShapesSlice } from "./shapes-slice";
import { HistorySlice } from "./history-slice";

export interface CanvasSlice {
  canvasSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  setCanvasSize: (width: number, height: number) => void;
  setViewportSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const createCanvasSlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice,
  [],
  [],
  CanvasSlice
> = (set, get) => ({
  canvasSize: { width: 4000, height: 3000 }, // Large default size
  viewportSize: { width: 800, height: 600 },
  zoom: 1,
  pan: { x: 0, y: 0 },

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
    const { zoom } = get();
    set({ zoom: Math.min(5, zoom * 1.2) });
  },

  zoomOut: () => {
    const { zoom } = get();
    set({ zoom: Math.max(0.1, zoom / 1.2) });
  },
});
