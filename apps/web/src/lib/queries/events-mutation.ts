import { db } from "../db";
import { eq } from "drizzle-orm";

import {
  events,
  NewEvent,
  areas,
  rows,
  seats,
} from "@vieticket/db/postgres/schema";

export async function createEvent(event: NewEvent) {
  return db.insert(events).values(event).returning();
}

export async function createArea(area: {
  eventId: string;
  name: string;
  price: number;
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

export async function getEventsByOrganizer(organizerId: string) {
  return db.select().from(events).where(eq(events.organizerId, organizerId));
}
