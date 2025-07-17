export interface EventFormData {
  name: string;
  type: string;
  ticketSaleStart: string;
  ticketSaleEnd: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  seatCount: string;
  ticketPrice: string;
}

export interface Area {
  name: string;
  seatCount: string;
  ticketPrice: string;
}

export interface SeatMapData {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
}

export interface SeatMapPreviewData {
  areas: Array<{
    name: string;
    rows: Array<{
      seats: Array<any>;
    }>;
    price: number;
  }>;
}

export interface ProcessedSeatMapData {
  areas: Array<{
    name: string;
    rows: Array<{
      seats: Array<any>;
    }>;
    price: number;
  }>;
}

export interface UploadResponse {
  file?: File;
  secure_url: string;
}

export type TicketingMode = "simple" | "seatmap";
