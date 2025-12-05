import { Event, NewEvent } from "@vieticket/db/pg/schema";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { getEventBySlug } from "../queries/events";
import {
  createAreaWithId,
  createEvent,
  createEventWithShowingsIndividualOptimized,
  createEventWithShowingsOptimized,
  createRowWithId,
  createSeatsWithIds,
  createShowing,
  deleteAreasByEventId,
  deleteShowingsByEventId,
  getEventsById,
  getEventByIdOptimized,
  getEventsByOrganizerOptimized,
  incrementEventView,
  updateEventById,
  updateEventWithShowingsIndividualOptimized,
  updateEventWithShowingsOptimized,
  createSeatMapStructureBatch,
} from "../queries/events-mutation";
import { createEventInputSchema } from "../validaters/validateEvent";
import { GridShape, SeatGridSettings } from "@/components/seat-map/types";

/**
 * ✅ Create event with showings using simple ticketing (copy mode)
 * All showings share the same area configuration
 */
export async function createEventWithShowingsAndAreas(
  event: NewEvent,
  showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[],
  areas: {
    name: string;
    seatCount: number;
    ticketPrice: number;
  }[]
): Promise<{ eventId: string } | null> {
  const result = createEventInputSchema.safeParse(event);
  if (!result.success) {
    console.error("Validation failed:", result.error.issues);
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n")
    );
  }

  const validEvent = result.data;

  try {
    const showingsData = showings.map((showing) => ({
      showing,
      areas,
    }));

    const { eventId } = await createEventWithShowingsOptimized(
      validEvent,
      showingsData
    );
    return { eventId };
  } catch (error) {
    console.error("Error creating event with showings:", error);
    return null;
  }
}

/**
 * ✅ Create event with showings using simple ticketing (individual mode)
 * Each showing has its own area configuration
 */
export async function createEventWithShowingsAndAreasIndividual(
  event: NewEvent,
  showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[],
  showingAreaConfigs: Array<
    {
      name: string;
      seatCount: number;
      ticketPrice: number;
    }[]
  >
): Promise<{ eventId: string } | null> {
  const result = createEventInputSchema.safeParse(event);
  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n")
    );
  }

  const validEvent = result.data;

  try {
    const showingsData = showings.map((showing, index) => ({
      showing,
      areas: showingAreaConfigs[index] || [],
    }));

    const { eventId } = await createEventWithShowingsIndividualOptimized(
      validEvent,
      showingsData
    );
    return { eventId };
  } catch (error) {
    console.error(
      "Error creating event with individual showing configs:",
      error
    );
    return null;
  }
}

/**
 * ✅ Create event with showings using seat map (copy mode)
 * All showings share the same seat map configuration
 */
export async function createEventWithShowingsAndSeatMap(
  event: NewEvent,
  showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[],
  grids: GridShape[][],
  defaultSeatSettings: SeatGridSettings
): Promise<{ eventId: string } | null> {
  const result = createEventInputSchema.safeParse(event);
  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n")
    );
  }

  const validEvent = result.data;
  let createdEventId: string | null = null;

  await db.transaction(async () => {
    const [createdEvent] = await createEvent(validEvent);
    createdEventId = createdEvent.id;

    const createdShowings = [];
    for (const showing of showings) {
      const [createdShowing] = await createShowing({
        eventId: createdEvent.id,
        name: showing.name,
        startTime: showing.startTime,
        endTime: showing.endTime,
        ticketSaleStart: showing.ticketSaleStart || null,
        ticketSaleEnd: showing.ticketSaleEnd || null,
        seatMapId: showing.seatMapId || null,
      });
      createdShowings.push(createdShowing);
    }

    // Create seat map structure for all showings (copy mode - same structure)
    for (var i = 0; i < createdShowings.length; i++) {
      await createSeatMapStructureBatch(
        createdEvent.id,
        createdShowings[i].id,
        grids[i],
        defaultSeatSettings
      );
    }
  });

  return createdEventId ? { eventId: createdEventId } : null;
}

