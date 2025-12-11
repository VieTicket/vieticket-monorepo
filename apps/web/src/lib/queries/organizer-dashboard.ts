import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  tickets,
  seats,
  rows,
  areas,
  events,
  user,
  OrderStatus,
} from "@vieticket/db/pg/schema";
import { eq, and } from "drizzle-orm";

export const getRevenueOverTime = async (organizerId: string) => {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.orderDate})`,
      total: sql<number>`SUM(${areas.price})`, // Sum ticket prices, not order total
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
  console.log("getRevenueOverTime", result);
  // Convert strings to numbers if needed
  return result.map((row) => ({
    ...row,
    total:
      typeof row.total === "string" ? Number.parseFloat(row.total) : row.total,
  }));
};
export const getRevenueDistributionByEvent = async (organizerId: string) => {
  const result = await db
    .select({
      eventName: events.name,
      total: sql<number>`SUM(${areas.price})`, // Sum ticket prices per event
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.organizerId, organizerId)))
    .groupBy(events.id, events.name)
    .orderBy(sql`SUM(${areas.price}) DESC`);
  console.log("getRevenueDistributionByEvent Result:", result);
  return result.map((row) => ({
    ...row,
    total:
      typeof row.total === "string" ? Number.parseFloat(row.total) : row.total,
  }));
};

export const getTopRevenueEvents = async (organizerId: string, limit = 5) => {
  console.log("organizerId ", organizerId);
  const result = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      totalRevenue: sql<number>`SUM(${areas.price})`, // Sum ticket prices
      ticketsSold: sql<number>`COUNT(${tickets.id})`,
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.organizerId, organizerId)))
    .groupBy(events.id, events.name)
    .orderBy(sql`SUM(${areas.price}) DESC`)
    .limit(limit);
  console.log("getTopRevenueEvents Result:", result);
  return result.map((row) => ({
    ...row,
    totalRevenue:
      typeof row.totalRevenue === "string"
        ? Number.parseFloat(row.totalRevenue)
        : row.totalRevenue,
    ticketsSold:
      typeof row.ticketsSold === "string"
        ? Number.parseFloat(row.ticketsSold)
        : row.ticketsSold,
  }));
};
export const getRevenueOverTimeByEvent = async (eventId: string) => {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.orderDate})`,
      total: sql<number>`SUM(${areas.price})`, // Sum price of each ticket sold
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.id, eventId)))
    .groupBy(sql`DATE_TRUNC('day', ${orders.orderDate})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.orderDate}) ASC`);

  return result.map((row) => ({
    ...row,
    total: typeof row.total === "string" ? Number(row.total) : row.total,
  }));
};

export const getRevenueDistributionForSingleEvent = async (eventId: string) => {
  const result = await db
    .select({
      eventName: events.name,
      total: sql<number>`SUM(${areas.price})`, // Sum ticket prices
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(orders.status, "paid"), eq(events.id, eventId)))
    .groupBy(events.id, events.name);

  return result.map((row) => ({
    ...row,
    total: typeof row.total === "string" ? Number(row.total) : row.total,
  }));
};
export const getTicketTypeRevenueByEvent = async (eventId: string) => {
  const result = await db
    .select({
      ticketType: areas.name,
      price: areas.price,
      ticketsSold: sql<number>`COUNT(${tickets.id})`,
      revenue: sql<number>`(${areas.price} * COUNT(${tickets.id}))`,
    })
    .from(orders)
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(events.id, eventId), eq(orders.status, "paid")))
    .groupBy(areas.name, areas.price)
    .orderBy(areas.name);

  return result.map((row) => ({
    ticketType: row.ticketType,
    revenue:
      typeof row.revenue === "string" ? Number(row.revenue) : row.revenue,
    ticketsSold:
      typeof row.ticketsSold === "string"
        ? Number(row.ticketsSold)
        : row.ticketsSold,
  }));
};
export const getTotalAvailableSeatsByEvent = async (eventId: string) => {
  const result = await db
    .select({
      totalSeats: sql<number>`COUNT(${seats.id})`,
    })
    .from(seats)
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(eq(events.id, eventId));
  console.log("total ticket sold", result);
  const total = result[0]?.totalSeats ?? 0;
  return typeof total === "string" ? Number(total) : total;
};
export const getOrdersByEvent = async (eventId: string) => {
  const result = await db
    .select({
      id: orders.id,
      date: orders.orderDate,
      ticketType: areas.name,
      quantity: sql<number>`COUNT(${tickets.id})`,
      amount: sql<number>`SUM(${areas.price})`,
      status: orders.status,
      userName: user.name,
    })
    .from(orders)
    .innerJoin(user, eq(orders.userId, user.id))
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(eq(events.id, eventId))
    .groupBy(
      orders.id,
      orders.orderDate,
      orders.status,
      areas.name,
      areas.price,
      user.id,
      user.name,
      user.email
    );

  return result.map((row) => ({
    id: row.id,
    date: row.date ? row.date.toISOString().split("T")[0] : "Chưa xác định",
    ticketType: row.ticketType,
    quantity:
      typeof row.quantity === "string" ? Number(row.quantity) : row.quantity,
    amount: typeof row.amount === "string" ? Number(row.amount) : row.amount,
    status: row.status as OrderStatus, // ép kiểu nếu bạn có enum
    userName: row.userName,
  }));
};
