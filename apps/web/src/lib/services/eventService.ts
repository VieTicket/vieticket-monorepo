import {
  createEvent,
  createArea,
  createRow,
  createSeats,
  getEventsById,
  updateEventById,
  getEventsByOrganizerId,
  getAreasByEventId,
  updateAreaById,
  getRowsByAreaId,
  deleteSeatsByRowId,
  deleteAreasByEventId,
  deleteShowingsByEventId,
  createAreaWithId,
  createRowWithId,
  createSeatsWithIds,
  incrementEventView,
  createShowing,
  updateEventWithShowingsOptimized,
  updateEventWithShowingsIndividualOptimized,
  createEventWithShowingsOptimized,
  createEventWithShowingsIndividualOptimized,
  createEventWithAreasOptimized,
  getEventByIdOptimized,
  getEventsByOrganizerOptimized,
  checkEventSeatsData,
} from "../queries/events-mutation";
import { db } from "../db";
import { createEventInputSchema } from "../validaters/validateEvent";
import { Event, NewEvent } from "@vieticket/db/pg/schema";
import { getEventBySlug } from "../queries/events";
import { SeatMapPreviewData } from "@/types/event-types";
export async function createEventWithMultipleAreas(
  event: NewEvent,
  areas: {
    name: string;
    seatCount: number;
    ticketPrice: number;
  }[]
): Promise<{ eventId: string } | null> {
  const result = createEventInputSchema.safeParse(event);
  console.log("DEBUG validation input:", event);
  if (!result.success) {
    console.log("DEBUG validation errors:", result.error.issues);
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n")
    );
  }

  const validEvent = result.data;
  console.log("DEBUG validated event:", validEvent);

  try {
    // Use optimized bulk operation for creating event with areas
    const { eventId } = await createEventWithAreasOptimized(validEvent, areas);
    return { eventId };
  } catch (error) {
    console.error("Error creating event with areas:", error);
    return null;
  }
}

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
  console.log(
    "DEBUG validation result for createEventWithShowingsAndAreas:",
    result
  );
  if (!result.success) {
    console.error("Validation failed:", result.error.issues);
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("\n")
    );
  }

  const validEvent = result.data;
  console.log("DEBUG validEvent after validation:", validEvent);

  try {
    // Use optimized bulk operation for creating event with showings (copy mode)
    const showingsData = showings.map((showing) => ({
      showing,
      areas,
    }));

    console.log(
      "DEBUG showingsData being passed to optimized function:",
      showingsData
    );

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
    // Use optimized bulk operation for creating event with individual showing configs
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

export async function updateEventWithMultipleAreas(
  event: Event,
  areasInput: {
    name: string;
    seatCount: number;
    ticketPrice: number;
  }[]
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
    // 1. Cập nhật event
    await updateEventById(event.id, validEvent);

    // 2. Lấy danh sách các area hiện có
    const existingAreas = await getAreasByEventId(event.id);

    for (let i = 0; i < areasInput.length; i++) {
      const input = areasInput[i];
      const existingArea = existingAreas[i];

      let areaId: string;

      if (existingArea) {
        // Cập nhật nếu đã có
        const [updatedArea] = await updateAreaById(existingArea.id, {
          name: input.name,
          price: input.ticketPrice,
        });
        areaId = updatedArea.id;
      } else {
        // Tạo mới nếu chưa có
        const [newArea] = await createArea({
          eventId: event.id,
          name: input.name,
          price: input.ticketPrice,
        });
        areaId = newArea.id;
      }

      // 3. Row: hiện tại dùng mặc định row "A"
      const existingRows = await getRowsByAreaId(areaId);
      const row =
        existingRows[0] ?? (await createRow({ areaId, rowName: "A" }))[0];

      // 4. Xóa và tạo lại toàn bộ seat trong row
      await deleteSeatsByRowId(row.id);
      const seatValues = Array.from({ length: input.seatCount }, (_, i) => ({
        rowId: row.id,
        seatNumber: (i + 1).toString(),
      }));
      await createSeats(seatValues);
    }
  });
}
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
    // Không throw error để không ảnh hưởng đến việc hiển thị trang
  }
}

// export async function getEventsByStatus(organizerId: string) {
//   const all = await getEventsByOrganizer(organizerId);
//   const now = new Date();

//   return {
//     pending: all.filter((e) => e.approvalStatus === "pending"),
//     approved: all.filter(
//       (e) => e.approvalStatus === "approved" && new Date(e.endTime) > now
//     ),
//     rejected: all.filter((e) => e.approvalStatus === "rejected"),
//     passed: all.filter((e) => new Date(e.endTime) < now),
//   };
// }

export async function getEventsByOrganizer(organizerId: string) {
  // Use optimized function for much faster loading of organizer's events
  return await getEventsByOrganizerOptimized(organizerId);
}
export const getEventById = async (eventId: string) => {
  // Use optimized function for much faster loading
  const result = await getEventByIdOptimized(eventId);
  return result[0] || null;
};

export async function createEventWithSeatMap(
  event: NewEvent,
  seatMapData: SeatMapPreviewData
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

    // Create areas, rows, and seats from seat map data using existing IDs
    for (const areaData of seatMapData.areas) {
      await createAreaWithId({
        id: areaData.id,
        eventId: createdEvent.id,
        name: areaData.name,
        price: areaData.price,
      });

      // Create rows and seats with their original IDs
      for (const rowData of areaData.rows) {
        await createRowWithId({
          id: rowData.id,
          areaId: areaData.id,
          rowName: rowData.rowName,
        });

        // Create seats for this row with their original IDs
        const seatValues = rowData.seats.map((seat) => ({
          id: seat.id,
          rowId: rowData.id,
          seatNumber: seat.seatNumber.toString(),
        }));

        if (seatValues.length > 0) {
          await createSeatsWithIds(seatValues);
        }
      }
    }
  });

  return createdEventId ? { eventId: createdEventId } : null;
}

export async function updateEventWithSeatMap(
  event: Event,
  seatMapData: SeatMapPreviewData
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
    // 1. Update event
    await updateEventById(event.id, validEvent);

    // 2. Remove all existing areas (cascade delete will automatically remove rows and seats)
    await deleteAreasByEventId(event.id);

    // 3. Create new areas, rows, and seats from seat map data using existing IDs
    for (const areaData of seatMapData.areas) {
      await createAreaWithId({
        id: areaData.id,
        eventId: event.id,
        name: areaData.name,
        price: areaData.price,
      });

      // Create rows and seats with their original IDs
      for (const rowData of areaData.rows) {
        await createRowWithId({
          id: rowData.id,
          areaId: areaData.id,
          rowName: rowData.rowName,
        });

        // Create seats for this row with their original IDs
        const seatValues = rowData.seats.map((seat) => ({
          id: seat.id,
          rowId: rowData.id,
          seatNumber: seat.seatNumber.toString(),
        }));

        if (seatValues.length > 0) {
          await createSeatsWithIds(seatValues);
        }
      }
    }
  });
}

// ========== OPTIMIZED UPDATE FUNCTIONS ==========

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
    // Prepare data for optimized function
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
    // Prepare data for optimized function
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
