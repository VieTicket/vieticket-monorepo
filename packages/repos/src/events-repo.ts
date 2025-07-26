import { db } from "@vieticket/db/pg";
import { areas, events } from "@vieticket/db/pg/schemas/events";
import { eq, sql } from "drizzle-orm";

/**
 * Fetches a single event by its ID.
 * @param eventId - The ID of the event to fetch.
 * @returns The event data or null if not found.
 */
export async function findEventById(eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  return event;
}

/**
 * Fetches the complete seating structure for an event, including areas, rows, and seats.
 * @param eventId - The ID of the event.
 * @returns An object containing arrays of areas, rows, and seats for the event.
 */
export async function getEventSeatingStructure(eventId: string) {
  const eventAreas = await db.query.areas.findMany({
    where: eq(areas.eventId, eventId),
    with: {
      rows: {
        with: {
          seats: true,
        },
      },
    },
  });

  return eventAreas;
}

/**
 * Finds all active events for a given organizer.
 * "Active" means events that are approved and have not ended yet.
 * @param organizerId - The ID of the organizer.
 * @returns An array of active events.
 */
export async function findActiveEventsByOrganizerId(organizerId: string) {
  // "Active" means events that are approved and have not ended yet
  const now = new Date();
  const activeEvents = await db.query.events.findMany({
    where: (event, { and, eq, gt }) =>
      and(
        eq(event.organizerId, organizerId),
        eq(event.approvalStatus, "approved"),
        gt(event.endTime, now)
      ),
  });
  return activeEvents;
}

/**
 * Finds all ended events for a given organizer.
 * "Ended" means events that are approved and have ended.
 * @param organizerId - The ID of the organizer.
 * @returns An array of ended events.
 */
export async function findEndedEventsByOrganizerId(organizerId: string) {
  const now = new Date();
  const endedEvents = await db.query.events.findMany({
    where: (event, { and, eq, lt }) =>
      and(
        eq(event.organizerId, organizerId),
        eq(event.approvalStatus, "approved"),
        lt(event.endTime, now),
        sql`NOT EXISTS (
          SELECT 1
          FROM payout_requests
          WHERE payout_requests."event_id" = ${event.id}
            AND payout_requests.status NOT IN ('cancelled', 'rejected')
        )`
      ),
  });
  return endedEvents;
}

