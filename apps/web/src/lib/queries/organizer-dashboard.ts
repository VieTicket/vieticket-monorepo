import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  tickets,
  seats,
  rows,
  areas,
  events,
} from "@vieticket/db/postgres/schema";
import { eq, and } from "drizzle-orm";

export const getRevenueOverTime = async (organizerId: string) => {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.orderDate})`,
      total: sql<number>`SUM(${orders.totalAmount})`,
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.organizerId, organizerId)))
    .groupBy(sql`DATE_TRUNC('day', ${orders.orderDate})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.orderDate})`);
  console.log("Revenue Distribution Result:", result); // <-- Thêm dòng này
  return result;
};
export const getRevenueDistributionByEvent = async (organizerId: string) => {
  const result = await db
    .select({
      eventName: events.name,
      total: sql<number>`SUM(${orders.totalAmount})`,
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.organizerId, organizerId)))
    .groupBy(events.id, events.name)
    .orderBy(sql`SUM(${orders.totalAmount}) DESC`);
  console.log("getRevenueDistributionByEvent Result:", result); // <-- Thêm dòng này
  return result;
};
export const getTopRevenueEvents = async (organizerId: string, limit = 5) => {
  console.log("organizerId ", organizerId);
  const result = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      totalRevenue: sql<number>`SUM(${orders.totalAmount})`,
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.organizerId, organizerId)))
    .groupBy(events.id, events.name)
    .orderBy(sql`SUM(${orders.totalAmount}) DESC`)
    .limit(limit);
  console.log("getTopRevenueEvents Result:", result); // <-- Thêm dòng này
  return result;
};
