export interface TicketValidationPayload {
  ticketId: string;
  timestamp: number;
  visitorName: string;
  event: { id: string; name: string };
  seat: { id: string; number: string };
  row: { id: string; name: string };
  area: { id: string; name: string };
}

export interface SignedTicketData {
  payload: TicketValidationPayload;
  signature: string;
}