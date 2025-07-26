import { TicketValidationPayload } from "./types";

// Re-export the TicketValidationPayload type for convenience
export type { TicketValidationPayload } from "./types";

/**
 * Unified ticket type for display in the inspector UI
 * Combines data from both TicketValidationPayload (QR code) and database Ticket
 */
export interface DisplayTicket {
  // Core ticket identifiers
  ticketId: string;
  eventId: string;
  
  // Seat information
  area: string;
  row: string;
  seat: string;
  
  // Visitor information
  visitorName: string;
  
  // Status information
  status: string;
  
  // Timestamps
  timestamp: number;  // From QR code (when ticket was signed)
  purchasedAt?: Date; // From database (when ticket was purchased)
  
  // Additional information that might be available from database
  eventName?: string;
  eventStartTime?: Date;
  eventEndTime?: Date;
  orderDate?: Date;
  orderStatus?: string;
}

/**
 * Creates a DisplayTicket from QR code data
 * Used when initially scanning a ticket before server validation
 */
export function createDisplayTicketFromQR(qrData: TicketValidationPayload, initialStatus: string = 'pending'): DisplayTicket {
  return {
    ticketId: qrData.ticketId,
    eventId: qrData.eventId,
    area: qrData.area,
    row: qrData.row,
    seat: qrData.seat,
    visitorName: qrData.visitorName,
    timestamp: qrData.timestamp,
    status: initialStatus
  };
}

/**
 * Updates a DisplayTicket with data from the server response
 * Used after server validation to update the ticket with database information
 */
export function updateDisplayTicketFromServer(
  displayTicket: DisplayTicket, 
  serverData: any
): DisplayTicket {
  return {
    ...displayTicket,
    status: serverData.status || displayTicket.status,
    purchasedAt: serverData.purchasedAt,
    eventName: serverData.eventName,
    eventStartTime: serverData.eventStartTime,
    eventEndTime: serverData.eventEndTime,
    orderDate: serverData.orderDate,
    orderStatus: serverData.orderStatus
  };
}