export interface TicketValidationPayload {
  ticketId: string;
  timestamp: number;
  visitorName: string;
  event: { id: string; name: string };
  seat: { id: string; number: string };
  row: { id: string; name: string };
  area: { id: string; name: string };
}

// Internal compressed format (array-based with binary UUIDs)
export type CompressedTicketPayload = [
  Uint8Array, // ticketId (UUID as 16 bytes)
  number,     // timestamp
  string,     // visitorName
  [Uint8Array, string], // [eventId (UUID as 16 bytes), eventName]
  [Uint8Array, string], // [seatId (UUID as 16 bytes), seatNumber]
  [Uint8Array, string], // [rowId (UUID as 16 bytes), rowName]
  [Uint8Array, string]  // [areaId (UUID as 16 bytes), areaName]
];

// Internal signed data format (array-based)
export type CompressedSignedData = [
  CompressedTicketPayload, // payload
  Uint8Array // signature (binary, not hex)
];

export interface SignedTicketData {
  payload: TicketValidationPayload;
  signature: string;
}