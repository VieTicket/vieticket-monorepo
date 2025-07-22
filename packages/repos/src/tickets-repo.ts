import { db } from "@vieticket/db/pg";
import { areas, events, rows, seats } from "@vieticket/db/pg/schemas/events";
import { orders, tickets } from "@vieticket/db/pg/schemas/orders";
import { user } from "@vieticket/db/pg/schemas/users";
import { eq } from "drizzle-orm";
import { TicketInspectionStatus } from "@vieticket/db/pg/schema";
import { ticketInspectionHistory } from "@vieticket/db/pg/schemas/logs";

/**
 * Finds a ticket by ID with complete event and seat information
 * @param ticketId - The ID of the ticket
 * @returns Complete ticket information or null if not found
 */
export async function findTicketByIdWithEventInfo(ticketId: string) {
  const [result] = await db
    .select({
      ticketId: tickets.id,
      status: tickets.status,
      purchasedAt: tickets.purchasedAt,
      orderId: tickets.orderId,
      seatNumber: seats.seatNumber,
      rowName: rows.rowName,
      areaName: areas.name,
      eventId: events.id,
      eventName: events.name,
      eventStartTime: events.startTime,
      eventEndTime: events.endTime,
      organizerId: events.organizerId,
      // Order and user information
      orderDate: orders.orderDate,
      orderStatus: orders.status,
      customerName: user.name,
      customerEmail: user.email,
    })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .innerJoin(user, eq(orders.userId, user.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  return result || null;
}

/**
 * Updates a ticket status
 * @param ticketId - The ID of the ticket
 * @param newStatus - The new status to set
 * @returns The updated ticket
 */
export async function updateTicketStatus(ticketId: string, newStatus: string) {
  const [updatedTicket] = await db
    .update(tickets)
    .set({ status: newStatus as any })
    .where(eq(tickets.id, ticketId))
    .returning();

  return updatedTicket;
}

/**
 * Logs a ticket inspection in the history table
 * @param ticketId - The ID of the ticket
 * @param inspectorId - The ID of the inspector
 * @param status - The inspection result status
 * @param inspectedAt - Optional timestamp (defaults to now)
 * @returns The created inspection history record
 */
export async function logTicketInspection(
  ticketId: string,
  inspectorId: string,
  status: TicketInspectionStatus,
  inspectedAt?: Date
) {
  const [inspectionRecord] = await db
    .insert(ticketInspectionHistory)
    .values({
      ticketId,
      inspectorId,
      status,
      inspectedAt: inspectedAt || new Date(),
    })
    .returning();

  return inspectionRecord;
}

/**
 * Batch logs multiple ticket inspections (for offline mode)
 * @param inspections - Array of inspection data
 * @returns Array of created inspection history records
 */
export async function batchLogTicketInspections(
  inspections: Array<{
    ticketId: string;
    inspectorId: string;
    status: TicketInspectionStatus;
    inspectedAt: Date;
  }>
) {
  if (inspections.length === 0) {
    return [];
  }

  return db
      .insert(ticketInspectionHistory)
      .values(inspections)
      .returning();
}

/**
 * Gets inspection history for a specific ticket
 * @param ticketId - The ID of the ticket
 * @returns Array of inspection history records
 */
export async function getTicketInspectionHistory(ticketId: string) {
  return db
    .select({
      id: ticketInspectionHistory.id,
      status: ticketInspectionHistory.status,
      inspectedAt: ticketInspectionHistory.inspectedAt,
      inspectorName: user.name,
      inspectorEmail: user.email,
    })
    .from(ticketInspectionHistory)
    .innerJoin(user, eq(ticketInspectionHistory.inspectorId, user.id))
    .where(eq(ticketInspectionHistory.ticketId, ticketId));
}