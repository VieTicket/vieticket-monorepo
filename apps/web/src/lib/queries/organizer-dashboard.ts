import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  refunds,
  refundTickets,
  tickets,
  seats,
  rows,
  areas,
  events,
  user,
  OrderStatus,
} from "@vieticket/db/pg/schema";

const REVENUE_ORDER_STATUSES = ["paid", "partial_refunded", "refunded"] as const;

const REVENUE_CACHE_TTL_SECONDS = 3600;

function buildRefundSumsByOrderForOrganizer(organizerId: string) {
  return db
    .select({
      orderId: refunds.orderId,
      totalRefunded: sql<number>`COALESCE(SUM(${refunds.amount}), 0)`.as(
        "totalRefunded"
      ),
    })
    .from(refunds)
    .innerJoin(orders, eq(refunds.orderId, orders.id))
    .innerJoin(events, eq(orders.eventId, events.id))
    .where(
      and(
        eq(events.organizerId, organizerId),
        inArray(orders.status, [...REVENUE_ORDER_STATUSES]),
        eq(refunds.status, "refunded")
      )
    )
    .groupBy(refunds.orderId)
    .as("refund_sums");
}

function buildRefundSumsByOrderForEvent(eventId: string) {
  return db
    .select({
      orderId: refunds.orderId,
      totalRefunded: sql<number>`COALESCE(SUM(${refunds.amount}), 0)`.as(
        "totalRefunded"
      ),
    })
    .from(refunds)
    .innerJoin(orders, eq(refunds.orderId, orders.id))
    .where(
      and(
        eq(orders.eventId, eventId),
        inArray(orders.status, [...REVENUE_ORDER_STATUSES]),
        eq(refunds.status, "refunded")
      )
    )
    .groupBy(refunds.orderId)
    .as("refund_sums");
}

