import { db as defaultDb } from "@vieticket/db/pg";
import { areas, events, rows, seats, showings } from "@vieticket/db/pg/schemas/events";
import {
  orders,
  seatHolds,
  refundTickets,
  refunds,
  tickets,
} from "@vieticket/db/pg/schemas/orders";
import {
  RefundReason,
  RefundStatus,
  TicketStatus,
} from "@vieticket/db/pg/enums";
import type { PaginationParams } from "./types";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  ilike,
  notInArray,
  or,
  sum,
  sql,
} from "drizzle-orm";

type DbClient = typeof defaultDb;

function getDb(client?: DbClient) {
  return client ?? defaultDb;
}

export type OrderRefundContext = {
  orderId: string;
  userId: string;
  eventId: string;
  showingId: string;
  orderStatus: string;
  totalAmount: number;
  organizerId: string;
  autoApproveRefund: boolean;
  eventLifecycleStatus: string;
  startTime: Date | null;
};

export async function getOrderRefundContext(
  orderId: string,
  client?: DbClient
): Promise<OrderRefundContext | null> {
  const db = getDb(client);
  const [row] = await db
    .select({
      orderId: orders.id,
      userId: orders.userId,
      eventId: orders.eventId,
      showingId: orders.showingId,
      orderStatus: orders.status,
      totalAmount: orders.totalAmount,
      organizerId: events.organizerId,
      autoApproveRefund: events.autoApproveRefund,
      eventLifecycleStatus: events.lifecycleStatus,
      startTime: sql<Date | null>`COALESCE(${showings.startTime}, ${events.startTime})`,
    })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .innerJoin(showings, eq(showings.id, orders.showingId))
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!row || !row.orderStatus) return null;
  return { ...row, orderStatus: row.orderStatus } satisfies OrderRefundContext;
}

export type RefundTicketRow = {
  ticketId: string;
  price: number;
  status: TicketStatus;
};

export async function getOrderTicketsForRefund(
  orderId: string,
  client?: DbClient
): Promise<RefundTicketRow[]> {
  const db = getDb(client);
  const rows = await db
    .select({
      ticketId: tickets.id,
      price: tickets.price,
      status: tickets.status,
    })
    .from(tickets)
    .where(eq(tickets.orderId, orderId));

  return rows.filter((t): t is RefundTicketRow => t.status !== null);
}

export async function getExistingRefundsForOrder(
  orderId: string,
  client?: DbClient
) {
  const db = getDb(client);
  return db
    .select({
      id: refunds.id,
      status: refunds.status,
      amount: refunds.amount,
      createdAt: refunds.requestedAt,
    })
    .from(refunds)
    .where(eq(refunds.orderId, orderId));
}

export async function findBlockingRefundTickets(
  ticketIds: string[],
  client?: DbClient
) {
  if (ticketIds.length === 0) return [];
  const db = getDb(client);
  return db
    .select({
      ticketId: refundTickets.ticketId,
      refundId: refundTickets.refundId,
      status: refunds.status,
    })
    .from(refundTickets)
    .innerJoin(refunds, eq(refunds.id, refundTickets.refundId))
    .where(
      and(
        inArray(refundTickets.ticketId, ticketIds),
        notInArray(refunds.status, ["rejected", "declined", "failed"])
      )
    );
}

export async function insertRefundWithTickets(
  data: typeof refunds.$inferInsert,
  ticketRows: { ticketId: string; ticketPrice: number }[],
  client?: DbClient
) {
  const db = getDb(client);
  const [created] = await db
    .insert(refunds)
    .values(data)
    .returning({
      id: refunds.id,
      status: refunds.status,
      amount: refunds.amount,
      baseAmount: refunds.baseAmount,
      percentageApplied: refunds.percentageApplied,
      orderId: refunds.orderId,
      reason: refunds.reason,
    });

  if (ticketRows.length > 0) {
    await db.insert(refundTickets).values(
      ticketRows.map((t) => ({
        refundId: created.id,
        ticketId: t.ticketId,
        ticketPrice: t.ticketPrice,
      }))
    );
  }

  return created;
}

export async function updateRefundRecord(
  refundId: string,
  patch: Partial<typeof refunds.$inferInsert>,
  client?: DbClient
) {
  const db = getDb(client);
  const [updated] = await db
    .update(refunds)
    .set(patch)
    .where(eq(refunds.id, refundId))
    .returning({
      id: refunds.id,
      status: refunds.status,
      amount: refunds.amount,
      baseAmount: refunds.baseAmount,
      percentageApplied: refunds.percentageApplied,
      approvedAt: refunds.approvedAt,
      refundedAt: refunds.refundedAt,
      orderId: refunds.orderId,
      reason: refunds.reason,
      pspMetadata: refunds.pspMetadata,
    });
  return updated ?? null;
}

