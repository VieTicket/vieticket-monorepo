import { db } from "@vieticket/db/pg";
import { areas, events, showings } from "@vieticket/db/pg/schemas/events";
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
 * Fetches an event with its showings by event ID.
 * @param eventId - The ID of the event to fetch.
 * @returns The event data with showings or null if not found.
 */
export async function findEventWithShowings(eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      showings: {
        where: (showing, { eq, and, gte }) =>
          and(eq(showing.isActive, true), gte(showing.startTime, new Date())),
        orderBy: (showing, { asc }) => [asc(showing.startTime)],
      },
    },
  });

  return event;
}

/**
 * Fetches the complete seating structure for a showing, including areas, rows, and seats.
 * @param showingId - The ID of the showing.
 * @returns An object containing arrays of areas, rows, and seats for the showing.
 */
export async function getShowingSeatingStructure(showingId: string) {
  console.log("Debug - getShowingSeatingStructure start:", { showingId });

  // First try to get areas specific to this showing
  let showingAreas = await db.query.areas.findMany({
    where: eq(areas.showingId, showingId),
    with: {
      rows: {
        with: {
          seats: true,
        },
      },
    },
  });

  console.log("Debug - showing-specific areas:", {
    showingId,
    showingSpecificAreasCount: showingAreas.length,
  });

  // If no showing-specific areas found, get the event areas
  if (showingAreas.length === 0) {
    console.log("Debug - no showing-specific areas, trying event areas");

    // Get the showing to find its eventId
    const showing = await db.query.showings.findFirst({
      where: eq(showings.id, showingId),
    });

    console.log("Debug - found showing:", {
      showingId,
      foundShowing: !!showing,
      eventId: showing?.eventId,
    });

    if (showing) {
      showingAreas = await db.query.areas.findMany({
        where: eq(areas.eventId, showing.eventId),
        with: {
          rows: {
            with: {
              seats: true,
            },
          },
        },
      });

      console.log("Debug - event areas fallback:", {
        eventId: showing.eventId,
        eventAreasCount: showingAreas.length,
      });
    }
  }

  console.log("Debug - final getShowingSeatingStructure result:", {
    showingId,
    finalAreasCount: showingAreas.length,
    areasData:
      showingAreas?.map((area, index) => ({
        index,
        areaId: area.id,
        areaName: area.name,
        areaEventId: area.eventId,
        areaShowingId: area.showingId,
        rowsCount: area.rows?.length || 0,
        totalSeats:
          area.rows?.reduce(
            (total, row) => total + (row.seats?.length || 0),
            0
          ) || 0,
      })) || [],
  });

  return showingAreas;
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

  console.log("Debug - getEventSeatingStructure result:", {
    eventId,
    areasCount: eventAreas?.length || 0,
    areasData:
      eventAreas?.map((area, index) => ({
        index,
        areaId: area.id,
        areaName: area.name,
        areaPrice: area.price,
        rowsCount: area.rows?.length || 0,
        totalSeats:
          area.rows?.reduce(
            (total, row) => total + (row.seats?.length || 0),
            0
          ) || 0,
      })) || [],
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
