import { db } from "@vieticket/db/pg";
import { ticketInspectionHistory, tickets } from "@vieticket/db/pg/schemas/orders";
import { seats, rows, areas, events } from "@vieticket/db/pg/schemas/events";
import { and, eq } from "drizzle-orm";
import { TicketInspectionStatus } from "@vieticket/db/pg/schema";

/**
 * Checks if a ticket belongs to an event organized by the given organizer.
 * @param ticketId - The ticket ID to check.
 * @param organizerId - The organizer's user ID.
 * @returns true if the ticket belongs to the organizer, false otherwise.
 */
export async function isTicketOwnedByOrganizer(ticketId: string, organizerId: string): Promise<boolean> {
    const [result] = await db
        .select({ ticketId: tickets.id })
        .from(tickets)
        .innerJoin(seats, eq(tickets.seatId, seats.id))
        .innerJoin(rows, eq(seats.rowId, rows.id))
        .innerJoin(areas, eq(rows.areaId, areas.id))
        .innerJoin(events, eq(areas.eventId, events.id))
        .where(and(
            eq(tickets.id, ticketId),
            eq(events.organizerId, organizerId)
        ))
        .limit(1);

    return !!result;
}


/**
 * Atomically checks in a ticket and logs the inspection in a single transaction.
 * @param ticketId - The ID of the ticket
 * @param inspectorId - The ID of the inspector
 * @returns The updated ticket and inspection log
 */
export async function atomicCheckInAndLog(
  ticketId: string,
  inspectorId: string
) {
  return db.transaction(async (tx) => {
    // 1. Get the ticket (FOR UPDATE to lock the row)
    const [ticket] = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      // Log invalid inspection
      const [log] = await tx
        .insert(ticketInspectionHistory)
        .values({
          ticketId,
          inspectorId,
          status: "invalid" as TicketInspectionStatus,
        })
        .returning();
      return { ticket: null, inspectionLog: log, status: "not_found" };
    }

    if (ticket.status === "used") {
      // Log duplicate inspection
      const [log] = await tx
        .insert(ticketInspectionHistory)
        .values({
          ticketId,
          inspectorId,
          status: "duplicate" as TicketInspectionStatus,
        })
        .returning();
      return { ticket, inspectionLog: log, status: "duplicate" };
    }

    if (ticket.status !== "active") {
      // Log invalid inspection
      const [log] = await tx
        .insert(ticketInspectionHistory)
        .values({
          ticketId,
          inspectorId,
          status: "invalid" as TicketInspectionStatus,
        })
        .returning();
      return { ticket, inspectionLog: log, status: "not_active" };
    }

    // 2. Update ticket status to 'used'
    const [updatedTicket] = await tx
      .update(tickets)
      .set({ status: "used" })
      .where(eq(tickets.id, ticketId))
      .returning();

    // 3. Log valid inspection
    const [log] = await tx
      .insert(ticketInspectionHistory)
      .values({
        ticketId,
        inspectorId,
        status: "valid" as TicketInspectionStatus,
      })
      .returning();

    return { ticket: updatedTicket, inspectionLog: log, status: "success" };
  });
}