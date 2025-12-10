import { NewOrder, NewSeatHold, Ticket } from "@vieticket/db/pg/models/order";
import { db } from "@vieticket/db/pg";
import {
  OrderStatus,
  PaymentMetadata,
  TicketStatus,
} from "@vieticket/db/pg/schema";
import { areas, rows, seats } from "@vieticket/db/pg/schemas/events";
import { orders, seatHolds, tickets } from "@vieticket/db/pg/schemas/orders";
import { VNPayOrderData } from "@vieticket/utils/vnpay";
import {
  and,
  eq,
  gt,
  inArray,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

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
    .where(
      and(
        eq(areas.eventId, eventId),
        inArray(tickets.status, ["active", "used"])
      )
    );

  const paidSeatIds = paid.map((s) => s.seatId);

  // Get seats that are currently held but not yet confirmed
  const active = await db
    .select({ seatId: seatHolds.seatId })
    .from(seatHolds)
    .where(
      and(
        eq(seatHolds.eventId, eventId),
        gt(seatHolds.expiresAt, new Date()),
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
      eventId: areas.eventId,
      showingId: areas.showingId,
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
    .where(
      and(inArray(tickets.seatId, selectedSeatIds), eq(orders.status, "paid"))
    );

  // Find seats that have an active, unexpired hold
  const activeHolds = await db
    .select({ seatId: seatHolds.seatId })
    .from(seatHolds)
    .where(
      and(
        inArray(seatHolds.seatId, selectedSeatIds),
        gt(seatHolds.expiresAt, new Date())
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
 * Atomically creates an order and seat holds with seat-level locking to prevent double holds/sells.
 * - Validates seats belong to the expected showing/event.
 * - Locks seats with FOR UPDATE SKIP LOCKED semantics.
 * - Rejects seats that are already sold or actively held.
 */
export async function createOrderWithSeatLocks(
  orderData: NewOrder,
  seatIds: string[]
) {
  if (seatIds.length === 0) {
    throw new Error("At least one seat must be selected.");
  }

  return db.transaction(async (tx) => {
    const lockedSeats = await tx
      .select({
        seatId: seats.id,
        eventId: areas.eventId,
        showingId: areas.showingId,
      })
      .from(seats)
      .innerJoin(rows, eq(seats.rowId, rows.id))
      .innerJoin(areas, eq(rows.areaId, areas.id))
      .where(inArray(seats.id, seatIds))
      .for("update", { skipLocked: true });

    if (lockedSeats.length !== seatIds.length) {
      const error: any = new Error("Selected seats are no longer available.");
      error.code = "SEATS_UNAVAILABLE";
      throw error;
    }

    const mismatchedSeat = lockedSeats.find(
      (seat: { showingId: string | null; eventId: string }) =>
        seat.showingId !== orderData.showingId ||
        seat.eventId !== orderData.eventId
    );
    if (mismatchedSeat) {
      throw new Error("All seats must belong to the same showing/event.");
    }

    const conflicts = await tx
      .select({ seatId: seats.id })
      .from(seats)
      .where(
        and(
          inArray(seats.id, seatIds),
          or(
            sql`EXISTS (SELECT 1 FROM ${tickets} WHERE ${tickets.seatId} = ${seats.id} AND ${tickets.status} IN ('active','used'))`,
            sql`EXISTS (SELECT 1 FROM ${seatHolds} WHERE ${seatHolds.seatId} = ${seats.id} AND ${seatHolds.expiresAt} > now() AND ${seatHolds.isConfirmed} = false)`
          )
        )
      );

    if (conflicts.length > 0) {
      const error: any = new Error("Selected seats are no longer available.");
      error.code = "SEATS_UNAVAILABLE";
      error.unavailableSeats = conflicts.map((c) => c.seatId);
      throw error;
    }

    const [newOrder] = await tx.insert(orders).values(orderData).returning();

    const seatHoldsData: NewSeatHold[] = seatIds.map((seatId) => ({
      eventId: orderData.eventId,
      showingId: orderData.showingId!,
      userId: orderData.userId,
      orderId: newOrder.id,
      seatId,
      expiresAt: orderData.expiresAt!,
      isConfirmed: false,
      isPaid: false,
    }));

    await tx.insert(seatHolds).values(seatHoldsData);

    return { order: newOrder, seatIds };
  });
}

/**
 * GA flow: select available GA seats under lock, then create order + holds atomically.
 * Seats are existing GA “virtual” seats; no new inventory tables.
 */
export async function createGAOrderWithSeatLocks({
  eventId,
  showingId,
  userId,
  expiresAt,
  status,
  requests,
}: {
  eventId: string;
  showingId: string;
  userId: string;
  expiresAt: Date;
  status: OrderStatus;
  requests: Array<{ areaId: string; quantity: number }>;
}) {
  const validRequests = requests.filter((r) => r.quantity > 0);
  if (validRequests.length === 0) {
    throw new Error("At least one area with quantity is required.");
  }

  return db.transaction(async (tx) => {
    const lockedSeats: Array<{
      seatId: string;
      price: number;
      seatNumber: string;
      areaName: string;
      areaId: string;
      eventId: string;
      showingId: string | null;
    }> = [];

    for (const req of validRequests) {
      const seatsForArea = await tx
        .select({
          seatId: seats.id,
          price: areas.price,
          seatNumber: seats.seatNumber,
          areaName: areas.name,
          areaId: areas.id,
          eventId: areas.eventId,
          showingId: areas.showingId,
        })
        .from(seats)
        .innerJoin(rows, eq(seats.rowId, rows.id))
        .innerJoin(areas, eq(rows.areaId, areas.id))
        .where(
          and(
            or(
              eq(areas.showingId, showingId),
              and(sql`${areas.showingId} IS NULL`, eq(areas.eventId, eventId))
            ),
            eq(areas.id, req.areaId),
            sql`NOT EXISTS (
              SELECT 1 FROM ${tickets}
              WHERE ${tickets.seatId} = ${seats.id}
                AND ${tickets.status} IN ('active','used')
            )`,
            sql`NOT EXISTS (
              SELECT 1 FROM ${seatHolds}
              WHERE ${seatHolds.seatId} = ${seats.id}
                AND ${seatHolds.expiresAt} > now()
                AND ${seatHolds.isConfirmed} = false
            )`
          )
        )
        .limit(req.quantity)
        .for("update", { skipLocked: true });

      if (seatsForArea.length < req.quantity) {
        const error: any = new Error(
          `Not enough seats available in area ${req.areaId}.`
        );
        error.code = "INSUFFICIENT_CAPACITY";
        error.areaId = req.areaId;
        throw error;
      }

      lockedSeats.push(...seatsForArea);
    }

    const totalAmount = lockedSeats.reduce(
      (sum: number, seat) => sum + Number(seat.price),
      0
    );

    const [newOrder] = await tx
      .insert(orders)
      .values({
        userId,
        eventId,
        showingId,
        totalAmount,
        status,
        expiresAt,
      })
      .returning();

    const seatHoldsData: NewSeatHold[] = lockedSeats.map((seat) => ({
      eventId,
      showingId,
      userId,
      orderId: newOrder.id,
      seatId: seat.seatId,
      expiresAt,
      isConfirmed: false,
      isPaid: false,
    }));

    await tx.insert(seatHolds).values(seatHoldsData);

    return {
      order: newOrder,
      seats: lockedSeats,
      totalAmount,
    };
  });
}

/**
 * Atomically creates a new order and seat holds within a database transaction.
 * @param orderData - The data for the new order.
 * @param seatHoldsData - An array of seat hold data to be created.
 * @returns The newly created order.
 */
export async function executeOrderTransaction(
  orderData: NewOrder,
  seatHoldsData: Omit<NewSeatHold, "orderId">[]
) {
  return db.transaction(async (tx) => {
    const [newOrder] = await tx.insert(orders).values(orderData).returning();

    if (seatHoldsData.length > 0) {
      // Add orderId to each seat hold
      const seatHoldsWithOrderId = seatHoldsData.map((hold) => ({
        ...hold,
        orderId: newOrder.id,
      }));
      await tx.insert(seatHolds).values(seatHoldsWithOrderId);
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
export async function updateOrderVNPayData(
  orderId: string,
  vnpayData: VNPayOrderData
) {
  const paymentMetadata: PaymentMetadata = {
    provider: "vnpay",
    data: vnpayData,
  };

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
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const [updatedOrder] = await db
    .update(orders)
    .set({
      status,
      updatedAt: new Date(),
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
        and(eq(seatHolds.userId, userId), eq(seatHolds.isConfirmed, false))
      );

    if (seatHoldsList.length === 0) {
      return [];
    }

    const updatedHolds = await db
      .update(seatHolds)
      .set({
        isConfirmed: true,
        isPaid: true,
      })
      .where(
        and(eq(seatHolds.userId, userId), eq(seatHolds.isConfirmed, false))
      )
      .returning();

    return updatedHolds;
  }

  const seatIds = orderSeats.map((seat) => seat.seatId);

  const updatedHolds = await db
    .update(seatHolds)
    .set({
      isConfirmed: true,
      isPaid: true,
    })
    .where(
      and(eq(seatHolds.userId, userId), inArray(seatHolds.seatId, seatIds))
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
export async function createTickets(
  orderId: string,
  ticketData: Array<{
    ticketId: string;
    seatId: string;
    status: TicketStatus;
  }>
) {
  if (ticketData.length === 0) {
    return [];
  }

  const ticketsToInsert = ticketData.map((data) => ({
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
export async function getUserUnconfirmedSeatHolds(
  userId: string,
  orderId: string
) {
  return db
    .select({ seatId: seatHolds.seatId })
    .from(seatHolds)
    .where(
      and(
        eq(seatHolds.userId, userId),
        eq(seatHolds.orderId, orderId),
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
  ticketData: Pick<Ticket, "seatId" | "status">[]
) {
  return db.transaction(async (tx) => {
    const now = new Date();

    const [orderRow] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .for("update");

    if (!orderRow) {
      throw new Error("Order not found or user mismatch");
    }

    if (orderRow.status === "paid") {
      const existingTickets = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, orderId));
      return {
        order: orderRow,
        tickets: existingTickets,
        seatCount: existingTickets.length,
      };
    }

    if (
      orderRow.status !== "pending_payment" &&
      orderRow.status !== "pending"
    ) {
      throw new Error(
        `Order is not payable in its current status: ${orderRow.status}`
      );
    }

    if (orderRow.expiresAt && orderRow.expiresAt < now) {
      await tx
        .update(orders)
        .set({ status: "expired", updatedAt: now })
        .where(eq(orders.id, orderId));
      throw new Error("Order has expired");
    }

    // 2. Get seat holds for this specific order
    const orderSeatHolds = await tx
      .select()
      .from(seatHolds)
      .where(
        and(
          eq(seatHolds.orderId, orderId),
          eq(seatHolds.userId, userId),
          eq(seatHolds.isConfirmed, false)
        )
      )
      .for("update");

    if (orderSeatHolds.length === 0) {
      throw new Error("No seat holds found for this order");
    }

    const expiredHold = orderSeatHolds.find(
      (hold) => hold.expiresAt && hold.expiresAt < now
    );
    if (expiredHold) {
      await tx
        .update(orders)
        .set({ status: "expired", updatedAt: now })
        .where(eq(orders.id, orderId));
      throw new Error("Seat holds have expired");
    }

    // 3. Confirm seat holds for this specific order
    await tx
      .update(seatHolds)
      .set({
        isConfirmed: true,
        isPaid: true,
      })
      .where(
        and(
          eq(seatHolds.orderId, orderId),
          eq(seatHolds.userId, userId),
          eq(seatHolds.isConfirmed, false)
        )
      );

    const existingTickets = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, orderId));

    if (existingTickets.length > 0) {
      await tx
        .update(orders)
        .set({ status: "paid", updatedAt: now })
        .where(eq(orders.id, orderId));
      return {
        order: { ...orderRow, status: "paid" },
        tickets: existingTickets,
        seatCount: existingTickets.length,
      };
    }

    // 4. Create tickets with provided or derived data
    const seatIds =
      ticketData && ticketData.length > 0
        ? ticketData.map((data) => data.seatId)
        : orderSeatHolds.map((hold) => hold.seatId);

    // Fetch denormalized metadata for tickets (event/showing/price) from seat graph
    const seatsMeta = await tx
      .select({
        seatId: seats.id,
        eventId: areas.eventId,
        showingId: areas.showingId,
        price: areas.price,
      })
      .from(seats)
      .innerJoin(rows, eq(seats.rowId, rows.id))
      .innerJoin(areas, eq(rows.areaId, areas.id))
      .where(inArray(seats.id, seatIds));

    const seatsMetaById = new Map(
      seatsMeta.map((meta) => [meta.seatId, meta])
    );

    const ticketsToInsert = seatIds.map((seatId) => {
      const meta = seatsMetaById.get(seatId);
      if (!meta) {
        throw new Error(`Seat metadata not found for seat ${seatId}`);
      }
      const ticketStatus =
        ticketData?.find((data) => data.seatId === seatId)?.status ?? "active";
      return {
        orderId,
        seatId,
        status: ticketStatus,
        eventId: meta.eventId,
        showingId: meta.showingId,
        price: meta.price,
      };
    });

    const createdTickets = await tx
      .insert(tickets)
      .values(ticketsToInsert)
      .returning();

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: "paid",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
      .returning();

    return {
      order: updatedOrder,
      tickets: createdTickets,
      seatCount: createdTickets.length,
    };
  });
}
