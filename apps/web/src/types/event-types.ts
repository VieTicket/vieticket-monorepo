import { GridShape } from "@/components/seat-map/types";

export interface EventFormData {
  name: string;
  type: string;
  ticketSaleStart: string;
  ticketSaleEnd: string;
  location: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  seatCount: string;
  ticketPrice: string;
  maxTicketsByOrder?: number;
  startTime: string;
  endTime: string;
}

export interface Area {
  name: string;
  seatCount: string;
  ticketPrice: string;
}

// ✅ Import types from seat-map component
export interface SeatGridSettings {
  seatSpacing: number;
  rowSpacing: number;
  seatRadius: number;
  seatColor: number;
  seatStrokeColor: number;
  seatStrokeWidth: number;
  price: number;
}

export interface SeatMapPreviewData {
  areas: Array<{
    id: string;
    name: string;
    rows: Array<{
      id: string;
      name: string;
      seats: string[];
      bend?: number;
    }>;
    price: number;
    seatCount: number;
  }>;
  totalSeats: number;
  totalRevenue: number;
}

export interface SeatMapData {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  publicity: "public" | "private";
  createdAt: string;
  updatedAt: string;
  draftedFrom?: string; // ObjectId as string
  originalCreator?: string;
  shapes?: any[]; // Raw CanvasItem[] from MongoDB
  grids?: GridShape[]; // Processed grid data
  defaultSeatSettings?: SeatGridSettings;
  hasGrids?: boolean;
  statistics?: {
    gridCount: number;
    totalSeats: number;
    totalRevenue: number;
    hasValidStructure: boolean;
  };
}

export interface UploadResponse {
  file?: File;
  secure_url: string;
}

export type TicketingMode = "simple" | "seatmap";
