import { User } from "@vieticket/db/pg/schema";
import { db } from "@vieticket/db/pg";
import { showings } from "@vieticket/db/pg/schemas/events";
import { eq } from "drizzle-orm";
import {
  getSeatPricing,
  getSeatStatus,
  updateOrderVNPayData,
  executePaymentTransaction,
  failOrderAndReleaseSeatHolds,
  expireOrderAndReleaseSeatHolds,
  getOrderById,
  getOrderByVNPayTxnRef,
  getUserUnconfirmedSeatHolds,
  createOrderWithSeatLocks,
  createGAOrderWithSeatLocks,
} from "@vieticket/repos/checkout";
import { getEventByTicketId, getTicketDetails } from "@vieticket/repos/orders";
import {
  findEventById,
  findEventWithShowings,
  getEventSeatingStructure,
  getShowingSeatingStructure,
} from "@vieticket/repos/events";
import {
  generatePaymentUrl,
  ReturnQueryFromVNPay,
  verifyVNPayResponse,
  queryVNPayPaymentResult,
} from "@vieticket/utils/vnpay";
import { cancelMessage, publishJson, type QstashPublishResult } from "@vieticket/queues";
import { generateQRCodeBuffer } from "@vieticket/utils/ticket-validation/client";
import { generateTicketQRData } from "@vieticket/utils/ticket-validation/server";
import { sendMail } from "@vieticket/utils/mailer";
import { user as users } from "@vieticket/db/pg/schemas/users";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return normalizeBaseUrl(explicit);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizeBaseUrl(vercel.startsWith("http") ? vercel : `https://${vercel}`);
  }

  return null;
}

function resolvePaymentExpirationSeconds() {
  const ttl = process.env.PAYMENT_TTL_SECONDS
    ? Number.parseInt(process.env.PAYMENT_TTL_SECONDS, 10)
    : 900;
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 900;
}

