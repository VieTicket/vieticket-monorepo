import { NewOrder, NewSeatHold } from "@vieticket/db/models/order";
import { db } from "@vieticket/db/postgres";
import { OrderStatus, PaymentMetadata, TicketStatus } from "@vieticket/db/postgres/schema";
import { areas, rows, seats } from "@vieticket/db/schemas/events";
import { orders, seatHolds, tickets, } from "@vieticket/db/schemas/orders";
import { VNPayOrderData } from "@vieticket/utils/vnpay";
import { and, eq, gt, inArray, notInArray, sql } from "drizzle-orm";

/**
 * Gets the status of all seats for an event, including confirmed purchases and active holds.
 * @param eventId - The ID of the event.
 * @returns An object containing arrays of confirmed seat IDs and actively held seat IDs.
 */
export async function getSeatStatus(eventId: string) {
  // Get seats that are part of a paid order
  const paid = await db
    .select({ seatId: tickets.seatId })
    .from(tickets)
    .innerJoin(seats, eq(tickets.seatId, seats.id))
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .where(and(eq(areas.eventId, eventId), inArray(tickets.status, ['active', 'used'])));

  const paidSeatIds = paid.map((s) => s.seatId);

  // Get seats that are currently held but not yet confirmed
  const active = await db
    .select({ seatId: seatHolds.seatId })
    .from(seatHolds)
    .where(
      and(
        eq(seatHolds.eventId, eventId),
        gt(seatHolds.holdExpires, new Date()),
        // Exclude seats that are already confirmed in a paid order
        paidSeatIds.length > 0
          ? notInArray(seatHolds.seatId, paidSeatIds)
          : undefined
      )
    );

  const activeHoldSeatIds = active.map((s) => s.seatId);

  return {
    paidSeatIds,
    activeHoldSeatIds,
  };
}

/**
 * Fetches pricing and details for a list of selected seats.
 * @param selectedSeatIds - An array of seat IDs.
 * @returns An array of objects containing seat and area details, including price.
 */
export async function getSeatPricing(selectedSeatIds: string[]) {
  if (selectedSeatIds.length === 0) {
    return [];
  }
  return db
    .select({
      seatId: seats.id,
      seatNumber: seats.seatNumber,
      rowName: rows.rowName,
      areaId: areas.id,
      areaName: areas.name,
      price: areas.price,
    })
    .from(seats)
    .innerJoin(rows, eq(seats.rowId, rows.id))
    .innerJoin(areas, eq(rows.areaId, areas.id))
    .where(inArray(seats.id, selectedSeatIds));
}

/**
 * Checks the availability of a specific set of seats for an event.
 * @param selectedSeatIds - The IDs of the seats to check.
 * @returns An object containing an array of unavailable seat IDs (already confirmed or actively held).
 */
export async function getSeatAvailabilityStatus(selectedSeatIds: string[]) {
  if (selectedSeatIds.length === 0) {
    return { unavailableSeatIds: [] };
  }

  // Find seats that are already part of a paid order
  const confirmedSeats = await db
    .select({ seatId: tickets.seatId })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(and(inArray(tickets.seatId, selectedSeatIds), eq(orders.status, "paid")));

  // Find seats that have an active, unexpired hold
  const activeHolds = await db
    .select({ seatId: seatHolds.seatId })
    .from(seatHolds)
    .where(
      and(
        inArray(seatHolds.seatId, selectedSeatIds),
        gt(seatHolds.holdExpires, new Date())
      )
    );

  const unavailableSeatIds = [
    ...new Set([
      ...confirmedSeats.map((s) => s.seatId),
      ...activeHolds.map((s) => s.seatId),
    ]),
  ];

  return { unavailableSeatIds };
}

/**
 * Atomically creates a new order and seat holds within a database transaction.
 * @param orderData - The data for the new order.
 * @param seatHoldsData - An array of seat hold data to be created.
 * @returns The newly created order.
 */
export async function executeOrderTransaction(
  orderData: NewOrder,
  seatHoldsData: NewSeatHold[]
) {
  return db.transaction(async (tx) => {
    const [newOrder] = await tx.insert(orders).values(orderData).returning();
    if (seatHoldsData.length > 0) {
      await tx.insert(seatHolds).values(seatHoldsData);
    }
    return newOrder;
  });
}

/**
 * Updates an order with VNPay transaction data.
 * @param orderId - The ID of the order to update.
 * @param vnpayData - The VNPay data to store.
 * @returns The updated order.
 */
