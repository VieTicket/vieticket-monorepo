import { db } from "@vieticket/db/postgres";
import { areas, events } from "@vieticket/db/schemas/events";
import { eq } from "drizzle-orm";

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