function resolveOrderRevalidateUrl() {
  const baseUrl = resolveAppBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}/api/qstash/orders/revalidate`;
}

async function enqueueOrderPaymentRevalidation(orderId: string, expiresAt: Date) {
  const url = resolveOrderRevalidateUrl();
  if (!url) {
    return {
      queued: false,
      kind: "config_missing",
      reason: "NEXT_PUBLIC_BASE_URL (or VERCEL_URL) is not set.",
    } satisfies QstashPublishResult;
  }

  const notBefore = Math.floor(expiresAt.getTime() / 1000) + 1;

  return publishJson({
    url,
    body: { orderId },
    notBefore,
    deduplicationId: `order-revalidate-${orderId}`,
  });
}

function getVNPayPaymentData(
  paymentMetadata: unknown
): Record<string, unknown> | null {
  if (!paymentMetadata || typeof paymentMetadata !== "object") return null;
  if (!("provider" in paymentMetadata)) return null;
  if ((paymentMetadata as any).provider !== "vnpay") return null;
  const data = (paymentMetadata as any).data;
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

async function clearOrderPaymentRevalidationMessageId(orderId: string) {
  const latest = await getOrderById(orderId);
  if (!latest) return;
  const vnpayData = getVNPayPaymentData(latest.paymentMetadata);
  if (!vnpayData) return;

  const { paymentRevalidateQstashMessageId: _ignored, ...rest } = vnpayData as any;
  if (typeof rest.vnp_TxnRef !== "string" || !rest.vnp_TxnRef) return;

  await updateOrderVNPayData(orderId, rest as any);
}

async function cancelOrderPaymentRevalidation(
  orderId: string,
  messageId: string | null | undefined
) {
  if (!messageId) return;

  const result = await cancelMessage(messageId);
  if (!result.cancelled) {
    console.error(
      `[checkout-service] Failed to cancel payment revalidation message ${messageId} for order ${orderId}: ${result.reason}`
    );
  }

  try {
    await clearOrderPaymentRevalidationMessageId(orderId);
  } catch (error) {
    console.error(
      `[checkout-service] Failed to clear payment revalidation message id for order ${orderId}`,
      error
    );
  }
}

function parseVNPayGmt7DateToUtc(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!/^\d{14}$/.test(raw)) return null;

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6)) - 1;
  const day = Number(raw.slice(6, 8));
  const hour = Number(raw.slice(8, 10));
  const minute = Number(raw.slice(10, 12));
  const second = Number(raw.slice(12, 14));

  if (
    [year, month, day, hour, minute, second].some((n) => Number.isNaN(n)) ||
    month < 0 ||
    month > 11
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month, day, hour - 7, minute, second));
}

async function attachVNPayPaymentAndScheduleRevalidation({
  orderId,
  userId,
  amount,
  clientIp,
  expiresAt,
  paymentExpirationSeconds,
}: {
  orderId: string;
  userId: string;
  amount: number;
  clientIp: string;
  expiresAt: Date;
  paymentExpirationSeconds: number;
}) {
  let queuedMessageId: string | null = null;
  try {
    const baseUrl = resolveAppBaseUrl();
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_BASE_URL (or VERCEL_URL) is not set.");
    }

    const returnUrl = `${baseUrl}/api/checkout/vnpay/return`;
    const orderInfo = `Thanh toan don hang ${orderId}`;

    const { vnp_TxnRef, vnp_CreateDate, vnp_ExpireDate, paymentURL } =
      generatePaymentUrl({
        amount,
        ipAddr: clientIp,
        orderId,
        orderInfo,
        returnUrl,
        paymentExpirationSeconds,
      });

    await updateOrderVNPayData(orderId, {
      vnp_TxnRef,
      vnp_CreateDate,
      vnp_ExpireDate,
      vnp_OrderInfo: orderInfo,
    } as any);

    const queued = await enqueueOrderPaymentRevalidation(orderId, expiresAt);
    if (!queued.queued) {
      throw new Error(
        `Payment verification queue is not available: ${queued.reason}`
      );
    }

    queuedMessageId = queued.messageId;

    await updateOrderVNPayData(orderId, {
      vnp_TxnRef,
      vnp_CreateDate,
      vnp_ExpireDate,
      vnp_OrderInfo: orderInfo,
      paymentRevalidateQstashMessageId: queued.messageId,
    } as any);

    return { vnp_TxnRef, paymentURL };
  } catch (error) {
    if (queuedMessageId) {
      const cancelled = await cancelMessage(queuedMessageId);
      if (!cancelled.cancelled) {
        console.error(
          `[checkout-service] Failed to cancel queued payment revalidation message ${queuedMessageId} for order ${orderId}: ${cancelled.reason}`
        );
      }
    }

    try {
      await failOrderAndReleaseSeatHolds(orderId, userId);
    } catch (releaseError) {
      console.error(
        `[checkout-service] Failed to release seat holds for order ${orderId} after checkout setup failure`,
        releaseError
      );
    }
    throw error;
  }
}

export async function getShowingTicketData(
  showingId: string,
  user: Pick<User, "role">
) {
  if (user.role !== "customer") {
    throw new Error("Unauthorized: Only customers can purchase tickets.");
  }

  try {
    // 1. Get showing with event information
    const showing = await db.query.showings.findFirst({
      where: eq(showings.id, showingId),
      with: {
        event: true,
      },
    });

    if (!showing) {
      throw new Error("Showing not found.");
    }

    if (!showing.isActive) {
      throw new Error("Showing is not active.");
    }

    if (showing.event.approvalStatus !== "approved") {
      throw new Error("Event is not approved for ticket sales.");
    }

    // 2. Check if tickets are on sale for this showing
    const now = new Date();
    const ticketSaleStart =
      showing.ticketSaleStart || showing.event.ticketSaleStart;
    const ticketSaleEnd = showing.ticketSaleEnd || showing.event.ticketSaleEnd;

    // Only check if tickets sales have ended (not started yet should still allow viewing)
    if (ticketSaleEnd && now > ticketSaleEnd) {
      throw new Error("Ticket sales have ended for this showing.");
    }

    // If before sale start, allow viewing but mark as not yet on sale
    const isTicketSaleActive = !ticketSaleStart || now >= ticketSaleStart;

    // 3. Fetch seating structure and seat status for the showing
    const [seatingStructure, seatStatus] = await Promise.all([
      getShowingSeatingStructure(showingId),
      getSeatStatus(showing.event.id), // Seat status is still event-based for now
    ]);
    
    // 4. Return the data
    return {
      eventData: showing.event,
      showingData: showing,
      seatingStructure,
      seatStatus,
      isTicketSaleActive, // Include ticket sale status
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get showing ticket data: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while fetching showing ticket data."
    );
  }
}

export async function getTicketData(eventId: string, user: Pick<User, "role">) {
  if (user.role !== "customer") {
    throw new Error("Unauthorized: Only customers can purchase tickets.");
  }

  try {
    // 1. Fetch and validate event availability with showings
    const eventData = await findEventWithShowings(eventId);

    if (!eventData) {
      throw new Error("Event not found.");
    }

    if (eventData.approvalStatus !== "approved") {
      throw new Error("Event is not approved for ticket sales.");
    }

    // 2. Get event seating structure and seat status
    const [seatingStructure, seatStatus] = await Promise.all([
      getEventSeatingStructure(eventId),
      getSeatStatus(eventId), // Get seat status for the event
    ]);

    // 3. Return event data with showings, seating structure, and seat status
    return {
      eventData,
      showings: eventData.showings,
      seatingStructure,
      seatStatus,
    };
  } catch (error) {
    // Propagate errors from the repository layer
    if (error instanceof Error) {
      throw new Error(`Failed to get ticket data: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching ticket data.");
  }
}

