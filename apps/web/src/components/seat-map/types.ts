import * as PIXI from "pixi.js";

export interface BaseCanvasItem {
  id: string;
  name: string; // User-friendly name for properties panel
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

// ✅ New SeatShape interface extending EllipseShape
export interface SeatShape extends EllipseShape {
  rowId: string; // ID of the row this seat belongs to
  gridId: string; // ID of the grid this seat belongs to
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
  uploadId?: string; // Track upload operations
  tempBlobUrl?: string; // Keep blob URL for immediate display
  uploadedBy?: string; // User ID who uploaded the image
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

export interface ContainerGroup extends BaseCanvasItem {
  type: "container";
  children: CanvasItem[];
  expanded: boolean; // For properties panel UI
  graphics: PIXI.Container;
}

// ✅ Seat grid settings interface
export interface SeatGridSettings {
  seatSpacing: number;
  rowSpacing: number;
  seatRadius: number;
  seatColor: number;
  seatStrokeColor: number;
  seatStrokeWidth: number;
  price: number;
}

// ✅ Grid data structure
export interface GridData {
  id: string;
  name: string;
  rows: RowData[];
  seatSettings: SeatGridSettings;
  createdAt: Date;
}

// ✅ Row data structure
export interface RowData {
  id: string;
  name: string;
  seats: string[];
  bend?: number;
  seatSpacing?: number;
}

// ✅ New AreaModeContainer interface extending ContainerGroup
export interface AreaModeContainer extends ContainerGroup {
  grids: GridData[];
  defaultSeatSettings: SeatGridSettings;
}
export interface UserInfo {
  id: string;
  name: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}
// Union type for all canvas items
export type CanvasItem =
  | RectangleShape
  | EllipseShape
  | SeatShape
  | TextShape
  | PolygonShape
  | ImageShape
  | SVGShape
  | ContainerGroup
  | AreaModeContainer;

// Helper type for just shapes (excluding containers)
export type ShapeItem = Exclude<CanvasItem, ContainerGroup | AreaModeContainer>;

export type Tool =
  | "select"
  | "rectangle"
  | "ellipse"
  | "text"
  | "polygon"
  | "pan"
  | "seat-grid";

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
