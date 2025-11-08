import { SeatMapGridData } from "@/types/event-types";
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
  getEventByIdOptimized,
  getEventsByOrganizerOptimized,
  incrementEventView,
  updateEventById,
  updateEventWithShowingsIndividualOptimized,
  updateEventWithShowingsOptimized
} from "../queries/events-mutation";
import { createEventInputSchema } from "../validaters/validateEvent";

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
  grids: SeatMapGridData[],
  defaultSeatSettings: any
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
    console.log("✅ Event created:", createdEventId);

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
      console.log(`✅ Showing created: ${createdShowing.name}`);
    }

    for (const showing of createdShowings) {
      console.log(`📊 Processing ${grids.length} grids for: ${showing.name}`);

      for (const grid of grids) {
        const gridPrice =
          grid.seatSettings?.price || defaultSeatSettings?.price || 0;

        await createAreaWithId({
          id: grid.id,
          eventId: createdEvent.id,
          showingId: showing.id,
          name: grid.name,
          price: gridPrice,
        });

        for (const row of grid.rows) {
          await createRowWithId({
            id: row.id,
            areaId: grid.id,
            rowName: row.name,
          });

          const seatValues = row.seats.map((seatId) => ({
            id: seatId,
            rowId: row.id,
            seatNumber: seatId.split("-").pop() || seatId,
          }));

          if (seatValues.length > 0) {
            await createSeatsWithIds(seatValues);
          }
        }
      }
      console.log(`  ✅ Created ${grids.length} grids for: ${showing.name}`);
    }
  });

  return createdEventId ? { eventId: createdEventId } : null;
}

/**
 * ✅ Create event with showings using seat map (individual mode)
 * Each showing has its own seat map configuration
 */
export async function createEventWithShowingsAndSeatMapIndividual(
  event: NewEvent,
  showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[],
  showingSeatMapConfigs: SeatMapGridData[][],
  defaultSeatSettings: any
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
    console.log("✅ Event created:", createdEventId);

    for (let i = 0; i < showings.length; i++) {
      const showing = showings[i];
      const grids = showingSeatMapConfigs[i] || [];

      const [createdShowing] = await createShowing({
        eventId: createdEvent.id,
        name: showing.name,
        startTime: showing.startTime,
        endTime: showing.endTime,
        ticketSaleStart: showing.ticketSaleStart || null,
        ticketSaleEnd: showing.ticketSaleEnd || null,
        seatMapId: showing.seatMapId || null,
      });
      console.log(`✅ Showing ${i + 1} created: ${createdShowing.name}`);
      console.log(`📊 Processing ${grids.length} grids for showing ${i + 1}`);

      for (const grid of grids) {
        const gridPrice =
          grid.seatSettings?.price || defaultSeatSettings?.price || 0;

        const uniqueGridId = uuidv4();

        await createAreaWithId({
          id: uniqueGridId,
          eventId: createdEvent.id,
          showingId: createdShowing.id,
          name: grid.name,
          price: gridPrice,
        });

        console.log(`    ✅ Area created: ${grid.name} (${uniqueGridId})`);

        for (const row of grid.rows) {
          const uniqueRowId = uuidv4();

          await createRowWithId({
            id: uniqueRowId,
            areaId: uniqueGridId,
            rowName: row.name,
          });

          const seatValues = row.seats.map((_, idx) => ({
            id: uuidv4(),
            rowId: uniqueRowId,
            seatNumber: `${row.name}-${idx + 1}`,
          }));

          if (seatValues.length > 0) {
            await createSeatsWithIds(seatValues);
          }

          console.log(`      ✅ Row ${row.name}: ${seatValues.length} seats`);
        }
      }
      console.log(`  ✅ Created ${grids.length} grids for showing ${i + 1}`);
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

/**
 * ✅ Update event with showings using seat map (copy mode)
 */
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
  grids: SeatMapGridData[],
  defaultSeatSettings: any
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
    console.log("✅ Event updated:", event.id);

    await deleteAreasByEventId(event.id);
    await deleteShowingsByEventId(event.id);
    console.log("🗑️ Old showings and areas deleted");

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
      console.log(`✅ Showing created: ${createdShowing.name}`);
    }

    for (const showing of createdShowings) {
      console.log(`📊 Processing ${grids.length} grids for: ${showing.name}`);

      for (const grid of grids) {
        const gridPrice =
          grid.seatSettings?.price || defaultSeatSettings?.price || 0;

        await createAreaWithId({
          id: grid.id,
          eventId: event.id,
          showingId: showing.id,
          name: grid.name,
          price: gridPrice,
        });

        for (const row of grid.rows) {
          await createRowWithId({
            id: row.id,
            areaId: grid.id,
            rowName: row.name,
          });

          const seatValues = row.seats.map((seatId) => ({
            id: seatId,
            rowId: row.id,
            seatNumber: seatId.split("-").pop() || seatId,
          }));

          if (seatValues.length > 0) {
            await createSeatsWithIds(seatValues);
          }
        }
      }
      console.log(`  ✅ Created ${grids.length} grids for: ${showing.name}`);
    }
  });
}

/**
 * ✅ Update event with showings using seat map (individual mode)
 */
export async function updateEventWithShowingsAndSeatMapIndividual(
  event: Event,
  showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[],
  showingSeatMapConfigs: SeatMapGridData[][],
  defaultSeatSettings: any
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
    console.log("✅ Event updated:", event.id);

    await deleteAreasByEventId(event.id);
    await deleteShowingsByEventId(event.id);
    console.log("🗑️ Old showings and areas deleted");

    for (let i = 0; i < showings.length; i++) {
      const showing = showings[i];
      const grids = showingSeatMapConfigs[i] || [];

      const [createdShowing] = await createShowing({
        eventId: event.id,
        name: showing.name,
        startTime: showing.startTime,
        endTime: showing.endTime,
        ticketSaleStart: showing.ticketSaleStart || null,
        ticketSaleEnd: showing.ticketSaleEnd || null,
        seatMapId: showing.seatMapId || null,
      });
      console.log(`✅ Showing ${i + 1} created: ${createdShowing.name}`);
      console.log(`📊 Processing ${grids.length} grids for showing ${i + 1}`);

      for (const grid of grids) {
        const gridPrice =
          grid.seatSettings?.price || defaultSeatSettings?.price || 0;

        const uniqueGridId = uuidv4();

        await createAreaWithId({
          id: uniqueGridId,
          eventId: event.id,
          showingId: createdShowing.id,
          name: grid.name,
          price: gridPrice,
        });

        for (const row of grid.rows) {
          const uniqueRowId = uuidv4();

          await createRowWithId({
            id: uniqueRowId,
            areaId: uniqueGridId,
            rowName: row.name,
          });

          const seatValues = row.seats.map((_, idx) => ({
            id: uuidv4(),
            rowId: uniqueRowId,
            seatNumber: `${row.name}-${idx + 1}`,
          }));

          if (seatValues.length > 0) {
            await createSeatsWithIds(seatValues);
          }
        }
      }
      console.log(`  ✅ Created ${grids.length} grids for showing ${i + 1}`);
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
  const result = await getEventByIdOptimized(eventId);
  return result[0] || null;
}
