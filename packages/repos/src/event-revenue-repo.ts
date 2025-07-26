import { db } from "@vieticket/db/pg";
import { events } from "@vieticket/db/pg/schemas/events";
import { orders } from "@vieticket/db/pg/schemas/orders";
import { tickets } from "@vieticket/db/pg/schemas/orders";
import { seats } from "@vieticket/db/pg/schemas/events";
import { rows } from "@vieticket/db/pg/schemas/events";
import { areas } from "@vieticket/db/pg/schemas/events";
import { eq, and, sum } from "drizzle-orm";

export async function getEventRevenue(eventId: string): Promise<number> {
  const result = await db
    .select({ total: sum(areas.price) })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(
      eq(events.id, eventId),
      eq(orders.status, 'paid')
    ))
    .execute();

  return Number(result[0]?.total) || 0;
}