export async function markRefundProcessing(
  refundId: string,
  client?: DbClient
) {
  const db = getDb(client);
  const [updated] = await db
    .update(refunds)
    .set({ status: "processing" satisfies RefundStatus })
    .where(
      and(
        eq(refunds.id, refundId),
        inArray(refunds.status, ["approved", "payment_failed"])
      )
    )
    .returning({
      id: refunds.id,
      status: refunds.status,
    });
  return updated ?? null;
}

type RefundListSortField = "requestedAt" | "amount" | "status" | "reason";
type RefundListSortDirection = "asc" | "desc";

export type RefundListFilters = PaginationParams & {
  status?: RefundStatus;
  reason?: RefundReason;
  search?: string;
  sort?: RefundListSortField;
  direction?: RefundListSortDirection;
};

type RefundListRow = {
  id: string;
  orderId: string;
  status: RefundStatus;
  reason: RefundReason;
  amount: number;
  requestedAt: Date;
  userId?: string;
  eventId?: string;
  eventName?: string;
};

function buildRefundListConditions(options: {
  organizerId?: string;
  userId?: string;
  status?: RefundStatus;
  reason?: RefundReason;
  search?: string;
}) {
  const conditions = [];

  if (options.organizerId) {
    conditions.push(eq(events.organizerId, options.organizerId));
  }

  if (options.userId) {
    conditions.push(eq(orders.userId, options.userId));
  }

  if (options.status) {
    conditions.push(eq(refunds.status, options.status));
  }

  if (options.reason) {
    conditions.push(eq(refunds.reason, options.reason));
  }

  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      or(
        sql`${refunds.id}::text ILIKE ${pattern}`,
        sql`${refunds.orderId}::text ILIKE ${pattern}`,
        sql`${orders.userId}::text ILIKE ${pattern}`,
        sql`${events.id}::text ILIKE ${pattern}`,
        ilike(events.name, pattern)
      )
    );
  }

  return conditions;
}

function getRefundOrderBy(sort?: RefundListSortField, direction?: RefundListSortDirection) {
  const dirFn = direction === "asc" ? asc : desc;

  switch (sort) {
    case "amount":
      return dirFn(refunds.amount);
    case "status":
      return dirFn(refunds.status);
    case "reason":
      return dirFn(refunds.reason);
    case "requestedAt":
    default:
      return dirFn(refunds.requestedAt);
  }
}

export async function listRefundsForAdmin(
  filters: RefundListFilters = { offset: 0, limit: 10 },
  client?: DbClient
) {
  const db = getDb(client);
  const { offset, limit, status, reason, search, sort, direction } = filters;
  const conditions = buildRefundListConditions({ status, reason, search }).filter(
    Boolean
  );
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseRowsQuery = db
    .select({
      id: refunds.id,
      orderId: refunds.orderId,
      status: refunds.status,
      reason: refunds.reason,
      amount: refunds.amount,
      requestedAt: refunds.requestedAt,
      userId: orders.userId,
      eventId: events.id,
      eventName: events.name,
    })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId));

  const rows = await (whereClause ? baseRowsQuery.where(whereClause) : baseRowsQuery)
    .orderBy(getRefundOrderBy(sort, direction))
    .offset(offset)
    .limit(limit);

  const baseCountQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId));

  const [countResult] = await (whereClause ? baseCountQuery.where(whereClause) : baseCountQuery);
  const totalCount = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    data: rows as RefundListRow[],
    totalCount,
    totalPages,
  };
}

export async function listRefundsForOrganizer(
  organizerId: string,
  filters: RefundListFilters = { offset: 0, limit: 10 },
  client?: DbClient
) {
  const db = getDb(client);
  const { offset, limit, status, search, sort, direction } = filters;
  const conditions = buildRefundListConditions({
    organizerId,
    status,
    reason: "personal",
    search,
  }).filter(Boolean);
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseRowsQuery = db
    .select({
      id: refunds.id,
      orderId: refunds.orderId,
      status: refunds.status,
      reason: refunds.reason,
      amount: refunds.amount,
      requestedAt: refunds.requestedAt,
      eventId: events.id,
      eventName: events.name,
    })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId));

  const rows = await (whereClause ? baseRowsQuery.where(whereClause) : baseRowsQuery)
    .orderBy(getRefundOrderBy(sort, direction))
    .offset(offset)
    .limit(limit);

  const baseCountQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId));

  const [countResult] = await (whereClause ? baseCountQuery.where(whereClause) : baseCountQuery);
  const totalCount = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    data: rows as RefundListRow[],
    totalCount,
    totalPages,
  };
}

