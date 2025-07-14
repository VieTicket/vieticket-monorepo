import type { BaseShape, RectShape, CircleShape, TextShape, PolygonShape, RowShape, SeatShape, Shape } from '@vieticket/db/mongo/models/seat-map'
export * from '@vieticket/db/mongo/models/seat-map';

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