/**
 * Creates a pending order, holds seats, and generates a VNPay payment URL.
 * @param eventId - The ID of the event (deprecated, use showingId).
 * @param showingId - The ID of the showing.
 * @param selectedSeatIds - An array of seat IDs selected by the user.
 * @param user - The authenticated user object.
 * @param clientIp - The client's IP address.
 * @returns An object containing the payment URL, order details, and hold expiration.
 */
export async function createPendingOrder(
  eventId: string,
  selectedSeatIds: string[],
  user: Pick<User, "id" | "role">,
  clientIp: string,
  showingId?: string
) {
  if (user.role !== "customer") {
    throw new Error("Unauthorized: Only customers can purchase tickets.");
  }
  if (!selectedSeatIds || selectedSeatIds.length === 0) {
    throw new Error("At least one seat must be selected.");
  }

  // 1. Get event data to check maxTicketsByOrder
  let eventData;
  if (showingId) {
    const showing = await db.query.showings.findFirst({
      where: eq(showings.id, showingId),
      with: { event: true },
    });
    if (!showing) {
      throw new Error("Showing not found.");
    }
    if (!showing.isActive) {
      throw new Error("Showing is not active.");
    }
    if (showing.event.approvalStatus !== "approved") {
      throw new Error("Event is not approved for ticket sales.");
    }
    const now = new Date();
    const ticketSaleStart =
      showing.ticketSaleStart || showing.event.ticketSaleStart;
    const ticketSaleEnd = showing.ticketSaleEnd || showing.event.ticketSaleEnd;
    if (ticketSaleEnd && now > ticketSaleEnd) {
      throw new Error("Ticket sales have ended for this showing.");
    }
    if (ticketSaleStart && now < ticketSaleStart) {
      throw new Error("Ticket sales have not started for this showing.");
    }
    eventData = showing.event;
  } else {
    eventData = await findEventById(eventId);
    if (!eventData) {
      throw new Error("Event not found.");
    }
  }

  // 2. Check maxTicketsByOrder limit
  if (
    eventData.maxTicketsByOrder &&
    selectedSeatIds.length > eventData.maxTicketsByOrder
  ) {
    throw new Error(
      `Cannot select more than ${eventData.maxTicketsByOrder} tickets per order.`
    );
  }

  // 3. Get pricing and calculate total (includes showing/event context)
  const seatDetails = await getSeatPricing(selectedSeatIds);
  if (seatDetails.length !== selectedSeatIds.length) {
    throw new Error("Could not retrieve pricing for all selected seats.");
  }
  // Derive showing context from seats if not provided
  const derivedShowingId =
    showingId ??
    seatDetails[0]?.showingId ??
    null;
  if (!derivedShowingId) {
    throw new Error("Could not determine showing for selected seats.");
  }
  // Ensure all seats belong to the same showing
  const mismatchedShowing = seatDetails.find(
    (s) => s.showingId && s.showingId !== derivedShowingId
  );
  if (mismatchedShowing) {
    throw new Error("All selected seats must belong to the same showing.");
  }

  const totalAmount = seatDetails.reduce((sum, seat) => sum + seat.price, 0);

  // 4. Create order and seat holds in a transaction with locking
  const paymentExpirationSeconds = resolvePaymentExpirationSeconds();
  const expiresAt = new Date(Date.now() + paymentExpirationSeconds * 1000);

  const { order: newOrder } = await createOrderWithSeatLocks(
    {
      userId: user.id,
      eventId: eventData.id,
      showingId: derivedShowingId,
      totalAmount: totalAmount,
      expiresAt,
      status: "pending_payment",
    },
    selectedSeatIds
  );

  const { paymentURL } = await attachVNPayPaymentAndScheduleRevalidation({
    orderId: newOrder.id,
    userId: user.id,
    amount: totalAmount,
    clientIp,
    expiresAt,
    paymentExpirationSeconds,
  });

  // 5. Return response
  return {
    vnpayURL: paymentURL,
    orderId: newOrder.id,
    totalAmount,
    expiresAt,
    selectedSeats: seatDetails,
  };
}

