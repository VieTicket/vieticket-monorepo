import { StateCreator } from "zustand";
import { ShapesSlice } from "./shapes-slice";
import { HistorySlice } from "./history-slice";

export interface CanvasSlice {
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  setCanvasSize: (width: number, height: number) => void;
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
  canvasSize: { width: 800, height: 600 },
  zoom: 1,
  pan: { x: 0, y: 0 },

  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setPan: (x, y) => {
    set({ pan: { x, y } });
  },

  resetView: () => {
    set({ zoom: 1, pan: { x: 0, y: 0 } });
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
