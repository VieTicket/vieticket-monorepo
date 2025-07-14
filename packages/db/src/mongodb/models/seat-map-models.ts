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

// Helper types for application use
export type CreateSeatMapInput = {
  name: string;
  shapes: Shape[];
  image: string;
  createdBy: string;
};

export type UpdateSeatMapInput = Partial<Omit<CreateSeatMapInput, 'createdBy'>>;

export type SeatMap = {
  id?: string;
  name: string;
  shapes: Shape[];
  image: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};