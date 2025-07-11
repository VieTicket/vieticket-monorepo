export interface TicketValidationPayload {
  ticketId: string;
  timestamp: number;
  visitorName: string;
  eventId: string; 
  seat: string; // Just seat number, e.g., "07"
  row: string;  // Just row name, e.g., "R17A"
  area: string; // Just area name, e.g., "Premium Economy"
}

// Internal compressed format (array-based with binary UUIDs)
export type CompressedTicketPayload = [
  Uint8Array, // ticketId (UUID as 16 bytes)
  number,     // timestamp
  string,     // visitorName
  Uint8Array, // eventId (UUID as 16 bytes)
  string,     // seat (just the number/name)
  string,     // row (just the name)
  string      // area (just the name)
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