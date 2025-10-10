import { db } from "../db";
import { eq, sql } from "drizzle-orm";

import {
  events,
  NewEvent,
  areas,
  rows,
  seats,
  showings,
} from "@vieticket/db/pg/schema";

export async function createEvent(event: NewEvent) {
  return db.insert(events).values(event).returning();
}

export async function createShowing(showing: {
  eventId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  seatMapId?: string | null;
}) {
  return db.insert(showings).values(showing).returning();
}

export async function createArea(area: {
  eventId: string;
  name: string;
  price: number;
  showingId?: string;
}) {
  return db.insert(areas).values(area).returning();
}

export async function createRow(row: { areaId: string; rowName: string }) {
  return db.insert(rows).values(row).returning();
}

export async function createSeats(
  seatsData: {
    rowId: string;
    seatNumber: string;
  }[]
) {
  return db.insert(seats).values(seatsData);
}

export async function getEventsByOrganizerId(organizerId: string) {
  return db.select().from(events).where(eq(events.organizerId, organizerId));
}

export async function getEventsById(eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      organizer: true,
      areas: {
        with: {
          rows: {
            with: {
              seats: true,
            },
          },
        },
      },
      showings: true,
    },
  });

  return event ? [event] : [];
}

export async function updateEventById(
  eventId: string,
  data: Partial<typeof events.$inferInsert>
) {
  return db.update(events).set(data).where(eq(events.id, eventId)).returning();
}
export async function updateAreaById(
  areaId: string,
  data: Partial<typeof areas.$inferInsert>
) {
  return db.update(areas).set(data).where(eq(areas.id, areaId)).returning();
}
export async function updateRowById(
  rowId: string,
  data: Partial<typeof rows.$inferInsert>
) {
  return db.update(rows).set(data).where(eq(rows.id, rowId)).returning();
}
export async function updateSeatById(
  seatId: string,
  data: Partial<typeof seats.$inferInsert>
) {
  return db.update(seats).set(data).where(eq(seats.id, seatId)).returning();
}
export async function getAreasByEventId(eventId: string) {
  return db.select().from(areas).where(eq(areas.eventId, eventId));
}
export async function getRowsByAreaId(areaId: string) {
  return db.select().from(rows).where(eq(rows.areaId, areaId));
}
export async function deleteAreasByEventId(eventId: string) {
  return db.delete(areas).where(eq(areas.eventId, eventId));
}

export async function deleteSeatsByRowId(rowId: string) {
  return db.delete(seats).where(eq(seats.rowId, rowId));
}

export async function createAreaWithId(area: {
  id: string;
  eventId: string;
  name: string;
  price: number;
}) {
  return db
    .insert(areas)
    .values({
      id: area.id,
      eventId: area.eventId,
      name: area.name,
      price: area.price,
    })
    .returning();
}

export async function createRowWithId(row: {
  id: string;
  areaId: string;
  rowName: string;
}) {
  return db
    .insert(rows)
    .values({
      id: row.id,
      areaId: row.areaId,
      rowName: row.rowName,
    })
    .returning();
}

export async function createSeatsWithIds(
  seatsData: {
    id: string;
    rowId: string;
    seatNumber: string;
  }[]
) {
  return db.insert(seats).values(seatsData);
}

export async function incrementEventView(eventId: string) {
  return db
    .update(events)
    .set({
      views: sql`${events.views} + 1`,
    })
    .where(eq(events.id, eventId));
}
