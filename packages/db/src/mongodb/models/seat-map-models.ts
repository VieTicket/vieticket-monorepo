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

// Shape-specific interfaces matching PIXI.js types
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

// ✅ SeatShape interface extending EllipseShape
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

export interface ContainerGroup extends BaseCanvasItem {
  type: "container";
  children: CanvasItem[];
  expanded: boolean; // For properties panel UI
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

// ✅ AreaModeContainer interface extending ContainerGroup
export interface AreaModeContainer extends ContainerGroup {
  grids: GridData[];
  defaultSeatSettings: SeatGridSettings;
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

// Helper types for application use
export type CreateSeatMapInput = {
  name: string;
  shapes: CanvasItem[];
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
  shapes: CanvasItem[];
  image: string;
  createdBy: string;
  publicity: "public" | "private";
  draftedFrom?: string;
  originalCreator?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Type for public seat map listings
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

// Type for draft creation
export type DraftSeatMapInput = {
  originalSeatMapId: string;
  name: string;
  createdBy: string;
};