/**
 * GA checkout: lock GA seats by quantity and create order + holds atomically.
 */
export async function createPendingGAOrder(
  eventId: string,
  showingId: string,
  areaRequests: Array<{ areaId: string; quantity: number }>,
  user: Pick<User, "id" | "role">,
  clientIp: string
) {
  if (user.role !== "customer") {
    throw new Error("Unauthorized: Only customers can purchase tickets.");
  }
  if (!showingId) {
    throw new Error("Showing is required for general admission checkout.");
  }
  const validRequests = areaRequests.filter((r) => r.quantity > 0);
  if (validRequests.length === 0) {
    throw new Error("At least one ticket must be selected.");
  }

  const showing = await db.query.showings.findFirst({
    where: eq(showings.id, showingId),
    with: { event: true },
  });

  if (!showing) {
    throw new Error("Showing not found.");
  }
  if (showing.event.id !== eventId) {
    throw new Error("Showing does not belong to the specified event.");
  }
  if (!showing.isActive) {
    throw new Error("Showing is not active.");
  }
  if (showing.event.approvalStatus !== "approved") {
    throw new Error("Event is not approved for ticket sales.");
  }
  const now = new Date();
  const ticketSaleStart =
    showing.ticketSaleStart || showing.event.ticketSaleStart;
  const ticketSaleEnd = showing.ticketSaleEnd || showing.event.ticketSaleEnd;
  if (ticketSaleEnd && now > ticketSaleEnd) {
    throw new Error("Ticket sales have ended for this showing.");
  }
  if (ticketSaleStart && now < ticketSaleStart) {
    throw new Error("Ticket sales have not started for this showing.");
  }

  if (
    showing.event.maxTicketsByOrder &&
    validRequests.reduce((sum, r) => sum + r.quantity, 0) >
      showing.event.maxTicketsByOrder
  ) {
    throw new Error(
      `Cannot select more than ${showing.event.maxTicketsByOrder} tickets per order.`
    );
  }

  const paymentExpirationSeconds = resolvePaymentExpirationSeconds();
  const expiresAt = new Date(Date.now() + paymentExpirationSeconds * 1000);

  const { order, seats, totalAmount } = await createGAOrderWithSeatLocks({
    eventId: showing.event.id,
    showingId,
    userId: user.id,
    requests: validRequests,
    expiresAt,
    status: "pending_payment",
  });

  const { paymentURL } = await attachVNPayPaymentAndScheduleRevalidation({
    orderId: order.id,
    userId: user.id,
    amount: totalAmount,
    clientIp,
    expiresAt,
    paymentExpirationSeconds,
  });

  return {
    vnpayURL: paymentURL,
    orderId: order.id,
    totalAmount,
    expiresAt,
    selectedSeats: seats,
  };
}

// PHASE 3

