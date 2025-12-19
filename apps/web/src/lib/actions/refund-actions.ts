"use server";

import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth/auth";
import {
  approveRefund,
  createRefund,
  executeRefund,
  getRefundDetailForRole,
  listRefundsForRole,
  markRefundManual,
  rejectRefund,
  ApprovalOverride,
  CreateRefundPayload,
} from "@vieticket/services/refund";
import type { RefundReason, RefundStatus } from "@vieticket/db/pg/enums";
import {
  REFUND_REASON_VALUES,
  validateRefundRequestInput,
} from "@vieticket/utils/finance/refund-policy";
import { enqueueRefundExecution } from "@/lib/queues/refund-execution-queue";

async function getCurrentUser() {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    throw new Error("Unauthenticated");
  }
  return session.user;
}

const PUBLIC_ERROR_MESSAGES = new Set<string>([
  "Unauthenticated",
  "Unauthorized",
  "Order not found",
  "You do not have permission to refund this order.",
  "Order is not eligible for refund.",
  "No tickets found for this order.",
  "You must select at least one ticket for personal refunds.",
  "Some selected tickets do not belong to this order.",
  "One or more tickets already have an active refund.",
  "Order has already been fully refunded.",
  "Refund amount would exceed order total.",
  "Refund not found",
  "Organizers can only approve personal refunds.",
  "You do not own this event.",
  "Refund is not awaiting organizer approval.",
  "Refund is not awaiting admin approval.",
  "Override percentage is not allowed.",
  "Organizers can only reject personal refunds.",
  "Refund is not awaiting organizer decision.",
  "Refund is not awaiting admin decision.",
  "Refund is not ready for execution.",
  "Only payment_failed refunds can be manually resolved.",
  "Refund amount must be greater than zero.",
  "startTime is required for personal refunds.",
  "Personal refunds are not allowed within 120 hours of event start.",
  "Unsupported refund reason.",
]);

function isPublicError(error: unknown): error is Error {
  return error instanceof Error && PUBLIC_ERROR_MESSAGES.has(error.message);
}

function toPublicErrorMessage(error: unknown, fallback: string) {
  if (isPublicError(error)) return error.message;
  return fallback;
}

function logIfInternal(context: string, error: unknown) {
  if (isPublicError(error)) return;
  console.error(`[refund-actions] ${context}`, error);
}

const REFUND_STATUS_VALUES = [
  "requested",
  "pending_organizer",
  "pending_admin",
  "approved",
  "declined",
  "rejected",
  "processing",
  "payment_failed",
  "refunded",
  "completed",
  "failed",
] as const;

const REFUND_SORT_FIELDS = ["requestedAt", "amount", "status", "reason"] as const;
const REFUND_SORT_DIRECTIONS = ["asc", "desc"] as const;

type RefundSortField = (typeof REFUND_SORT_FIELDS)[number];
type RefundSortDirection = (typeof REFUND_SORT_DIRECTIONS)[number];

export type ListRefundsActionParams = {
  q?: string;
  status?: string;
  reason?: string;
  sort?: string;
  dir?: string;
  page?: number | string;
  limit?: number | string;
};

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function requestRefundAction(payload: CreateRefundPayload) {
  try {
    const user = await getCurrentUser();
    const result = await createRefund(user, payload);
    return { success: true, data: result };
  } catch (error) {
    logIfInternal("requestRefundAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(error, "Unable to submit refund right now."),
    };
  }
}

export async function approveRefundAction(
  refundId: string,
  override?: ApprovalOverride
) {
  try {
    const user = await getCurrentUser();
    const result = await approveRefund(user, refundId, override);
    return { success: true, data: result };
  } catch (error) {
    logIfInternal("approveRefundAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(error, "Unable to approve refund right now."),
    };
  }
}

export async function rejectRefundAction(refundId: string, reason?: string) {
  try {
    const user = await getCurrentUser();
    const result = await rejectRefund(user, refundId, reason);
    return { success: true, data: result };
  } catch (error) {
    logIfInternal("rejectRefundAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(error, "Unable to reject refund right now."),
    };
  }
}

export async function executeRefundAction(refundId: string) {
  try {
    const user = await getCurrentUser();
    if (user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const queued = await enqueueRefundExecution(refundId);
    if (queued.queued) {
      return { success: true, data: { ...queued } };
    }

    // Fallback for local/dev when QStash isn't configured yet.
    if (queued.kind === "config_missing") {
      const result = await executeRefund(user, refundId);
      return { success: true, data: { queued: false, result } };
    }

    throw new Error(queued.reason);
  } catch (error) {
    logIfInternal("executeRefundAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(
        error,
        "Unable to execute refund right now."
      ),
    };
  }
}

export async function markRefundManualAction(refundId: string) {
  try {
    const user = await getCurrentUser();
    const result = await markRefundManual(user, refundId);
    return { success: true, data: result };
  } catch (error) {
    logIfInternal("markRefundManualAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(
        error,
        "Unable to update refund right now."
      ),
    };
  }
}

export async function listRefundsAction(params: ListRefundsActionParams = {}) {
  try {
    const user = await getCurrentUser();

    const page = clampInt(Number(params.page ?? 1) || 1, 1, 1_000_000);
    const limit = clampInt(Number(params.limit ?? 10) || 10, 1, 50);

    const search = typeof params.q === "string" ? params.q.trim() : undefined;

    const status = REFUND_STATUS_VALUES.includes(params.status as any)
      ? (params.status as RefundStatus)
      : undefined;

    const reason = REFUND_REASON_VALUES.includes(params.reason as any)
      ? (params.reason as RefundReason)
      : undefined;

    const sort = REFUND_SORT_FIELDS.includes(params.sort as any)
      ? (params.sort as RefundSortField)
      : undefined;

    const direction = REFUND_SORT_DIRECTIONS.includes(params.dir as any)
      ? (params.dir as RefundSortDirection)
      : undefined;

    const result = await listRefundsForRole(user, {
      page,
      limit,
      search,
      status,
      reason,
      sort,
      direction,
    });

    return { success: true, data: result.data, pagination: result.pagination };
  } catch (error) {
    logIfInternal("listRefundsAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(error, "Unable to load refunds right now."),
    };
  }
}

export async function getRefundDetailAction(refundId: string) {
  try {
    const user = await getCurrentUser();
    const result = await getRefundDetailForRole(user, refundId);
    return { success: true, data: result };
  } catch (error) {
    logIfInternal("getRefundDetailAction", error);
    return {
      success: false,
      error: toPublicErrorMessage(error, "Unable to load refund right now."),
    };
  }
}

/**
 * Form-data friendly wrapper for customer refund requests.
 * Expects fields: orderId (string), reason (RefundReason), ticketIds (multiple, optional).
 */
export async function submitRefundForm(formData: FormData) {
  try {
    const orderId = formData.get("orderId") as string | null;
    const reason = formData.get("reason") as RefundReason | null;
    const ticketIds = formData.getAll("ticketIds").filter(Boolean) as string[];

    if (!orderId || !reason) {
      return { success: false, error: "Order and refund reason are required." };
    }

    const validation = validateRefundRequestInput({
      reason,
      ticketIds: ticketIds.length > 0 ? ticketIds : undefined,
    });
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const res = await requestRefundAction({
      orderId,
      reason,
      ticketIds: validation.value.ticketIds,
    });

    return res;
  } catch (error) {
    logIfInternal("submitRefundForm", error);
    return { success: false, error: "Unable to submit refund right now." };
  }
}
