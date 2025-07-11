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

export interface PolygonShape extends BaseShape {
  type: "polygon";

  points: { x: number; y: number }[];
  closed?: boolean;
  center: { x: number; y: number };

  areaName?: string;

  defaultSeatRadius?: number;
  defaultSeatSpacing?: number;
  defaultRowSpacing?: number;
  defaultSeatCategory?: "standard" | "premium" | "accessible" | "restricted";
  defaultSeatColor?: string;
  defaultPrice?: number;

  rows?: RowShape[];
}

export interface RowShape {
  id: string;
  type: "row";
  name: string;
  startX: number;
  startY: number;
  seatRadius: number;
  seatSpacing: number;
  rotation: number;
  area: string;
  seats: SeatShape[];

  rowColor?: string;
  rowCategory?: "standard" | "premium" | "accessible" | "restricted";

  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible?: boolean;
}

export interface SeatShape {
  id: string;
  type: "seat";
  row: string;
  number: number;
  x: number;
  y: number;
  radius: number;
  status: "available" | "sold" | "reserved" | "blocked";

  price?: number;
  category?: "standard" | "premium" | "accessible" | "restricted";

  seatLabel?: string;

  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible?: boolean;
}

export type Shape = RectShape | CircleShape | TextShape | PolygonShape;
export type AreaShape = RowShape | SeatShape;

export type RectShapeUpdate = Partial<Omit<RectShape, "id" | "type">>;
export type CircleShapeUpdate = Partial<Omit<CircleShape, "id" | "type">>;
export type TextShapeUpdate = Partial<Omit<TextShape, "id" | "type">>;
export type PolygonShapeUpdate = Partial<Omit<PolygonShape, "id" | "type">>;

export type ShapeUpdate =
  | RectShapeUpdate
  | CircleShapeUpdate
  | TextShapeUpdate
  | PolygonShapeUpdate;

export type AnyShapeUpdate = Partial<Omit<BaseShape, "id" | "type">> & {
  width?: number;
  height?: number;
  cornerRadius?: number;

  radius?: number;

  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;

  points?: { x: number; y: number }[];
  closed?: boolean;
  center?: { x: number; y: number };
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

export interface AreaConfig {
  defaultSeatRadius: number;
  defaultSeatSpacing: number;
  defaultRowSpacing: number;
  startingRowLabel: string;
  startingSeatNumber: number;
  defaultSeatCategory: "standard" | "premium" | "accessible" | "restricted";
  defaultPrice: number;
}