export interface PaymentProcessingResult {
  success: boolean;
  orderId: string;
  ticketCount?: number;
  totalAmount?: number;
  orderStatus: string;
  tickets?: Array<{
    ticketId: string;
    seatId: string;
    seatNumber: string;
    rowName: string;
    areaName: string;
  }>;
  emailSent?: boolean;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Processes VNPay payment result and confirms order
 * @param vnpayResponseData - VNPay response parameters
 * @param userId - The authenticated user ID
 * @returns Payment processing result
 */
export async function processPaymentResult(
  vnpayResponseData: ReturnQueryFromVNPay,
  user?: User | null
): Promise<PaymentProcessingResult> {
  try {
    // 1. Validate VNPay response signature and parameters
    const vnpayReturn = verifyVNPayResponse(vnpayResponseData);
    if (!vnpayReturn.isVerified) {
      throw new Error("Invalid VNPay response signature");
    }

    // 2. Retrieve order data using VNPay transaction reference stored in payment metadata
    const order = await getOrderByVNPayTxnRef(vnpayReturn.vnp_TxnRef);
    if (!order) {
      return {
        success: false,
        orderId: "",
        orderStatus: "not_found",
        error: {
          code: "ORDER_NOT_FOUND",
          message: "Order not found for this transaction reference",
        },
      };
    }

    const vnpayData = getVNPayPaymentData(order.paymentMetadata);
    const revalidateMessageId =
      vnpayData && typeof (vnpayData as any).paymentRevalidateQstashMessageId === "string"
        ? String((vnpayData as any).paymentRevalidateQstashMessageId)
        : null;

    // 3. If a session exists, ensure it belongs to the order owner
    if (user) {
      if (user.role !== "customer") {
        throw new Error("Unauthorized: Only customers can process payments");
      }
      if (order.userId !== user.id) {
        return {
          success: false,
          orderId: order.id,
          orderStatus: "unauthorized",
          error: {
            code: "ORDER_USER_MISMATCH",
            message: "Order does not belong to authenticated user",
          },
        };
      }
    }

    // 4. Check if payment was successful (use verified values from vnpayReturn)
    if (!vnpayReturn.isSuccess) {
      // Payment failed - update order status
      await failOrderAndReleaseSeatHolds(order.id, order.userId);
      await cancelOrderPaymentRevalidation(order.id, revalidateMessageId);

      return {
        success: false,
        orderId: order.id,
        orderStatus: "failed",
        error: {
          code: "PAYMENT_FAILED",
          message: `Payment failed with code: ${vnpayReturn.vnp_ResponseCode}`,
        },
      };
    }

    // 5. Verify payment amount matches order (use verified amount from vnpayReturn)
    if (Math.abs(vnpayReturn.vnp_Amount - order.totalAmount) > 0.01) {
      await failOrderAndReleaseSeatHolds(order.id, order.userId);
      await cancelOrderPaymentRevalidation(order.id, revalidateMessageId);

      return {
        success: false,
        orderId: order.id,
        orderStatus: "failed",
        error: {
          code: "AMOUNT_MISMATCH",
          message: "Payment amount does not match order total",
        },
      };
    }

    // Persist VNPay payment identifiers for refunds/reconciliation.
    try {
      const existing =
        order.paymentMetadata &&
        (order.paymentMetadata as any).provider === "vnpay" &&
        (order.paymentMetadata as any).data
          ? ((order.paymentMetadata as any).data as Record<string, unknown>)
          : {};

      await updateOrderVNPayData(order.id, {
        ...existing,
        vnp_TxnRef: vnpayReturn.vnp_TxnRef,
        vnp_PayDate: vnpayReturn.vnp_PayDate,
        vnp_TransactionNo: vnpayReturn.vnp_TransactionNo,
      } as any);
    } catch (metaError) {
      console.error("Failed to persist VNPay payment metadata:", metaError);
    }

    // 6. Handle idempotency/terminal states
    if (order.status === "paid") {
      // Order already confirmed, return existing ticket details
      const tickets = await getTicketDetails(order.id);
      await cancelOrderPaymentRevalidation(order.id, revalidateMessageId);

      return {
        success: true,
        orderId: order.id,
        ticketCount: tickets.length,
        totalAmount: order.totalAmount,
        orderStatus: "paid",
        tickets: tickets.map((ticket) => ({
          ticketId: ticket.ticketId,
          seatId: ticket.seatId,
          seatNumber: ticket.seatNumber,
          rowName: ticket.rowName,
          areaName: ticket.areaName,
        })),
        emailSent: true,
      };
    }

    if (
      order.status === "expired" ||
      order.status === "failed" ||
      order.status === "cancelled" ||
      order.status === "refunded" ||
      order.status === "partial_refunded"
    ) {
      await cancelOrderPaymentRevalidation(order.id, revalidateMessageId);
      return {
        success: false,
        orderId: order.id,
        orderStatus: order.status,
        error: {
          code: "ORDER_TERMINAL",
          message: `Order is already ${order.status}`,
        },
      };
    }

    // 7. Generate ticket data before executing payment transaction
    const seatHolds = await getUserUnconfirmedSeatHolds(order.userId, order.id);

    if (seatHolds.length === 0) {
      throw new Error("No seat holds found for this order");
    }

    const orderOwner =
      user ??
      (await db.query.user.findFirst({
        where: eq(users.id, order.userId),
      }));

    const ticketData = seatHolds.map((hold) => ({
      seatId: hold.seatId,
      status: "active" as const,
    }));

    const paidAt = parseVNPayGmt7DateToUtc(vnpayReturn.vnp_PayDate);

    // 8. Execute payment confirmation transaction with pre-generated ticket data
    const transactionResult = await executePaymentTransaction(
      order.id,
      order.userId,
      ticketData,
      {
        validationTime: paidAt ?? new Date(),
      }
    );

    // 9. Get detailed ticket information
    const ticketDetails = await getTicketDetails(order.id);

    // 10. Send order confirmation email
    let emailSent = false;
    try {
      // Get user details to obtain email
      if (orderOwner) {
        emailSent = await sendOrderConfirmationEmail(
          orderOwner,
          transactionResult.order,
          ticketDetails
        );
      }
    } catch (emailError) {
      // Log email error but don't fail the order
      console.error("Failed to send order confirmation email:", emailError);
    }

    await cancelOrderPaymentRevalidation(order.id, revalidateMessageId);

    // 11. Return success response
    return {
      success: true,
      orderId: order.id,
      ticketCount: transactionResult.seatCount,
      totalAmount: transactionResult.order.totalAmount,
      orderStatus: "paid",
      tickets: ticketDetails.map((ticket) => ({
        ticketId: ticket.ticketId,
        seatId: ticket.seatId,
        seatNumber: ticket.seatNumber,
        rowName: ticket.rowName,
        areaName: ticket.areaName,
      })),
      emailSent,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      orderId: "",
      orderStatus: "error",
      error: {
        code: "PAYMENT_PROCESSING_ERROR",
        message: errorMessage,
      },
    };
  }
}

export type OrderPaymentRevalidationResult =
  | { ok: true; orderId: string; orderStatus: string; skipped?: boolean }
  | { ok: false; orderId: string; reason: string };

/**
 * QStash-triggered payment revalidation for orders that never return from VNPay.
 * Queries VNPay and finalizes the order (paid/expired) accordingly.
 */
export async function revalidateOrderPayment(
  orderId: string
): Promise<OrderPaymentRevalidationResult> {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, orderId, reason: "Order not found" };

