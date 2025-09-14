import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup, Tool } from "./types";
import { useSeatMapStore } from "./store/seat-map-store";

// Global state for performance (outside React)
export let pixiApp: PIXI.Application | null = null;
export let stage: PIXI.Container | null = null;
export let shapeContainer: PIXI.Container | null = null;
export let previewContainer: PIXI.Container | null = null;
export let previewGraphics: PIXI.Graphics | null = null;
export let shapes: CanvasItem[] = [];
export let currentTool: Tool = "select";
export let isDrawing = false;
export let dragStart: { x: number; y: number } | null = null;
export let zoom = 1;
export let pan = { x: 0, y: 0 };
export let previouslyClickedShape: CanvasItem | null = null;
export let selectedContainer: ContainerGroup[] = [];
export let wasDragged = false;
export let wasTransformed = false;

// Drag state variables
export let isShapeDragging = false;
export let shapeDragStart: { x: number; y: number } | null = null;
export let draggedShapes: CanvasItem[] = [];
export let originalPositions: Array<{ x: number; y: number }> = [];
export let originalPolygonPoints: Array<
  Array<{ x: number; y: number; radius?: number }>
> = [];
// Add polygon drawing state
export let polygonDrawingState: {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
  previewPoints: Array<{ x: number; y: number }>;
} = {
  isDrawing: false,
  points: [],
  previewPoints: [],
};

export let selectionContainer: PIXI.Container | null = null;

// Setters for variables that need to be modified from other modules
export const setPixiApp = (app: PIXI.Application | null) => {
  pixiApp = app;
};
export const setStage = (stageContainer: PIXI.Container | null) => {
  stage = stageContainer;
};
export const setShapeContainer = (container: PIXI.Container | null) => {
  shapeContainer = container;
};
export const setPreviewContainer = (container: PIXI.Container | null) => {
  previewContainer = container;
};
export const setPreviewGraphics = (graphics: PIXI.Graphics | null) => {
  previewGraphics = graphics;
};
export const setShapes = (newShapes: CanvasItem[]) => {
  shapes = newShapes;
  useSeatMapStore.getState().updateShapes(shapes);
};
export const setPreviouslyClickedShape = (shape: CanvasItem | null) => {
  previouslyClickedShape = shape;
};
export const setSelectedContainer = (containerPath: ContainerGroup[]) => {
  selectedContainer = containerPath;
};
export const setWasDragged = (dragged: boolean) => {
  wasDragged = dragged;
};

export const setWasTransformed = (transformed: boolean) => {
  wasTransformed = transformed;
};

export const setIsShapeDragging = (dragging: boolean) => {
  isShapeDragging = dragging;
};
export const setShapeDragStart = (start: { x: number; y: number } | null) => {
  shapeDragStart = start;
};
export const setDraggedShapes = (shapes: CanvasItem[]) => {
  draggedShapes = shapes;
};
export const setOriginalPositions = (
  positions: Array<{ x: number; y: number }>
) => {
  originalPositions = positions;
};
export const setOriginalPolygonPoints = (
  points: Array<Array<{ x: number; y: number; radius?: number }>>
) => {
  originalPolygonPoints = points;
};

export const addShape = (shape: CanvasItem) => {
  shapes.push(shape);
  useSeatMapStore.getState().updateShapes(shapes);
};
export const setCurrentTool = (tool: Tool) => {
  currentTool = tool;
};
export const setIsDrawing = (drawing: boolean) => {
  isDrawing = drawing;
};
export const setDragStart = (start: { x: number; y: number } | null) => {
  dragStart = start;
};
export const setZoom = (newZoom: number) => {
  zoom = newZoom;
};
export const setPan = (newPan: { x: number; y: number }) => {
  pan = newPan;
};
export const setPolygonDrawingState = (
  newState: typeof polygonDrawingState
) => {
  polygonDrawingState = newState;
};
export const setSelectionContainer = (container: PIXI.Container | null) => {
  selectionContainer = container;
};

export const resetVariables = () => {
  pixiApp = null;
  stage = null;
  shapeContainer = null;
  previewContainer = null;
  previewGraphics = null;
  shapes = [];
  currentTool = "select";
  isDrawing = false;
  dragStart = null;
  zoom = 1;
  pan = { x: 0, y: 0 };
  polygonDrawingState = {
    isDrawing: false,
    points: [],
    previewPoints: [],
  };
  selectionContainer = null;
  previouslyClickedShape = null;
  wasDragged = false;
  selectedContainer = [];
  wasTransformed = false;

  isShapeDragging = false;
  shapeDragStart = null;
  draggedShapes = [];
  originalPositions = [];
  originalPolygonPoints = [];
  // Reset Zustand store
  useSeatMapStore.getState().updateShapes(shapes);
};
