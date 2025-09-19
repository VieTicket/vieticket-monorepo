import * as PIXI from "pixi.js";

export interface BaseCanvasItem {
  id: string;
  name: string; // User-friendly name for properties panel
  visible: boolean;
  locked: boolean;
  selected?: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  graphics: PIXI.Graphics | PIXI.Text | PIXI.Container | PIXI.Sprite;
}

// Shape-specific interfaces
export interface RectangleShape extends BaseCanvasItem {
  type: "rectangle";
  width: number;
  height: number;
  cornerRadius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
  graphics: PIXI.Graphics;
}

export interface EllipseShape extends BaseCanvasItem {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
  graphics: PIXI.Graphics;
}

export interface TextShape extends BaseCanvasItem {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  color: number;
  graphics: PIXI.Text;
}

export interface PolygonShape extends BaseCanvasItem {
  type: "polygon";
  points: Array<{ x: number; y: number; radius?: number }>;
  cornerRadius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
  graphics: PIXI.Graphics;
}

export interface ImageShape extends BaseCanvasItem {
  type: "image";
  src: string;
  originalWidth: number;
  originalHeight: number;
  graphics: PIXI.Sprite;
}
export interface SVGShape extends BaseCanvasItem {
  type: "svg";
  svgContent: string;
  originalWidth: number;
  originalHeight: number;
  graphics: PIXI.Graphics;
}

export interface ContainerGroup extends BaseCanvasItem {
  type: "container";
  children: CanvasItem[];
  expanded: boolean; // For properties panel UI
  graphics: PIXI.Container;
}

// Union type for all canvas items
export type CanvasItem =
  | RectangleShape
  | EllipseShape
  | TextShape
  | PolygonShape
  | ImageShape
  | SVGShape
  | ContainerGroup;

// Helper type for just shapes (excluding containers)
export type ShapeItem = Exclude<CanvasItem, ContainerGroup>;

export type Tool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "text"
  | "polygon"
  | "pan";

export interface CanvasInventoryProps {
  shapes: CanvasItem[];
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