  // Idempotency / already-terminal
  if (
    order.status === "paid" ||
    order.status === "failed" ||
    order.status === "expired" ||
    order.status === "cancelled" ||
    order.status === "refunded" ||
    order.status === "partial_refunded"
  ) {
    try {
      await clearOrderPaymentRevalidationMessageId(orderId);
    } catch {
      // ignore
    }
    return { ok: true, orderId, orderStatus: order.status, skipped: true };
  }

  if (!order.expiresAt) {
    return { ok: false, orderId, reason: "Order has no expiresAt" };
  }

  const paymentMetadata = order.paymentMetadata as any;
  const vnpayData =
    paymentMetadata && paymentMetadata.provider === "vnpay"
      ? (paymentMetadata.data as Record<string, unknown>)
      : null;

  if (!vnpayData) {
    return { ok: false, orderId, reason: "Unsupported payment provider" };
  }

  const txnRef = typeof vnpayData.vnp_TxnRef === "string" ? vnpayData.vnp_TxnRef : "";
  const orderInfo =
    typeof vnpayData.vnp_OrderInfo === "string" && vnpayData.vnp_OrderInfo.trim()
      ? vnpayData.vnp_OrderInfo
      : `Thanh toan don hang ${orderId}`;

  const transactionDateRaw = vnpayData.vnp_CreateDate;
  const transactionDate = Number(transactionDateRaw);

  if (!txnRef) {
    return { ok: false, orderId, reason: "Missing vnp_TxnRef" };
  }
  if (!Number.isFinite(transactionDate) || transactionDate <= 0) {
    return { ok: false, orderId, reason: "Missing vnp_CreateDate for queryDr" };
  }

  const transactionNo =
    typeof vnpayData.vnp_TransactionNo === "number"
      ? vnpayData.vnp_TransactionNo
      : undefined;

  const query = await queryVNPayPaymentResult({
    txnRef,
    orderInfo,
    transactionDate,
    transactionNo,
  });

  if (!query.verified) {
    throw new Error("VNPay queryDr response is not verified");
  }
  if (!query.queryOk) {
    return {
      ok: false,
      orderId,
      reason: `VNPay queryDr failed with code ${query.responseCode ?? "unknown"}`,
    };
  }

  if (!query.success) {
    await expireOrderAndReleaseSeatHolds(orderId, order.userId);
    try {
      await clearOrderPaymentRevalidationMessageId(orderId);
    } catch {
      // ignore
    }
    return { ok: true, orderId, orderStatus: "expired" };
  }

