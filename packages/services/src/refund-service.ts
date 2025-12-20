import { db, type DbClient } from "@vieticket/db/pg";
import type { RefundPspMetadata } from "@vieticket/db/pg/schema";
import { Role, RefundReason, RefundStatus } from "@vieticket/db/pg/enums";
import { User } from "@vieticket/db/pg/schemas/users";
import { sql } from "drizzle-orm";
import {
  findBlockingRefundTickets,
  getExistingRefundsForOrder,
  getOrderRefundContext,
  getOrderTicketsForRefund,
  getRefundDetail,
  insertRefundWithTickets,
  listRefundsForAdmin,
  listRefundsForCustomer,
  listRefundsForOrganizer,
  markRefundProcessing,
  releaseSeatHoldsForTickets,
  sumRefundAmountsForOrder,
  updateRefundRecord,
  updateTicketsStatus,
} from "@vieticket/repos/refunds";
import { updateOrderStatus } from "@vieticket/repos/orders";
import { executeRefundWithPSP } from "@vieticket/utils/finance/refund-psp";
import { publishJson, type QstashPublishResult } from "@vieticket/queues";
import {
  ALLOWED_REFUND_OVERRIDE_PERCENTAGES,
  type AllowedRefundOverridePercentage,
  calculateRefundAmount,
  round2,
} from "@vieticket/utils/finance/refund-policy";

export { calculateRefundAmount };

type Actor = Pick<User, "id" | "role">;

export type CreateRefundPayload = {
  orderId: string;
  reason: RefundReason;
  ticketIds?: string[];
  requestedAt?: Date;
};

export type ApprovalOverride = {
  percentage: AllowedRefundOverridePercentage;
  reason?: string;
};

function ensureRole(actor: Actor, allowed: Role[]) {
  if (!allowed.includes(actor.role as Role)) {
    throw new Error("Unauthorized");
  }
}

function isRefundStatusBlocking(status: RefundStatus) {
  return !["rejected", "declined", "failed"].includes(status);
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return normalizeBaseUrl(explicit);

  return null;
}

