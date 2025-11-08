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

export interface SeatMapGridData {
  id: string;
  name: string;
  rows: SeatMapRowData[];
  seatSettings: {
    seatSpacing: number;
    rowSpacing: number;
    seatRadius: number;
    seatColor: number;
    seatStrokeColor: number;
    seatStrokeWidth: number;
    price: number;
  };
  createdAt: string;
}

export interface SeatMapRowData {
  id: string;
  name: string;
  seats: string[];
  bend?: number;
  seatSpacing?: number;
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

// ✅ Fixed SeatMapData interface
export interface SeatMapData {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  publicity: "public" | "private";
  createdAt: string;
  updatedAt: string;
  // ✅ Grid data for area mode container
  grids?: SeatMapGridData[];
  defaultSeatSettings?: {
    seatSpacing: number;
    rowSpacing: number;
    seatRadius: number;
    seatColor: number;
    seatStrokeColor: number;
    seatStrokeWidth: number;
    price: number;
  };
}

export interface UploadResponse {
  file?: File;
  secure_url: string;
}

export type TicketingMode = "simple" | "seatmap";
