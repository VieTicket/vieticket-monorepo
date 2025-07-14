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
  console.log("getRevenueOverTime", result); // <-- Thêm dòng này
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
      totalRevenue: sql<number>`SUM(${orders.totalAmount})`,
      ticketsSold: sql<number>`COUNT(${tickets.id})`, // Add this line
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
  console.log("getTopRevenueEvents Result:", result);
  return result.map((row) => ({
    ...row,
    totalRevenue:
      typeof row.totalRevenue === "string"
        ? Number.parseFloat(row.totalRevenue)
        : row.totalRevenue,
  }));
  return result;
};
export const getRevenueOverTimeByEvent = async (eventId: string) => {
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
    .where(and(eq(orders.status, "paid"), eq(events.id, eventId)))
    .groupBy(sql`DATE_TRUNC('day', ${orders.orderDate})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.orderDate})`);

  return result.map((row) => ({
    ...row,
    total: typeof row.total === "string" ? Number(row.total) : row.total,
  }));
};

export const getRevenueDistributionForSingleEvent = async (eventId: string) => {
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

  const total = result[0]?.totalSeats ?? 0;
  return typeof total === "string" ? Number(total) : total;
};
export const getOrdersByEvent = async (eventId: string) => {
  const result = await db
    .select({
      id: orders.id,
      date: orders.orderDate,
      ticketType: areas.name,
      amount: areas.price,
      status: orders.status,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
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
    amount: typeof row.amount === "string" ? Number(row.amount) : row.amount,
    status: row.status as OrderStatus, // ép kiểu nếu bạn có enum
  }));
};
