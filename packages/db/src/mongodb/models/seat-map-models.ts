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
  publicity?: "public" | "private"; // Optional, defaults to 'private'
  draftedFrom?: string; // ObjectId as string
  originalCreator?: string; // Set automatically when drafting
};

export type UpdateSeatMapInput = Partial<Omit<CreateSeatMapInput, "createdBy">>;

export type SeatMap = {
  id?: string;
  name: string;
  shapes: Shape[];
  image: string;
  createdBy: string;
  publicity: "public" | "private";
  draftedFrom?: string;
  originalCreator?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// NEW: Type for public seat map listings
export type PublicSeatMap = {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  originalCreator?: string;
  draftedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
  draftCount?: number; // Number of times this was drafted
};

// NEW: Type for draft creation
export type DraftSeatMapInput = {
  originalSeatMapId: string;
  name: string;
  createdBy: string;
};