function resolveRefundExecutionUrl() {
  const baseUrl = resolveAppBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}/api/qstash/refunds/execute`;
}

async function enqueueRefundExecutionWithQstash(
  refundId: string
): Promise<QstashPublishResult> {
  const url = resolveRefundExecutionUrl();
  if (!url) {
    return {
      queued: false,
      kind: "config_missing",
      reason: "NEXT_PUBLIC_BASE_URL (or VERCEL_URL) is not set.",
    };
  }

  return publishJson({
    url,
    body: { refundId },
    deduplicationId: refundId,
  });
}

async function enqueueRefundExecutionAndMarkProcessing(refundId: string) {
  const queued = await enqueueRefundExecutionWithQstash(refundId);
  if (queued.queued) {
    await markRefundProcessing(refundId);
  }
  return queued;
}

async function enqueueRefundExecutionBestEffort(refundId: string) {
  try {
    const result = await enqueueRefundExecutionAndMarkProcessing(refundId);
    if (!result.queued) {
      if (result.kind === "config_missing") {
        console.error(
          `[refund-service] Refund execution queue is not configured for ${refundId}: ${result.reason}`
        );
      } else {
        console.error(
          `[refund-service] Failed to enqueue refund execution for ${refundId}: ${result.reason}`
        );
      }
    }
    return result;
  } catch (error) {
    console.error(
      `[refund-service] Failed to enqueue refund execution for ${refundId}`,
      error
    );
    return null;
  }
}

export async function enqueueRefundExecution(actor: Actor, refundId: string) {
  ensureRole(actor, ["admin"]);
  const detail = await getRefundDetail(refundId);
  if (!detail) throw new Error("Refund not found");

  const executableStatuses: RefundStatus[] = ["approved", "payment_failed", "processing"];
  if (
    !detail.refund.status ||
    !executableStatuses.includes(detail.refund.status as RefundStatus)
  ) {
    throw new Error("Refund is not ready for execution.");
  }

  return enqueueRefundExecutionAndMarkProcessing(refundId);
}

export async function createRefund(
  actor: Actor,
  payload: CreateRefundPayload
) {
  ensureRole(actor, ["customer"]);
  const requestedAt = payload.requestedAt ?? new Date();

  const context = await getOrderRefundContext(payload.orderId);
  if (!context) {
    throw new Error("Order not found");
  }
  if (context.userId !== actor.id) {
    throw new Error("You do not have permission to refund this order.");
  }
  if (!["paid", "partial_refunded", "refunded"].includes(context.orderStatus)) {
    throw new Error("Order is not eligible for refund.");
  }

  const tickets = await getOrderTicketsForRefund(payload.orderId);
  if (tickets.length === 0) {
    throw new Error("No tickets found for this order.");
  }

  const selectedTickets =
    payload.reason === "personal"
      ? tickets.filter((t) => payload.ticketIds?.includes(t.ticketId))
      : tickets;

  if (payload.reason === "personal") {
    if (!payload.ticketIds || payload.ticketIds.length === 0) {
      throw new Error("You must select at least one ticket for personal refunds.");
    }
    if (selectedTickets.length !== payload.ticketIds.length) {
      throw new Error("Some selected tickets do not belong to this order.");
    }
  }

  const blockedTickets = await findBlockingRefundTickets(
    selectedTickets.map((t) => t.ticketId)
  );
  if (blockedTickets.length > 0) {
    throw new Error("One or more tickets already have an active refund.");
  }

  const existingRefunds = await getExistingRefundsForOrder(payload.orderId);
  const existingTotal = existingRefunds
    .filter((r) => isRefundStatusBlocking(r.status as RefundStatus))
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  if (existingTotal >= context.totalAmount) {
    throw new Error("Order has already been fully refunded.");
  }

  const calc = calculateRefundAmount({
    reason: payload.reason,
    orderTotal: context.totalAmount,
    selectedTickets,
    startTime: context.startTime ?? undefined,
    requestedAt,
  });

  if (existingTotal + calc.amount > context.totalAmount + 0.0001) {
    throw new Error("Refund amount would exceed order total.");
  }

  const nextStatus: RefundStatus =
    payload.reason === "personal"
      ? context.autoApproveRefund
        ? "approved"
        : "pending_organizer"
      : "pending_admin";

  const approvedFields =
    nextStatus === "approved"
      ? {
          approvedAt: requestedAt,
          approvedBy: actor.id,
        }
      : {};

  const record = await insertRefundWithTickets(
    {
      orderId: payload.orderId,
      reason: payload.reason,
      requestedAt,
      status: nextStatus,
      amount: calc.amount,
      baseAmount: calc.baseAmount,
      percentageApplied: calc.percentageApplied,
      createdBy: actor.id,
      ...approvedFields,
    },
    selectedTickets.map((t) => ({
      ticketId: t.ticketId,
      ticketPrice: t.price,
    }))
  );

  if (record.status === "approved") {
    const queued = await enqueueRefundExecutionBestEffort(record.id);
    if (queued?.queued) {
      record.status = "processing";
    }
  }

  return record;
}

export async function approveRefund(
  actor: Actor,
  refundId: string,
  override?: ApprovalOverride
) {
  const detail = await getRefundDetail(refundId);
  if (!detail) throw new Error("Refund not found");

  const { refund } = detail;
  const isOrganizer = actor.role === "organizer";

  if (isOrganizer) {
    if (refund.reason !== "personal") {
      throw new Error("Organizers can only approve personal refunds.");
    }
    if (refund.organizerId !== actor.id) {
      throw new Error("You do not own this event.");
    }
    if (refund.status !== "pending_organizer") {
      throw new Error("Refund is not awaiting organizer approval.");
    }
  } else if (actor.role === "admin") {
    const awaitingStatuses: RefundStatus[] = [
      "pending_admin",
      "pending_organizer",
    ];
    if (
      !refund.status ||
      !awaitingStatuses.includes(refund.status as RefundStatus)
    ) {
      throw new Error("Refund is not awaiting admin approval.");
    }
  } else {
    throw new Error("Unauthorized");
  }

  const applyOverride = override && actor.role === "admin" ? override : undefined;

  let amount = Number(refund.amount);
  let percentage = refund.percentageApplied;

  const patch: Record<string, unknown> = {
    status: "approved" as RefundStatus,
    approvedAt: new Date(),
    approvedBy: actor.id,
  };

  if (applyOverride) {
    if (
      !ALLOWED_REFUND_OVERRIDE_PERCENTAGES.includes(applyOverride.percentage)
    ) {
      throw new Error("Override percentage is not allowed.");
    }
    patch.adminOverride = true;
    patch.adminOverrideBy = actor.id;
    patch.adminOverrideAt = new Date();
    patch.adminOverrideReason = applyOverride.reason ?? "Override applied";
    patch.overridePreviousAmount = refund.amount;
    patch.overridePreviousPercentage = refund.percentageApplied;
    percentage = applyOverride.percentage;
    amount = round2(Number(refund.baseAmount) * (percentage / 100));
    patch.amount = amount;
    patch.percentageApplied = percentage;
  }

  const updated = await updateRefundRecord(refundId, patch);
  if (updated?.status === "approved") {
    const queued = await enqueueRefundExecutionBestEffort(updated.id);
    if (queued?.queued) {
      updated.status = "processing";
    }
  }
  return updated;
}

export async function rejectRefund(
  actor: Actor,
  refundId: string,
  reason?: string
) {
  const detail = await getRefundDetail(refundId);
  if (!detail) throw new Error("Refund not found");
  const { refund } = detail;

  if (actor.role === "organizer") {
    if (refund.reason !== "personal") {
      throw new Error("Organizers can only reject personal refunds.");
    }
    if (refund.organizerId !== actor.id) {
      throw new Error("You do not own this event.");
    }
    if (refund.status !== "pending_organizer") {
      throw new Error("Refund is not awaiting organizer decision.");
    }
  } else if (actor.role === "admin") {
    const awaitingStatuses: RefundStatus[] = [
      "pending_admin",
      "pending_organizer",
    ];
    if (
      !refund.status ||
      !awaitingStatuses.includes(refund.status as RefundStatus)
    ) {
      throw new Error("Refund is not awaiting admin decision.");
    }
  } else {
    throw new Error("Unauthorized");
  }

  return updateRefundRecord(refundId, {
    status: "rejected",
    rejectionReason: reason ?? "No reason provided",
    approvedAt: null,
    approvedBy: null,
  });
}

async function markRefundSuccessful(
  refundId: string,
  orderId: string,
  ticketIds: string[],
  totalAmount: number,
  pspMetadata?: RefundPspMetadata
) {
  return db.transaction(async (tx) => {
    return markRefundSuccessfulTx(
      tx,
      refundId,
      orderId,
      ticketIds,
      totalAmount,
      pspMetadata
    );
  });
}

async function markRefundSuccessfulTx(
  tx: DbClient,
  refundId: string,
  orderId: string,
  ticketIds: string[],
  totalAmount: number,
  pspMetadata?: RefundPspMetadata
) {
  const clearedMetadata: RefundPspMetadata | undefined = pspMetadata
    ? { ...pspMetadata, error: undefined }
    : undefined;

  await updateRefundRecord(
    refundId,
    {
      status: "refunded",
      refundedAt: new Date(),
      pspMetadata: clearedMetadata,
    },
    tx
  );

  await updateTicketsStatus(ticketIds, "refunded", tx);
  await releaseSeatHoldsForTickets(ticketIds, tx);

  const newTotal = await sumRefundAmountsForOrder(orderId, tx);
  const nextOrderStatus =
    newTotal >= totalAmount ? "refunded" : "partial_refunded";

  await updateOrderStatus(orderId, nextOrderStatus, tx);
}

export async function executeRefund(actor: Actor, refundId: string) {
  ensureRole(actor, ["admin"]);
  return db.transaction(async (tx) => {
    const lockRes = await tx.execute(sql`
      SELECT id, status FROM refunds 
      WHERE id = ${refundId}
      FOR UPDATE SKIP LOCKED
    `);
    const lockedRow = (lockRes as any).rows?.[0];
    if (!lockedRow) {
      const latest = await getRefundDetail(refundId, tx);
      if (!latest) throw new Error("Refund not found");
      return { status: (latest.refund.status ?? "processing") as RefundStatus };
    }

    const detail = await getRefundDetail(refundId, tx);
    if (!detail) throw new Error("Refund not found");
    const { refund, tickets } = detail;

    if (!refund.status) throw new Error("Refund is not ready for execution.");
    const status = refund.status as RefundStatus;

    // Idempotency: if already in a terminal state, do nothing.
    if (["refunded", "completed", "declined", "rejected", "failed"].includes(status)) {
      return { status };
    }

    const executableStatuses: RefundStatus[] = ["approved", "payment_failed", "processing"];
    if (!executableStatuses.includes(status)) {
      throw new Error("Refund is not ready for execution.");
    }

    if (status !== "processing") {
      await markRefundProcessing(refundId, tx);
    }

    const result = await executeRefundWithPSP({
      refundId,
      orderId: refund.orderId,
      amount: Number(refund.amount),
      reason: refund.reason,
      metadata: refund.paymentMetadata as any,
    });

    if (result.success) {
      const pspMetadata: RefundPspMetadata = {
        provider: result.provider ?? "unknown",
        reference: result.reference,
      };
      const ticketIds =
        refund.reason === "personal"
          ? tickets.map((t) => t.ticketId)
          : (await getOrderTicketsForRefund(refund.orderId, tx)).map(
              (t) => t.ticketId
            );
      await markRefundSuccessfulTx(
        tx,
        refundId,
        refund.orderId,
        ticketIds,
        Number(refund.totalAmount),
        pspMetadata
      );
      return { status: "refunded" as RefundStatus };
    }

    await updateRefundRecord(
      refundId,
      {
        status: "payment_failed",
        pspMetadata: {
          provider: result.provider ?? "unknown",
          reference: result.reference,
          error: {
            code: result.code,
            message: result.message,
            raw: result.raw,
          },
        },
      },
      tx
    );

    return { status: "payment_failed" as RefundStatus };
  });
}

export async function markRefundManual(actor: Actor, refundId: string) {
  ensureRole(actor, ["admin"]);
  const detail = await getRefundDetail(refundId);
  if (!detail) throw new Error("Refund not found");
  const { refund, tickets } = detail;

  if (refund.status !== "payment_failed") {
    throw new Error("Only payment_failed refunds can be manually resolved.");
  }

  const ticketIds =
    refund.reason === "personal"
      ? tickets.map((t) => t.ticketId)
      : (await getOrderTicketsForRefund(refund.orderId)).map(
          (t) => t.ticketId
        );

  await markRefundSuccessful(
    refundId,
    refund.orderId,
    ticketIds,
    Number(refund.totalAmount),
    (refund.pspMetadata as RefundPspMetadata | undefined)
  );

  return { status: "refunded" as RefundStatus };
}

export async function getRefundDetailForRole(actor: Actor, refundId: string) {
  const detail = await getRefundDetail(refundId);
  if (!detail) throw new Error("Refund not found");

  if (actor.role === "admin") {
    return detail;
  }

  if (actor.role === "organizer") {
    if (
      detail.refund.reason === "personal" &&
      detail.refund.organizerId === actor.id
    ) {
      return detail;
    }
    throw new Error("Unauthorized");
  }

  if (actor.role === "customer") {
    if (detail.refund.userId === actor.id) {
      return detail;
    }
    throw new Error("Unauthorized");
  }

  throw new Error("Unauthorized");
}

type RefundListOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: RefundStatus;
  reason?: RefundReason;
  sort?: "requestedAt" | "amount" | "status" | "reason";
  direction?: "asc" | "desc";
};

function normalizeRefundListOptions(options?: RefundListOptions) {
  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.floor(options?.limit ?? 10)));
  const offset = (page - 1) * limit;

  const search = options?.search?.trim();

  return {
    page,
    limit,
    offset,
    search: search ? search : undefined,
    status: options?.status,
    reason: options?.reason,
    sort: options?.sort ?? "requestedAt",
    direction: options?.direction ?? "desc",
  };
}

export async function listRefundsForRoleWithFilters(
  actor: Actor,
  options?: RefundListOptions
) {
  const normalized = normalizeRefundListOptions(options);

  if (actor.role === "admin") {
    const result = await listRefundsForAdmin({
      offset: normalized.offset,
      limit: normalized.limit,
      status: normalized.status,
      reason: normalized.reason,
      search: normalized.search,
      sort: normalized.sort,
      direction: normalized.direction,
    });
    return {
      data: result.data,
      pagination: {
        page: normalized.page,
        limit: normalized.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
    };
  }

  if (actor.role === "organizer") {
    const result = await listRefundsForOrganizer(actor.id, {
      offset: normalized.offset,
      limit: normalized.limit,
      status: normalized.status,
      // Enforce organizer scope: personal refunds only.
      search: normalized.search,
      sort: normalized.sort,
      direction: normalized.direction,
      reason: "personal",
    });
    return {
      data: result.data,
      pagination: {
        page: normalized.page,
        limit: normalized.limit,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
    };
  }

  const result = await listRefundsForCustomer(actor.id, {
    offset: normalized.offset,
    limit: normalized.limit,
    status: normalized.status,
    reason: normalized.reason,
    search: normalized.search,
    sort: normalized.sort,
    direction: normalized.direction,
  });

  return {
    data: result.data,
    pagination: {
      page: normalized.page,
      limit: normalized.limit,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    },
  };
}

export async function listRefundsForRole(
  actor: Actor,
  options?: RefundListOptions
) {
  return listRefundsForRoleWithFilters(actor, options);
}
