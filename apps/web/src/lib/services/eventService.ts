import {
  createEvent,
  createArea,
  createRow,
  createSeats,
} from "../queries/events-mutation";
import { db } from "../db";
import { createEventInputSchema } from "../validaters/validateEvent";
import { NewEvent } from "@vieticket/db/postgres/schema";
import { getEventBySlug } from "../queries/events";

export async function createEventWithStructure(
  event: NewEvent,
  seatCount: number,
  ticketPrice: number
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
    // 1. Create Event
    const [createdEvent] = await createEvent(validEvent);

    // 2. Create Area
    const [createdArea] = await createArea({
      eventId: createdEvent.id,
      name: "Default Area",
      price: ticketPrice,
    });

    // 3. Create Row
    const [createdRow] = await createRow({
      areaId: createdArea.id,
      rowName: "A",
    });

    // 4. Create Seats
    const seatValues = Array.from({ length: seatCount }, (_, i) => ({
      rowId: createdRow.id,
      seatNumber: (i + 1).toString(),
    }));

    if (seatValues.length > 0) {
      await createSeats(seatValues);
    }
  });
}
export async function fetchEventDetail(slug: string) {
  const event = await getEventBySlug(slug);

  if (!event) throw new Error("Event not found");
  return event;
}
