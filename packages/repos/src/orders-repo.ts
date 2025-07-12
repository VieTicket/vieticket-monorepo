import { db } from "@vieticket/db/postgres";
import { areas, events, rows, seats } from "@vieticket/db/schemas/events";
import { tickets } from "@vieticket/db/schemas/orders";
import { eq } from "drizzle-orm";

/**
 * Gets event information for a given ticket
 * @param ticketId - The ID of the ticket
 * @returns Event information including id and name
 */
export async function getEventByTicketId(ticketId: string) {
  const [result] = await db
    .select({
      eventId: events.id,
      eventName: events.name,
    })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  return result || null;
}
/**
 * Gets detailed ticket information with seat and area details
 * @param orderId - The ID of the order
 * @returns Array of tickets with seat and area information including IDs
 */

export async function getTicketDetails(orderId: string) {
  return db
    .select({
      ticketId: tickets.id,
      seatId: tickets.seatId,
      seatNumber: seats.seatNumber,
      rowId: rows.id,
      rowName: rows.rowName,
      areaId: areas.id,
      areaName: areas.name,
      status: tickets.status,
    })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .where(eq(tickets.orderId, orderId));
}
