import * as PIXI from "pixi.js";

export interface PixiShape {
  id: string;
  type: "rectangle" | "ellipse" | "text" | "polygon";
  graphics: PIXI.Graphics | PIXI.Text;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radiusX?: number;
  radiusY?: number;
  points?: Array<{ x: number; y: number; radius?: number }>;

  cornerRadius?: number;
  color: number;
  selected: boolean;
  name?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type Tool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "text"
  | "polygon"
  | "pan";

export interface CanvasInventoryProps {
  shapes: PixiShape[];
  selectedShapeIds: string[];
  onShapeSelect: (id: string) => void;
  onShapePan: (id: string) => void;
}

export interface ToolbarProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onClearCanvas: () => void;
  shapesCount: number;
}

export interface PolygonDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;

  previewPoints: Array<{ x: number; y: number }>;

  closeShape?: boolean;
}
