import * as PIXI from "pixi.js";

export interface BaseCanvasItem {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  selected?: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  graphics: PIXI.Graphics | PIXI.Text | PIXI.Container;
}
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
  points: Array<{ x: number; y: number }>;
  cornerRadius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
  graphics: PIXI.Graphics;
}

export interface FreeShapePoint {
  x: number;
  y: number;
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  isCurved: boolean;
}

export interface FreeShape extends BaseCanvasItem {
  type: "freeshape";
  points: FreeShapePoint[];
  color: number;
  strokeColor: number;
  strokeWidth: number;
  graphics: PIXI.Graphics;
  editMode: boolean;
  controlPointGraphics: PIXI.Graphics[];
}

export interface ContainerGroup extends BaseCanvasItem {
  type: "container";
  children: CanvasItem[];
  expanded: boolean;
  graphics: PIXI.Container;
}
export type CanvasItem =
  | RectangleShape
  | EllipseShape
  | TextShape
  | PolygonShape
  | FreeShape
  | ContainerGroup;
export type ShapeItem = Exclude<CanvasItem, ContainerGroup>;

export interface FreeShapeDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
  previewPoints: Array<{ x: number; y: number }>;
  curved: boolean;
}

export type Tool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "text"
  | "polygon"
  | "freeshape"
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
