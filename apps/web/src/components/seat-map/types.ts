import * as PIXI from "pixi.js";

export interface BaseCanvasItem {
  id: string;
  name: string;
  visible: boolean;
  interactive: boolean;
  selected?: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  graphics: PIXI.Graphics | PIXI.Text | PIXI.Container | PIXI.Sprite;
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

export interface SeatLabelStyle {
  fontFamily: string;
  fontSize: number;
  fill: number | string;
  fontWeight: string;
  align: string;
  strokeColor?: number | string;
  strokeWidth?: number;
}

export interface SeatStatus {
  name: "available" | "reserved" | "sold" | "blocked";
  color: number;
}

export interface SeatShape extends Omit<EllipseShape, "graphics"> {
  graphics: PIXI.Container;
  rowId: string;
  gridId: string;
  status: SeatStatus;
  seatGraphics: PIXI.Graphics;
  labelGraphics: PIXI.Text;
  showLabel: boolean;
  labelStyle: SeatLabelStyle;
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
  uploadState?: "uploading" | "uploaded" | "failed";
  uploadId?: string;
  tempBlobUrl?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  cloudinaryUrl?: string;
}

export interface SVGShape extends BaseCanvasItem {
  type: "svg";
  svgContent: string;
  originalWidth: number;
  originalHeight: number;
  graphics: PIXI.Graphics;
}

export interface FreeShapePoint {
  x: number;
  y: number;
  cp1x?: number;
  cp1y?: number;
  cp2x?: number;
  cp2y?: number;
  type: "move" | "curve" | "line";
  smoothness?: number;
}

export interface FreeShape extends BaseCanvasItem {
  type: "freeshape";
  points: FreeShapePoint[];
  closed: boolean;
  color: number;
  strokeColor: number;
  strokeWidth: number;
  smoothness: number;
  graphics: PIXI.Graphics;
}

export interface ContainerGroup extends BaseCanvasItem {
  type: "container";
  children: CanvasItem[];
  expanded: boolean;
  graphics: PIXI.Container;
}

export interface SeatGridSettings {
  seatSpacing: number;
  rowSpacing: number;
  seatRadius: number;
  seatColor: number;
  seatStrokeColor: number;
  seatStrokeWidth: number;
  price: number;
}

export interface RowShape extends ContainerGroup {
  children: SeatShape[];
  rowName: string;
  seatSpacing: number;
  gridId: string;
  labelGraphics?: PIXI.Text;
  labelPlacement: "left" | "middle" | "right" | "none";
  createdAt: Date;
}

export interface GridShape extends ContainerGroup {
  children: RowShape[];
  gridName: string;
  seatSettings: SeatGridSettings;
  createdAt: Date;
}

export interface AreaModeContainer extends ContainerGroup {
  children: GridShape[];
  defaultSeatSettings: SeatGridSettings;
}

export interface UserInfo {
  id: string;
  name: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}
export type CanvasItem =
  | RectangleShape
  | EllipseShape
  | SeatShape
  | TextShape
  | PolygonShape
  | ImageShape
  | SVGShape
  | ContainerGroup
  | FreeShape
  | AreaModeContainer
  | RowShape
  | GridShape;

export type ShapeItem = Exclude<
  CanvasItem,
  ContainerGroup | AreaModeContainer | RowShape | GridShape
>;

export type Tool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "text"
  | "polygon"
  | "pan"
  | "seat-grid"
  | "freeshape";

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
}

export interface PolygonDrawingState {
  isDrawing: boolean;
  points: Array<{ x: number; y: number }>;
  previewPoints: Array<{ x: number; y: number }>;
  closeShape?: boolean;
}