/**
 * ✅ Update event with showings using simple ticketing (copy mode)
 */
export async function updateEventWithShowingsAndAreas(
  eventPayload: Event,
  showings: Array<{
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }>,
  areas: Array<{
    name: string;
    seatCount: number;
    ticketPrice: number;
  }>
) {
  try {
    const showingsData = showings.map((showing) => ({
      showing,
      areas,
    }));

    return updateEventWithShowingsOptimized(eventPayload, showingsData);
  } catch (error) {
    console.error("Error updating event with showings:", error);
    return null;
  }
}

/**
 * ✅ Update event with showings using simple ticketing (individual mode)
 */
export async function updateEventWithShowingsAndAreasIndividual(
  eventPayload: Event,
  showings: Array<{
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }>,
  showingAreaConfigs: Array<
    Array<{
      name: string;
      seatCount: number;
      ticketPrice: number;
    }>
  >
) {
  try {
    const showingsData = showings.map((showing, index) => ({
      showing,
      areas: showingAreaConfigs[index] || [],
    }));

    return updateEventWithShowingsIndividualOptimized(
      eventPayload,
      showingsData
    );
  } catch (error) {
    console.error(
      "Error updating event with individual showing configs:",
      error
    );
    return null;
  }
}

export async function updateEventWithShowingsAndSeatMap(
  event: Event,
  showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[],
  grids: GridShape[][],
  defaultSeatSettings: SeatGridSettings,
  seatMapChanged: boolean = true // ✅ New flag to indicate if seat map changed
) {
  const result = createEventInputSchema.safeParse(event);
  if (!result.success) {
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n")
    );
  }

  const validEvent = result.data;

  await db.transaction(async () => {
    await updateEventById(event.id, validEvent);

    // ✅ Only delete and recreate areas/rows/seats if seat map changed
    if (seatMapChanged) {
      await deleteAreasByEventId(event.id);
      await deleteShowingsByEventId(event.id);

      const createdShowings = [];
      for (const showing of showings) {
        const [createdShowing] = await createShowing({
          eventId: event.id,
          name: showing.name,
          startTime: showing.startTime,
          endTime: showing.endTime,
          ticketSaleStart: showing.ticketSaleStart || null,
          ticketSaleEnd: showing.ticketSaleEnd || null,
          seatMapId: showing.seatMapId || null,
        });
        createdShowings.push(createdShowing);
      }

      // Create seat map structure for all showings
      for (let i = 0; i < createdShowings.length; i++) {
        await createSeatMapStructureBatch(
          event.id,
          createdShowings[i].id,
          grids[i],
          defaultSeatSettings
        );
      }
    } else {
      // ✅ Seat map didn't change - only update showings without touching areas/rows/seats
      await deleteShowingsByEventId(event.id);

      for (const showing of showings) {
        await createShowing({
          eventId: event.id,
          name: showing.name,
          startTime: showing.startTime,
          endTime: showing.endTime,
          ticketSaleStart: showing.ticketSaleStart || null,
          ticketSaleEnd: showing.ticketSaleEnd || null,
          seatMapId: showing.seatMapId || null,
        });
      }

      console.log(
        "✅ Seat map unchanged - preserved existing areas, rows, and seats"
      );
    }
  });
}

// ========== UTILITY FUNCTIONS ==========

export async function fetchEventDetail(slug: string) {
  const event = await getEventBySlug(slug);
  if (!event) throw new Error("Event not found");
  return event;
}

export async function incrementEventViewCount(eventId: string) {
  try {
    await incrementEventView(eventId);
  } catch (error) {
    console.error("Failed to increment view count:", error);
  }
}

export async function getEventsByOrganizer(organizerId: string) {
  return await getEventsByOrganizerOptimized(organizerId);
}

export async function getEventById(eventId: string) {
  const events = await getEventsById(eventId);
  return events[0] || null;
}