  const paidAt = parseVNPayGmt7DateToUtc(query.payDate);
  if (!paidAt) {
    throw new Error("Missing VNPay vnp_PayDate in queryDr response");
  }
  if (paidAt > order.expiresAt) {
    await expireOrderAndReleaseSeatHolds(orderId, order.userId);
    try {
      await clearOrderPaymentRevalidationMessageId(orderId);
    } catch {
      // ignore
    }
    return { ok: true, orderId, orderStatus: "expired" };
  }

  const rawAmount = Number(query.amount);
  const expectedAmount = Number(order.totalAmount);
  const amountMatches =
    Number.isFinite(rawAmount) &&
    (Math.abs(rawAmount - expectedAmount) < 0.01 ||
      Math.abs(rawAmount / 100 - expectedAmount) < 0.01);
  if (!amountMatches) {
    await failOrderAndReleaseSeatHolds(orderId, order.userId);
    try {
      await clearOrderPaymentRevalidationMessageId(orderId);
    } catch {
      // ignore
    }
    return { ok: true, orderId, orderStatus: "failed" };
  }

  // Persist VNPay identifiers (best-effort)
  try {
    const existing =
      paymentMetadata &&
      paymentMetadata.provider === "vnpay" &&
      paymentMetadata.data
        ? (paymentMetadata.data as Record<string, unknown>)
        : {};

    await updateOrderVNPayData(orderId, {
      ...existing,
      vnp_TxnRef: txnRef,
      vnp_PayDate: query.payDate,
      vnp_TransactionNo: query.transactionNo,
    } as any);
  } catch (metaError) {
    console.error("[checkout-service] Failed to persist VNPay queryDr metadata:", metaError);
  }

  const seatHolds = await getUserUnconfirmedSeatHolds(order.userId, orderId);
  if (seatHolds.length === 0) {
    try {
      await clearOrderPaymentRevalidationMessageId(orderId);
    } catch {
      // ignore
    }
    return { ok: true, orderId, orderStatus: order.status ?? "pending_payment", skipped: true };
  }

  const ticketData = seatHolds.map((hold) => ({
    seatId: hold.seatId,
    status: "active" as const,
  }));

  const transactionResult = await executePaymentTransaction(orderId, order.userId, ticketData, {
    validationTime: paidAt,
  });

  const ticketDetails = await getTicketDetails(orderId);

  try {
    const orderOwner = await db.query.user.findFirst({
      where: eq(users.id, order.userId),
    });
    if (orderOwner) {
      await sendOrderConfirmationEmail(orderOwner, transactionResult.order, ticketDetails);
    }
  } catch (emailError) {
    console.error("[checkout-service] Failed to send order confirmation email:", emailError);
  }

  try {
    await clearOrderPaymentRevalidationMessageId(orderId);
  } catch {
    // ignore
  }

  return { ok: true, orderId, orderStatus: "paid" };
}

/**
 * Sends order confirmation email with QR code tickets
 * @param user - User object
 * @param orderData - Order information
 * @param tickets - Ticket details with IDs and names
 * @returns Promise<boolean> indicating email delivery success
 */
