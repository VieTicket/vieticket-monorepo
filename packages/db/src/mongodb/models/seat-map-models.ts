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
}

export interface RectangleShape extends BaseCanvasItem {
  type: "rectangle";
  width: number;
  height: number;
  cornerRadius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
}

export interface EllipseShape extends BaseCanvasItem {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
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

export interface SeatShape extends EllipseShape {
  rowId: string;
  gridId: string;
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
}

export interface PolygonShape extends BaseCanvasItem {
  type: "polygon";
  points: Array<{ x: number; y: number; radius?: number }>;
  cornerRadius: number;
  color: number;
  strokeColor: number;
  strokeWidth: number;
}

export interface ImageShape extends BaseCanvasItem {
  type: "image";
  src: string;
  originalWidth: number;
  originalHeight: number;
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
}

export interface ContainerGroup extends BaseCanvasItem {
  type: "container";
  children: CanvasItem[];
  expanded: boolean;
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

export type CreateSeatMapInput = {
  name: string;
  shapes: CanvasItem[];
  image: string;
  createdBy: string;
  publicity?: "public" | "private";
  draftedFrom?: string;
  originalCreator?: string;
  organizationId?: string | null;
};

export type UpdateSeatMapInput = Partial<Omit<CreateSeatMapInput, "createdBy">>;

export type SeatMap = {
  id?: string;
  name: string;
  shapes: CanvasItem[];
  image: string;
  createdBy: string;
  publicity: "public" | "private";
  usedByEvent?: string;
  draftedFrom?: string;
  originalCreator?: string;
  organizationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicSeatMap = {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  originalCreator?: string;
  draftedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
  draftCount?: number;
};

export type DraftSeatMapInput = {
  originalSeatMapId: string;
  name: string;
  createdBy: string;
};
