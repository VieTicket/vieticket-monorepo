import * as PIXI from "pixi.js";
import { AreaModeContainer, CanvasItem, ContainerGroup, Tool } from "./types";
import { useSeatMapStore } from "./store/seat-map-store";
import { createContainer } from "./shapes/container-shape";

// Global state for performance (outside React)
export let pixiApp: PIXI.Application | null = null;
export let stage: PIXI.Container | null = null;
export let shapeContainer: PIXI.Container | null = null;
export let previewContainer: PIXI.Container | null = null;
export let previewGraphics: PIXI.Graphics | null = null;
export let shapes: CanvasItem[] = [];
export let currentTool: Tool = "select";

// Interaction state variables
export let isDrawing = false;
export let dragStart: { x: number; y: number } | null = null;
export let zoom = 1;
export let pan = { x: 0, y: 0 };
export let previouslyClickedShape: CanvasItem | null = null;
export let selectedContainer: ContainerGroup[] = [];

// Track if any shapes were moved or transformed
export let wasDragged = false;
export let wasTransformed = false;

// Multi-selection state variables
export let isSelecting = false;
export let selectionStart: { x: number; y: number } | null = null;

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
// Area mode variables
export let selectionContainer: PIXI.Container | null = null;
export let isAreaMode = false;
export let areaModeContainer: AreaModeContainer | null = null;
export interface FreeShapeDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
  previewPoints: Array<{ x: number; y: number }>;
  closed: boolean;
}

export let freeShapeDrawingState: FreeShapeDrawingState = {
  isDrawing: false,
  points: [],
  previewPoints: [],
  closed: false,
};

export const setFreeShapeDrawingState = (state: FreeShapeDrawingState) => {
  freeShapeDrawingState = state;
};
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

export const setIsAreaMode = (mode: boolean) => {
  isAreaMode = mode;
};

export const setAreaModeContainer = (container: AreaModeContainer | null) => {
  areaModeContainer = container;
};

export const setIsSelecting = (selecting: boolean) => {
  isSelecting = selecting;
};
export const setSelectionStart = (start: { x: number; y: number } | null) => {
  selectionStart = start;
};

export const initializeAreaModeContainer = (): AreaModeContainer => {
  if (areaModeContainer) {
    return areaModeContainer;
  }

  const container = new PIXI.Container();
  container.eventMode = "static";
  container.interactive = true;
  container.interactiveChildren = true;

  areaModeContainer = {
    ...createContainer(
      [],
      "AreaMode",
      false, // Don't add shape events initially
      "area-mode-container-id"
    ),
    children: [],
    defaultSeatSettings: {
      seatSpacing: 25,
      rowSpacing: 30,
      seatRadius: 8,
      seatColor: 0x4caf50,
      seatStrokeColor: 0x2e7d0f,
      seatStrokeWidth: 1,
      price: 100000,
    },
  };
  areaModeContainer.graphics.zIndex = 100;
  areaModeContainer.graphics.alpha = 0.3;

  shapes.push(areaModeContainer);

  if (shapeContainer) {
    shapeContainer.addChild(areaModeContainer.graphics);
  }

  useSeatMapStore.getState().updateShapes([...shapes], false, undefined, false);
  return areaModeContainer;
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

  // Multi-selection state variables
  isSelecting = false;
  selectionStart = null;

  // ✅ Reset area mode variables
  isAreaMode = false;
  areaModeContainer = null;
};