async function sendOrderConfirmationEmail(
  user: User,
  orderData: any,
  tickets: any[]
): Promise<boolean> {
  try {
    // Get event information for the first ticket (all tickets in an order are for the same event)
    const eventInfo = await getEventByTicketId(tickets[0].ticketId);
    if (!eventInfo) {
      throw new Error("Could not determine event for tickets");
    }

    // Generate QR codes for all tickets with complete data
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => {
        const qrData = generateTicketQRData(
          ticket.ticketId,
          user.name,
          eventInfo.eventId,
          ticket.seatNumber,
          ticket.rowName,
          ticket.areaName
        );
        const qrCodeBuffer = await generateQRCodeBuffer(qrData);
        const filename = `ticket-${ticket.ticketId}.png`;
        const cid = filename;
        return {
          ...ticket,
          qrCodeBuffer,
          qrData,
          cid,
        };
      })
    );

    // Format total amount for display
    const formattedTotal = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(orderData.totalAmount);

    // Format order date
    const orderDate = new Date(
      orderData.orderDate || orderData.updatedAt
    ).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Generate HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác nhận đơn hàng</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
          }
          .order-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .order-info h2 {
            color: #495057;
            margin-top: 0;
            font-size: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
          }
          .info-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #007bff;
          }
          .ticket {
            border: 2px solid #007bff;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          }
          .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #007bff;
          }
          .ticket-number {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
          }
          .seat-info {
            font-size: 16px;
            color: #495057;
          }
          .qr-section {
            text-align: center;
            margin-top: 15px;
            padding: 15px;
            background-color: white;
            border-radius: 8px;
          }
          .qr-code {
            max-width: 150px;
            height: auto;
            border: 1px solid #dee2e6;
            border-radius: 5px;
          }
          .validation-code {
            font-family: monospace;
            font-size: 12px;
            color: #6c757d;
            margin-top: 10px;
            word-break: break-all;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
          }
          .important-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
          }
          @media (max-width: 600px) {
            body { padding: 10px; }
            .container { padding: 20px; }
            .info-row { flex-direction: column; }
            .ticket-header { flex-direction: column; align-items: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 VieTicket</h1>
            <p>Xác nhận đơn hàng thành công</p>
          </div>

          <div class="order-info">
            <h2>📋 Thông tin đơn hàng</h2>
            <div class="info-row">
              <span>Mã đơn hàng:</span>
              <span><strong>${orderData.id}</strong></span>
            </div>
            <div class="info-row">
              <span>Ngày đặt:</span>
              <span>${orderDate}</span>
            </div>
            <div class="info-row">
              <span>Số lượng vé:</span>
              <span>${tickets.length} vé</span>
            </div>
            <div class="info-row">
              <span>Tổng tiền:</span>
              <span>${formattedTotal}</span>
            </div>
          </div>

          <h2>🎟️ Vé của bạn</h2>
          ${ticketsWithQR
            .map(
              (ticket, index) => `
            <div class="ticket">
              <div class="ticket-header">
                <div class="ticket-number">Vé #${index + 1}</div>
                <div class="seat-info">
                  <strong>${ticket.areaName}</strong><br>
                  Hàng ${ticket.rowName} - Ghế ${ticket.seatNumber}
                </div>
              </div>
              
              <div class="qr-section">
                <p><strong>Mã QR để vào cửa:</strong></p>
                <img src="cid:${ticket.cid}" alt="QR Code cho vé ${index + 1}" class="qr-code" />
                <div class="validation-code">
                  Mã vé: ${ticket.ticketId}
                </div>
              </div>
            </div>
          `
            )
            .join("")}

          <div class="important-note">
            <strong>📌 Lưu ý quan trọng:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Vui lòng mang theo email này hoặc lưu mã QR trên điện thoại</li>
              <li>Xuất trình mã QR tại cổng vào để được quét vé</li>
              <li>Mỗi mã QR chỉ được sử dụng một lần</li>
              <li>Không chia sẻ mã QR với người khác</li>
            </ul>
          </div>

          <div class="footer">
            <p>Cảm ơn bạn đã sử dụng dịch vụ VieTicket!</p>
            <p>Nếu có thắc mắc, vui lòng liên hệ support@vieticket.com</p>
            <p style="font-size: 12px; margin-top: 15px;">
              Email này được gửi tự động, vui lòng không trả lời trực tiếp.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate plain text version
    const textContent = `
VieTicket - Xác nhận đơn hàng

THÔNG TIN ĐỌN HÀNG
==================
Mã đơn hàng: ${orderData.id}
Ngày đặt: ${orderDate}
Số lượng vé: ${tickets.length} vé
Tổng tiền: ${formattedTotal}

VÉ CỦA BẠN
===========
${ticketsWithQR
  .map(
    (ticket, index) => `
Vé #${index + 1}
- Khu vực: ${ticket.areaName}
- Vị trí: Hàng ${ticket.rowName}, Ghế ${ticket.seatNumber}
- Mã vé: ${ticket.ticketId}
`
  )
  .join("")}

LƯU Ý QUAN TRỌNG:
- Vui lòng mang theo email này để xuất trình tại cổng vào
- Mỗi mã QR chỉ được sử dụng một lần
- Không chia sẻ mã QR với người khác

Cảm ơn bạn đã sử dụng dịch vụ VieTicket!
Liên hệ: support@vieticket.com
        `;

    // Prepare inline attachments
    const inlineAttachments = ticketsWithQR.map((ticket) => ({
      data: ticket.qrCodeBuffer,
      filename: `ticket-${ticket.ticketId}.png`,
      contentType: "image/png",
      contentId: ticket.cid,
    }));

    // Send email using the existing sendMail utility
    await sendMail({
      to: user.email,
      subject: `🎫 Xác nhận đơn hàng #${orderData.id} - VieTicket`,
      text: textContent,
      html: htmlContent,
      inline: inlineAttachments,
    });

    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}