export async function listRefundsForCustomer(
  userId: string,
  filters: RefundListFilters = { offset: 0, limit: 10 },
  client?: DbClient
) {
  const db = getDb(client);
  const { offset, limit, status, reason, search, sort, direction } = filters;
  const conditions = buildRefundListConditions({ userId, status, reason, search }).filter(
    Boolean
  );
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseRowsQuery = db
    .select({
      id: refunds.id,
      orderId: refunds.orderId,
      status: refunds.status,
      reason: refunds.reason,
      amount: refunds.amount,
      requestedAt: refunds.requestedAt,
      eventId: events.id,
      eventName: events.name,
    })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId));

  const rows = await (whereClause ? baseRowsQuery.where(whereClause) : baseRowsQuery)
    .orderBy(getRefundOrderBy(sort, direction))
    .offset(offset)
    .limit(limit);

  const baseCountQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId));

  const [countResult] = await (whereClause ? baseCountQuery.where(whereClause) : baseCountQuery);
  const totalCount = Number(countResult?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    data: rows as RefundListRow[],
    totalCount,
    totalPages,
  };
}

export async function getRefundDetail(
  refundId: string,
  client?: DbClient
) {
  const db = getDb(client);
  const [row] = await db
    .select({
      id: refunds.id,
      orderId: refunds.orderId,
      reason: refunds.reason,
      status: refunds.status,
      amount: refunds.amount,
      baseAmount: refunds.baseAmount,
      percentageApplied: refunds.percentageApplied,
      requestedAt: refunds.requestedAt,
      approvedAt: refunds.approvedAt,
      refundedAt: refunds.refundedAt,
      createdBy: refunds.createdBy,
      approvedBy: refunds.approvedBy,
      rejectionReason: refunds.rejectionReason,
      adminOverride: refunds.adminOverride,
      adminOverrideBy: refunds.adminOverrideBy,
      adminOverrideAt: refunds.adminOverrideAt,
      adminOverrideReason: refunds.adminOverrideReason,
      overridePreviousPercentage: refunds.overridePreviousPercentage,
      overridePreviousAmount: refunds.overridePreviousAmount,
      pspMetadata: refunds.pspMetadata,
      userId: orders.userId,
      orderStatus: orders.status,
      totalAmount: orders.totalAmount,
      paymentMetadata: orders.paymentMetadata,
      organizerId: events.organizerId,
      eventId: events.id,
      eventName: events.name,
    })
    .from(refunds)
    .innerJoin(orders, eq(orders.id, refunds.orderId))
    .innerJoin(events, eq(events.id, orders.eventId))
    .where(eq(refunds.id, refundId))
    .limit(1);

  if (!row) return null;

  const ticketRows = await db
    .select({
      ticketId: refundTickets.ticketId,
      ticketPrice: refundTickets.ticketPrice,
      ticketStatus: tickets.status,
      seatId: tickets.seatId,
      seatNumber: seats.seatNumber,
      rowId: rows.id,
      rowName: rows.rowName,
      areaId: areas.id,
      areaName: areas.name,
    })
    .from(refundTickets)
    .innerJoin(tickets, eq(tickets.id, refundTickets.ticketId))
    .innerJoin(seats, eq(seats.id, tickets.seatId))
    .innerJoin(rows, eq(rows.id, seats.rowId))
    .innerJoin(areas, eq(areas.id, rows.areaId))
    .where(eq(refundTickets.refundId, refundId));

  return { refund: row, tickets: ticketRows };
}

export async function updateTicketsStatus(
  ticketIds: string[],
  status: TicketStatus,
  client?: DbClient
) {
  if (ticketIds.length === 0) return;
  const db = getDb(client);
  await db
    .update(tickets)
    .set({ status })
    .where(inArray(tickets.id, ticketIds));
}

export async function releaseSeatHoldsForTickets(
  ticketIds: string[],
  client?: DbClient
) {
  if (ticketIds.length === 0) return;
  const db = getDb(client);

  const ticketSeatRows = await db
    .select({
      seatId: tickets.seatId,
      orderId: tickets.orderId,
    })
    .from(tickets)
    .where(inArray(tickets.id, ticketIds));

  const seatIds = ticketSeatRows.map((t) => t.seatId).filter(Boolean) as string[];
  if (seatIds.length === 0) return;

  const orderIds = Array.from(
    new Set(ticketSeatRows.map((t) => t.orderId).filter(Boolean) as string[])
  );
  if (orderIds.length === 0) return;

  await db
    .update(seatHolds)
    .set({ isPaid: false })
    .where(
      and(inArray(seatHolds.orderId, orderIds), inArray(seatHolds.seatId, seatIds))
    );
}

export async function sumRefundAmountsForOrder(
  orderId: string,
  client?: DbClient
) {
  const db = getDb(client);
  const [row] = await db
    .select({
      total: sum(refunds.amount),
    })
    .from(refunds)
    .where(
      and(
        eq(refunds.orderId, orderId),
        notInArray(refunds.status, [
          "rejected",
          "declined",
          "failed",
          "payment_failed",
        ])
      )
    );
  return Number(row?.total ?? 0);
}