export const getRevenueOverTime = async (organizerId: string) => {
  const refundsByOrder = buildRefundSumsByOrderForOrganizer(organizerId);
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.orderDate})`,
      total: sql<number>`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0)`,
    })
    .from(orders)
    .innerJoin(events, eq(orders.eventId, events.id))
    .leftJoin(refundsByOrder, eq(refundsByOrder.orderId, orders.id))
    .where(
      and(
        inArray(orders.status, [...REVENUE_ORDER_STATUSES]),
        eq(events.organizerId, organizerId)
      )
    )
    .groupBy(sql`DATE_TRUNC('day', ${orders.orderDate})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.orderDate})`)
    .$withCache({
      tag: `organizer:${organizerId}:revenue_over_time`,
      config: { ex: REVENUE_CACHE_TTL_SECONDS },
    });
  // Convert strings to numbers if needed
  return result.map((row) => ({
    ...row,
    total:
      typeof row.total === "string" ? Number.parseFloat(row.total) : row.total,
  }));
};
export const getRevenueDistributionByEvent = async (organizerId: string) => {
  const refundsByOrder = buildRefundSumsByOrderForOrganizer(organizerId);
  const result = await db
    .select({
      eventName: events.name,
      total: sql<number>`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0)`,
    })
    .from(orders)
    .innerJoin(events, eq(orders.eventId, events.id))
    .leftJoin(refundsByOrder, eq(refundsByOrder.orderId, orders.id))
    .where(
      and(
        inArray(orders.status, [...REVENUE_ORDER_STATUSES]),
        eq(events.organizerId, organizerId)
      )
    )
    .groupBy(events.id, events.name)
    .orderBy(
      sql`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0) DESC`
    )
    .$withCache({
      tag: `organizer:${organizerId}:revenue_distribution`,
      config: { ex: REVENUE_CACHE_TTL_SECONDS },
    });
  return result.map((row) => ({
    ...row,
    total:
      typeof row.total === "string" ? Number.parseFloat(row.total) : row.total,
  }));
};

export const getTopRevenueEvents = async (organizerId: string, limit = 5) => {
  const refundsByOrder = buildRefundSumsByOrderForOrganizer(organizerId);

  const revenueByEvent = db
    .select({
      eventId: orders.eventId,
      totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0)`.as(
        "totalRevenue"
      ),
    })
    .from(orders)
    .innerJoin(events, eq(orders.eventId, events.id))
    .leftJoin(refundsByOrder, eq(refundsByOrder.orderId, orders.id))
    .where(
      and(
        eq(events.organizerId, organizerId),
        inArray(orders.status, [...REVENUE_ORDER_STATUSES])
      )
    )
    .groupBy(orders.eventId)
    .as("revenue_by_event");

  const ticketsByEvent = db
    .select({
      eventId: orders.eventId,
      ticketsSold: sql<number>`COUNT(*) FILTER (WHERE ${tickets.status} != 'refunded')`.as(
        "ticketsSold"
      ),
    })
    .from(orders)
    .innerJoin(events, eq(orders.eventId, events.id))
    .innerJoin(tickets, eq(tickets.orderId, orders.id))
    .where(
      and(
        eq(events.organizerId, organizerId),
        inArray(orders.status, [...REVENUE_ORDER_STATUSES])
      )
    )
    .groupBy(orders.eventId)
    .as("tickets_by_event");

  const result = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      totalRevenue: sql<number>`COALESCE(${revenueByEvent.totalRevenue}, 0)`,
      ticketsSold: sql<number>`COALESCE(${ticketsByEvent.ticketsSold}, 0)`,
    })
    .from(events)
    .leftJoin(revenueByEvent, eq(revenueByEvent.eventId, events.id))
    .leftJoin(ticketsByEvent, eq(ticketsByEvent.eventId, events.id))
    .where(eq(events.organizerId, organizerId))
    .orderBy(sql`COALESCE(${revenueByEvent.totalRevenue}, 0) DESC`)
    .limit(limit)
    .$withCache({
      tag: `organizer:${organizerId}:top_revenue_events:${limit}`,
      config: { ex: REVENUE_CACHE_TTL_SECONDS },
    });
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
  const refundsByOrder = buildRefundSumsByOrderForEvent(eventId);
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.orderDate})`,
      total: sql<number>`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0)`,
    })
    .from(orders)
    .leftJoin(refundsByOrder, eq(refundsByOrder.orderId, orders.id))
    .where(
      and(
        eq(orders.eventId, eventId),
        inArray(orders.status, [...REVENUE_ORDER_STATUSES])
      )
    )
    .groupBy(sql`DATE_TRUNC('day', ${orders.orderDate})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.orderDate}) ASC`)
    .$withCache({
      tag: `event:${eventId}:revenue_over_time`,
      config: { ex: REVENUE_CACHE_TTL_SECONDS },
    });

  return result.map((row) => ({
    ...row,
    total: typeof row.total === "string" ? Number(row.total) : row.total,
  }));
};

export const getRevenueDistributionForSingleEvent = async (eventId: string) => {
  const refundsByOrder = buildRefundSumsByOrderForEvent(eventId);
  const result = await db
    .select({
      eventName: events.name,
      total: sql<number>`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0)`,
    })
    .from(events)
    .leftJoin(
      orders,
      and(eq(orders.eventId, events.id), inArray(orders.status, [...REVENUE_ORDER_STATUSES]))
    )
    .leftJoin(refundsByOrder, eq(refundsByOrder.orderId, orders.id))
    .where(eq(events.id, eventId))
    .groupBy(events.id, events.name)
    .$withCache({
      tag: `event:${eventId}:revenue_total`,
      config: { ex: REVENUE_CACHE_TTL_SECONDS },
    });

  return result.map((row) => ({
    ...row,
    total: typeof row.total === "string" ? Number(row.total) : row.total,
  }));
};
export const getTicketTypeRevenueByEvent = async (eventId: string) => {
  const grossByType = db
    .select({
      areaId: areas.id,
      ticketType: areas.name,
      price: areas.price,
      ticketsSold: sql<number>`COUNT(*) FILTER (WHERE ${tickets.status} != 'refunded')`.as(
        "ticketsSold"
      ),
      grossRevenue: sql<number>`COALESCE(SUM(${tickets.price}), 0)`.as(
        "grossRevenue"
      ),
    })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .where(eq(areas.eventId, eventId))
    .groupBy(areas.id, areas.name, areas.price)
    .as("gross_by_type");

  const refundedByType = db
    .select({
      areaId: areas.id,
      refundedAmount: sql<number>`COALESCE(SUM((${refundTickets.ticketPrice} * ${refunds.amount}) / NULLIF(${refunds.baseAmount}, 0)), 0)`.as(
        "refundedAmount"
      ),
    })
    .from(refundTickets)
    .innerJoin(refunds, eq(refundTickets.refundId, refunds.id))
    .innerJoin(tickets, eq(refundTickets.ticketId, tickets.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .where(
      and(
        eq(areas.eventId, eventId),
        eq(refunds.status, "refunded")
      )
    )
    .groupBy(areas.id)
    .as("refunded_by_type");

  const result = await db
    .select({
      ticketType: grossByType.ticketType,
      price: grossByType.price,
      ticketsSold: grossByType.ticketsSold,
      revenue: sql<number>`COALESCE(${grossByType.grossRevenue}, 0) - COALESCE(${refundedByType.refundedAmount}, 0)`,
    })
    .from(grossByType)
    .leftJoin(refundedByType, eq(refundedByType.areaId, grossByType.areaId))
    .orderBy(grossByType.ticketType)
    .$withCache({
      tag: `event:${eventId}:ticket_type_revenue`,
      config: { ex: REVENUE_CACHE_TTL_SECONDS },
    });

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
