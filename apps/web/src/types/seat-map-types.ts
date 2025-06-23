export type ShapeType = "rect" | "circle" | "polygon" | "text";
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
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: string;
  width?: number;
}

export interface PolygonShape extends BaseShape {
  type: "polygon";
  points: number[];
  closed?: boolean;
}

export type Shape = RectShape | CircleShape | TextShape | PolygonShape;

export type ShapeWithoutMeta =
  | Omit<RectShape, "id" | "draggable" | "visible">
  | Omit<CircleShape, "id" | "draggable" | "visible">
  | Omit<PolygonShape, "id" | "draggable" | "visible">
  | Omit<TextShape, "id" | "draggable" | "visible">;

// Helper type for creating shapes
export type CreateShapeData<T extends ShapeType> = T extends "rect"
  ? Omit<RectShape, "id" | "draggable" | "visible">
  : T extends "circle"
    ? Omit<CircleShape, "id" | "draggable" | "visible">
    : T extends "polygon"
      ? Omit<PolygonShape, "id" | "draggable" | "visible">
      : T extends "text"
        ? Omit<TextShape, "id" | "draggable" | "visible">
        : never;

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
