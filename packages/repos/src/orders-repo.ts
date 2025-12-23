import { db } from "@vieticket/db/pg";
import { OrderStatus } from "@vieticket/db/pg/enums";
import { areas, events, rows, seats } from "@vieticket/db/pg/schemas/events";
import { orders, tickets } from "@vieticket/db/pg/schemas/orders";
import { and, count, desc, eq, gt } from "drizzle-orm";

const CACHE_TTL_SECONDS = 3600;

/**
 * Gets event information for a given ticket
 * @param ticketId - The ID of the ticket
 * @returns Event information including id and name
 */
export async function getEventByTicketId(ticketId: string) {
  const [result] = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      lifecycleStatus: events.lifecycleStatus,
      ticketSaleEnd: events.ticketSaleEnd,
      startTime: events.startTime,
      endTime: events.endTime,
    })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(eq(tickets.id, ticketId))
    .limit(1)
    .$withCache({
      tag: `ticket:${ticketId}:event`,
      config: { ex: CACHE_TTL_SECONDS },
    });

  return result || null;
}

/**
 * Finds orders for a specific user with pagination.
 * @param userId - The ID of the user.
 * @param page - The page number to retrieve.
 * @param limit - The number of orders per page.
 * @returns A paginated list of orders.
 */
export async function findOrdersByUserIdWithPagination(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;

  const [orderList, totalResult] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderDate: orders.orderDate,
        totalAmount: orders.totalAmount,
        status: orders.status,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.orderDate))
      .limit(limit)
      .offset(offset)
      .$withCache({
        tag: `user:${userId}:orders:page_${page}:limit_${limit}`,
        config: { ex: CACHE_TTL_SECONDS },
      }),
    db
      .select({ total: count() })
      .from(orders)
      .where(eq(orders.userId, userId))
      .$withCache({
        tag: `user:${userId}:orders:total`,
        config: { ex: CACHE_TTL_SECONDS },
      }),
  ]);

  const total = totalResult[0].total;
  const pages = Math.ceil(total / limit);

  return {
    orders: orderList,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Finds a single order by ID, ensuring it belongs to the specified user.
 * @param orderId - The ID of the order.
 * @param userId - The ID of the user.
 * @returns The order details or null if not found or doesn't belong to the user.
 */
export async function findOrderByIdForUser(orderId: string, userId: string) {
  const [result] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      eventId: orders.eventId,
      showingId: orders.showingId,
      orderDate: orders.orderDate,
      totalAmount: orders.totalAmount,
      status: orders.status,
      expiresAt: orders.expiresAt,
      paymentMetadata: orders.paymentMetadata,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1)
    .$withCache({
      tag: `user:${userId}:order:${orderId}`,
      config: { ex: CACHE_TTL_SECONDS },
    });

  return result || null;
}

/**
 * Finds a single ticket by ID, ensuring it belongs to the specified user.
 * @param ticketId - The ID of the ticket.
 * @param userId - The ID of the user.
 * @returns The ticket details with event info, or null if not found.
 */
export async function findTicketByIdForUser(ticketId: string, userId: string) {
  const [result] = await db
    .select({
      ticketId: tickets.id,
      status: tickets.status,
      purchasedAt: tickets.purchasedAt,
      orderId: tickets.orderId,
      seatNumber: seats.seatNumber,
      rowName: rows.rowName,
      areaName: areas.name,
      eventId: events.id,
      eventName: events.name,
      startTime: events.startTime,
    })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .innerJoin(events, eq(areas.eventId, events.id))
    .where(and(eq(tickets.id, ticketId), eq(orders.userId, userId)))
    .limit(1)
    .$withCache({
      tag: `user:${userId}:ticket:${ticketId}`,
      config: { ex: CACHE_TTL_SECONDS },
    });

  return result || null;
}

/**
 * Finds all tickets for a specific user with pagination.
 * @param userId - The ID of the user.
 * @param page - The page number.
 * @param limit - The number of tickets per page.
 * @returns A paginated list of the user's tickets.
 */
export async function findUserTicketsWithPagination(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;

  const userTicketsQuery = db
    .select({ ticketId: tickets.id })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(eq(orders.userId, userId));

  const [ticketList, totalResult] = await Promise.all([
    db
      .select({
        ticketId: tickets.id,
        status: tickets.status,
        purchasedAt: tickets.purchasedAt,
        orderId: tickets.orderId,
        seatNumber: seats.seatNumber,
        rowName: rows.rowName,
        areaName: areas.name,
        eventName: events.name,
        startTime: events.startTime,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(seats, eq(tickets.seatId, seats.id))
      .innerJoin(rows, eq(seats.rowId, rows.id))
      .innerJoin(areas, eq(rows.areaId, areas.id))
      .innerJoin(events, eq(areas.eventId, events.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(tickets.purchasedAt))
      .limit(limit)
      .offset(offset)
      .$withCache({
        tag: `user:${userId}:tickets:page_${page}:limit_${limit}`,
        config: { ex: CACHE_TTL_SECONDS },
      }),
    db
      .select({ total: count() })
      .from(userTicketsQuery.as("user_tickets"))
      .$withCache({
        tag: `user:${userId}:tickets:total`,
        config: { ex: CACHE_TTL_SECONDS },
      }),
  ]);

  const total = totalResult[0].total;
  const pages = Math.ceil(total / limit);

  return {
    tickets: ticketList,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Gets detailed ticket information with seat and area details
 * @param orderId - The ID of the order
 * @returns Array of tickets with seat and area information including IDs
 */

export async function getTicketDetails(orderId: string) {
  return db
    .select({
      ticketId: tickets.id,
      seatId: tickets.seatId,
      seatNumber: seats.seatNumber,
      rowId: rows.id,
      rowName: rows.rowName,
      areaId: areas.id,
      areaName: areas.name,
      status: tickets.status,
    })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .where(eq(tickets.orderId, orderId))
    .$withCache({
      tag: `order:${orderId}:ticket_details`,
      config: { ex: CACHE_TTL_SECONDS },
    });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  client = db
) {
  const [updatedOrder] = await client
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  return updatedOrder;
}
