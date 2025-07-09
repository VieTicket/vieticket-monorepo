export type ShapeType = "rect" | "circle" | "polygon" | "text";
export type AreaShapeType = "row" | "seat" | "text";

export interface BaseShape {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  name?: string;
  scaleY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  draggable?: boolean;
  dash?: number[];
}

// Main stage shapes
export interface RectShape extends BaseShape {
  type: "rect";
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface CircleShape extends BaseShape {
  type: "circle";
  radius: number;
}

export interface TextShape extends BaseShape {
  type: "text";
  name: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
  width?: number;
  height?: number;
  lineHeight?: number;
  text?: string;
}

// UPDATED: PolygonShape represents an Area
export interface PolygonShape extends BaseShape {
  type: "polygon";
  // FIX: Change from number[] to Point[]
  points: { x: number; y: number }[];
  closed?: boolean;
  // Area-specific properties
  areaName?: string;
  capacity?: number;
  areaType?: "seating" | "stage" | "entrance" | "facilities" | "custom";
  // NEW: Default settings for consistency across the area
  defaultSeatRadius?: number;
  defaultSeatSpacing?: number;
  defaultRowSpacing?: number;
  defaultSeatCategory?: "standard" | "premium" | "accessible" | "restricted";
  defaultSeatColor?: string;
  // Contains rows and seats
  rows?: RowShape[];
  seats?: SeatShape[]; // Standalone seats not in rows
}

// NEW: Row shape for area mode - updated with more properties
export interface RowShape {
  id: string;
  type: "row";
  name: string;
  startX: number;
  startY: number;
  seatRadius: number;
  seatSpacing: number;
  rotation: number;
  area: string; // Reference to parent area
  seats: SeatShape[];
  // NEW: Additional properties for editing
  rowColor?: string;
  rowCategory?: "standard" | "premium" | "accessible" | "restricted";
  // Visual properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible?: boolean;
}

// NEW: Seat shape for area mode - updated with more properties
export interface SeatShape {
  id: string;
  type: "seat";
  row: string; // Row identifier
  number: number; // Seat number in row
  x: number;
  y: number;
  radius: number;
  status: "available" | "sold" | "reserved" | "blocked";
  // Additional properties
  price?: number;
  category?: "standard" | "premium" | "accessible" | "restricted";
  // NEW: Individual seat properties
  seatLabel?: string; // Custom seat label
  // Visual properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible?: boolean;
}

export type Shape = RectShape | CircleShape | TextShape | PolygonShape;
export type AreaShape = RowShape | SeatShape;

// FIXED: Create individual shape update types
export type RectShapeUpdate = Partial<Omit<RectShape, "id" | "type">>;
export type CircleShapeUpdate = Partial<Omit<CircleShape, "id" | "type">>;
export type TextShapeUpdate = Partial<Omit<TextShape, "id" | "type">>;
export type PolygonShapeUpdate = Partial<Omit<PolygonShape, "id" | "type">>;

// FIXED: Union type for all possible shape updates
export type ShapeUpdate =
  | RectShapeUpdate
  | CircleShapeUpdate
  | TextShapeUpdate
  | PolygonShapeUpdate;

// FIXED: More flexible update type that includes all possible properties
export type AnyShapeUpdate = Partial<Omit<BaseShape, "id" | "type">> & {
  // Rectangle-specific
  width?: number;
  height?: number;
  cornerRadius?: number;
  // Circle-specific
  radius?: number;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
  // Polygon/Area-specific
  points?: { x: number; y: number }[]; // FIX: Updated type
  closed?: boolean;
  areaName?: string;
  capacity?: number;
  areaType?: "seating" | "stage" | "entrance" | "facilities" | "custom";
  rows?: RowShape[];
  seats?: SeatShape[];
};

export type ShapeWithoutMeta =
  | Omit<RectShape, "id" | "draggable" | "visible">
  | Omit<CircleShape, "id" | "draggable" | "visible">
  | Omit<PolygonShape, "id" | "draggable" | "visible">
  | Omit<TextShape, "id" | "draggable" | "visible">;

export interface CanvasState {
  shapes: Shape[];
  selectedShapeIds: string[];
  clipboard: Shape[];
  history: Shape[][];
  historyIndex: number;
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
}

// NEW: Area-specific configuration
export interface AreaConfig {
  defaultSeatRadius: number;
  defaultSeatSpacing: number;
  defaultRowSpacing: number;
  startingRowLabel: string;
  startingSeatNumber: number;
  defaultSeatCategory: "standard" | "premium" | "accessible" | "restricted";
  defaultPrice: number;
}
