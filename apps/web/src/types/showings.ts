export interface ShowingFormData {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface ShowingWithAreas extends ShowingFormData {
  areas?: AreaFormData[];
  seatMapId?: string;
}

export interface AreaFormData {
  name: string;
  ticketPrice: string;
  seatCount: string;
}

export type TicketingMode = "simple" | "seatmap";
