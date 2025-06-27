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
} from "../queries/events-mutation";
import { db } from "../db";
import { createEventInputSchema } from "../validaters/validateEvent";
import { Event, NewEvent } from "@vieticket/db/postgres/schema";
import { getEventBySlug } from "../queries/events";
export async function createEventWithMultipleAreas(
  event: NewEvent,
  areas: {
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
    const [createdEvent] = await createEvent(validEvent);

    for (const area of areas) {
      const [createdArea] = await createArea({
        eventId: createdEvent.id,
        name: area.name,
        price: area.ticketPrice,
      });

      const [createdRow] = await createRow({
        areaId: createdArea.id,
        rowName: "A",
      });

      const seatValues = Array.from({ length: area.seatCount }, (_, i) => ({
        rowId: createdRow.id,
        seatNumber: (i + 1).toString(),
      }));

      if (seatValues.length > 0) {
        await createSeats(seatValues);
      }
    }
  });
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
  return await getEventsByOrganizerId(organizerId);
}
export const getEventById = async (eventId: string) => {
  const result = await getEventsById(eventId);
  return result[0] || null;
};