export async function updateOrderVNPayData(orderId: string, vnpayData: VNPayOrderData) {
  const paymentMetadata: PaymentMetadata = { provider: "vnpay", data: vnpayData }

  const [updatedOrder] = await db
    .update(orders)
    .set({ paymentMetadata, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();
  return updatedOrder;
}

// PHASE 3

/**
 * Retrieves an order by VNPay transaction reference stored in payment metadata
 * @param vnpTxnRef - The VNPay transaction reference
 * @returns The order with payment metadata or null if not found
 */
export async function getOrderByVNPayTxnRef(vnpTxnRef: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(
      sql`${orders.paymentMetadata}->>'provider' = 'vnpay' AND ${orders.paymentMetadata}->'data'->>'vnp_TxnRef' = ${vnpTxnRef}`
    )
    .limit(1);

  return order || null;
}

/**
 * Updates order status to the specified value
 * @param orderId - The ID of the order to update
 * @param status - The new status for the order
 * @returns The updated order
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  const [updatedOrder] = await db
    .update(orders)
    .set({
      status,
      updatedAt: new Date()
    })
    .where(eq(orders.id, orderId))
    .returning();

  return updatedOrder;
}

/**
 * Confirms seat holds for a specific user and order
 * @param userId - The ID of the user
 * @param orderId - The ID of the order
 * @returns Array of updated seat holds
 */
export async function confirmSeatHolds(userId: string, orderId: string) {
  // First, get the seat holds associated with this order's seats
  const orderSeats = await db
    .select({ seatId: tickets.seatId })
    .from(tickets)
    .where(eq(tickets.orderId, orderId));

  if (orderSeats.length === 0) {
    // If no tickets exist yet, get seats from seatHolds for this user
    const seatHoldsList = await db
      .select()
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.userId, userId),
          eq(seatHolds.isConfirmed, false)
        )
      );

    if (seatHoldsList.length === 0) {
      return [];
    }

    const updatedHolds = await db
      .update(seatHolds)
      .set({
        isConfirmed: true,
        isPaid: true
      })
      .where(
        and(
          eq(seatHolds.userId, userId),
          eq(seatHolds.isConfirmed, false)
        )
      )
      .returning();

    return updatedHolds;
  }

  const seatIds = orderSeats.map(seat => seat.seatId);

  const updatedHolds = await db
    .update(seatHolds)
    .set({
      isConfirmed: true,
      isPaid: true
    })
    .where(
      and(
        eq(seatHolds.userId, userId),
        inArray(seatHolds.seatId, seatIds)
      )
    )
    .returning();

  return updatedHolds;
}

/**
 * Creates ticket records for confirmed seats
 * @param orderId - The ID of the order
 * @param ticketData - Array of ticket data to insert
 * @returns Array of created tickets
 */
export async function createTickets(orderId: string, ticketData: Array<{
  ticketId: string;
  seatId: string;
  status: TicketStatus;
}>) {
  if (ticketData.length === 0) {
    return [];
  }

  const ticketsToInsert = ticketData.map(data => ({
    id: data.ticketId,
    orderId,
    seatId: data.seatId,
    status: data.status,
  }));

  const createdTickets = await db
    .insert(tickets)
    .values(ticketsToInsert)
    .returning();

  return createdTickets;
}

/**
 * Gets unconfirmed seat holds for a specific user
 * @param userId - The ID of the user
 * @returns Array of seat holds that are not yet confirmed
 */
export async function getUserUnconfirmedSeatHolds(userId: string) {
  return db
    .select({ seatId: seatHolds.seatId })
    .from(seatHolds)
    .where(
      and(
        eq(seatHolds.userId, userId),
        eq(seatHolds.isConfirmed, false)
      )
    );
}

/**
 * Executes atomic payment confirmation transaction
 * @param orderId - The ID of the order to confirm
 * @param userId - The ID of the user who owns the order
 * @param ticketData - Pre-generated ticket data including validation data
 * @returns Object containing updated order and created tickets
 */
export async function executePaymentTransaction(
  orderId: string,
  userId: string,
  ticketData: Array<{
    seatId: string;
    status: TicketStatus;
  }>
) {
  return db.transaction(async (tx) => {
    // 1. Update order status to paid
    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: "paid",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.userId, userId)
        )
      )
      .returning();

    if (!updatedOrder) {
      throw new Error("Order not found or user mismatch");
    }

    // 2. Get seat holds for this user that are not yet confirmed
    const userSeatHolds = await tx
      .select()
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.userId, userId),
          eq(seatHolds.isConfirmed, false)
        )
      );

    if (userSeatHolds.length === 0) {
      throw new Error("No seat holds found for this user");
    }

    // 3. Confirm seat holds
    await tx
      .update(seatHolds)
      .set({
        isConfirmed: true,
        isPaid: true
      })
      .where(
        and(
          eq(seatHolds.userId, userId),
          eq(seatHolds.isConfirmed, false)
        )
      );

    // 4. Create tickets with provided data
    const ticketsToInsert = ticketData.map(data => ({
      orderId,
      seatId: data.seatId,
      status: data.status,
    }));

    const createdTickets = await tx
      .insert(tickets)
      .values(ticketsToInsert)
      .returning();

    return {
      order: updatedOrder,
      tickets: createdTickets,
      seatCount: createdTickets.length
    };
  });
}