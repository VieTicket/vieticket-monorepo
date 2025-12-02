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

  // If no showing-specific areas found, get the event areas
  if (showingAreas.length === 0) {
    // Get the showing to find its eventId
    const showing = await db.query.showings.findFirst({
      where: eq(showings.id, showingId),
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
    }
  }

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
 * Finds all active events for a given organization.
 * "Active" means events that are approved and have not ended yet.
 * @param organizationId - The ID of the organization.
 * @returns An array of active events.
 */
export async function findActiveEventsByOrganizationId(organizationId: string) {
  const now = new Date();
  const activeEvents = await db.query.events.findMany({
    where: (event, { and, eq, gt }) =>
      and(
        eq(event.organizationId, organizationId),
        eq(event.approvalStatus, "approved"),
        gt(event.endTime, now)
      ),
  });
  return activeEvents;
}

/**
 * Finds all active events accessible to a user (created by them or in their organization).
 * "Active" means events that are approved and have not ended yet.
 * @param userId - The ID of the user.
 * @param organizationId - Optional organization ID to include organization events.
 * @returns An array of active events.
 */
export async function findAccessibleActiveEvents(
  userId: string,
  organizationId?: string | null
) {
  const now = new Date();
  
  // If organization context exists, get events from both user and organization
  if (organizationId) {
    const [userEvents, orgEvents] = await Promise.all([
      db.query.events.findMany({
        where: (event, { and, eq, gt }) =>
          and(
            eq(event.organizerId, userId),
            eq(event.approvalStatus, "approved"),
            gt(event.endTime, now)
          ),
      }),
      db.query.events.findMany({
        where: (event, { and, eq, gt }) =>
          and(
            eq(event.organizationId, organizationId),
            eq(event.approvalStatus, "approved"),
            gt(event.endTime, now)
          ),
      }),
    ]);
    
    // Merge and deduplicate events
    const allEvents = [...userEvents, ...orgEvents];
    const uniqueEvents = Array.from(
      new Map(allEvents.map(event => [event.id, event])).values()
    );
    return uniqueEvents;
  }
  
  // No organization context, just return user's events
  return db.query.events.findMany({
    where: (event, { and, eq, gt }) =>
      and(
        eq(event.organizerId, userId),
        eq(event.approvalStatus, "approved"),
        gt(event.endTime, now)
      ),
  });
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

/**
 * Links an event to an organization by updating its organizationId.
 * @param eventId - The ID of the event to link.
 * @param organizationId - The organization ID to link to (or null to unlink).
 * @returns The updated event or undefined if not found.
 */
export async function linkEventToOrganization(
  eventId: string,
  organizationId: string | null
) {
  const [updatedEvent] = await db
    .update(events)
    .set({ organizationId })
    .where(eq(events.id, eventId))
    .returning();
  
  return updatedEvent;
}
