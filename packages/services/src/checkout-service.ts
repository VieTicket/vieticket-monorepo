import { User } from "@vieticket/db/postgres/schema";
import {
  executeOrderTransaction,
  getSeatAvailabilityStatus,
  getSeatPricing,
  getSeatStatus,
  updateOrderVNPayData,
  updateOrderStatus,
  executePaymentTransaction,
  getTicketDetails,
  getOrderByVNPayTxnRef
} from "@vieticket/repos/checkout";
import { findEventById, getEventSeatingStructure } from "@vieticket/repos/events";
import { generatePaymentUrl, ReturnQueryFromVNPay, verifyVNPayResponse } from "@vieticket/utils/vnpay";

export async function getTicketData(
  eventId: string,
  user: Pick<User, "role">
) {
  if (user.role !== "customer") {
    throw new Error("Unauthorized: Only customers can purchase tickets.");
  }

  try {
    // 1. Fetch and validate event availability
    const eventData = await findEventById(eventId);

    if (!eventData) {
      throw new Error("Event not found.");
    }

    if (eventData.approvalStatus !== "approved") {
      throw new Error("Event is not approved for ticket sales.");
    }

    const now = new Date();
    if (
      !eventData.ticketSaleStart ||
      !eventData.ticketSaleEnd ||
      now < eventData.ticketSaleStart ||
      now > eventData.ticketSaleEnd
    ) {
      throw new Error("Event is not currently on sale.");
    }

    // 2. Fetch seating structure and seat status concurrently
    const [seatingStructure, seatStatus] = await Promise.all([
      getEventSeatingStructure(eventId),
      getSeatStatus(eventId),
    ]);

    // 3. Combine and return the data
    return {
      eventData,
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
 * @param eventId - The ID of the event.
 * @param selectedSeatIds - An array of seat IDs selected by the user.
 * @param user - The authenticated user object.
 * @param clientIp - The client's IP address.
 * @returns An object containing the payment URL, order details, and hold expiration.
 */
export async function createPendingOrder(
  eventId: string,
  selectedSeatIds: string[],
  user: Pick<User, "id" | "role">,
  clientIp: string
) {
  if (user.role !== "customer") {
    throw new Error("Unauthorized: Only customers can purchase tickets.");
  }
  if (!selectedSeatIds || selectedSeatIds.length === 0) {
    throw new Error("At least one seat must be selected.");
  }

  // 1. Check seat availability
  const { unavailableSeatIds } = await getSeatAvailabilityStatus(selectedSeatIds);
  if (unavailableSeatIds.length > 0) {
    const error: any = new Error("Selected seats are no longer available.");
    error.code = "SEATS_UNAVAILABLE";
    error.unavailableSeats = unavailableSeatIds;
    throw error;
  }

  // 2. Get pricing and calculate total
  const seatDetails = await getSeatPricing(selectedSeatIds);
  if (seatDetails.length !== selectedSeatIds.length) {
    throw new Error("Could not retrieve pricing for all selected seats.");
  }
  const totalAmount = seatDetails.reduce((sum, seat) => sum + seat.price, 0);

  // 3. Create order and seat holds in a transaction
  const holdDurationMinutes = 15;
  const holdExpires = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

  const newOrder = await executeOrderTransaction(
    {
      userId: user.id,
      totalAmount: totalAmount,
      status: "pending",
    },
    selectedSeatIds.map((seatId) => ({
      eventId,
      userId: user.id,
      seatId,
      holdExpires,
      isConfirmed: false,
    }))
  );

  // 4. Generate VNPay payment URL
  const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/checkout/vnpay-return`;
  const { vnp_TxnRef, paymentURL } = generatePaymentUrl({
    amount: totalAmount,
    ipAddr: clientIp,
    orderId: newOrder.id,
    orderInfo: `Thanh toan don hang ${newOrder.id}`,
    returnUrl,
  });

  // 5. Store VNPay transaction reference (optional, but good practice)
  await updateOrderVNPayData(newOrder.id, { vnp_TxnRef });

  // 6. Return response
  return {
    vnpayURL: paymentURL,
    orderId: newOrder.id,
    totalAmount,
    holdExpires,
    selectedSeats: seatDetails,
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
    qrCode: string;
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

/**
 * Processes VNPay payment result and confirms order
 * @param vnpayResponseData - VNPay response parameters
 * @param userId - The authenticated user ID
 * @returns Payment processing result
 */
export async function processPaymentResult(
  vnpayResponseData: ReturnQueryFromVNPay,
  userId: string,
  userRole: string
): Promise<PaymentProcessingResult> {
  try {
    // 1. Authorize user (must be customer)
    if (userRole !== "customer") {
      throw new Error("Unauthorized: Only customers can process payments");
    }

    // 2. Validate VNPay response signature and parameters
    const vnpayReturn = verifyVNPayResponse(vnpayResponseData);
    if (!vnpayReturn.isVerified) {
      throw new Error("Invalid VNPay response signature");
    }

    // 3. Retrieve order data using VNPay transaction reference stored in payment metadata
    const order = await getOrderByVNPayTxnRef(vnpayReturn.vnp_TxnRef);
    if (!order) {
      return {
        success: false,
        orderId: "",
        orderStatus: "not_found",
        error: {
          code: "ORDER_NOT_FOUND",
          message: "Order not found for this transaction reference"
        }
      };
    }

    // 4. Verify order belongs to user
    if (order.userId !== userId) {
      return {
        success: false,
        orderId: order.id,
        orderStatus: "unauthorized",
        error: {
          code: "ORDER_USER_MISMATCH",
          message: "Order does not belong to authenticated user"
        }
      };
    }

    // 5. Check if payment was successful (use verified values from vnpayReturn)
    if (!vnpayReturn.isSuccess) {
      // Payment failed - update order status
      await updateOrderStatus(order.id, "failed");

      return {
        success: false,
        orderId: order.id,
        orderStatus: "failed",
        error: {
          code: "PAYMENT_FAILED",
          message: `Payment failed with code: ${vnpayReturn.vnp_ResponseCode}`
        }
      };
    }

    // 6. Verify payment amount matches order (use verified amount from vnpayReturn)
    if (Math.abs(vnpayReturn.vnp_Amount - order.totalAmount) > 0.01) {
      await updateOrderStatus(order.id, "failed");

      return {
        success: false,
        orderId: order.id,
        orderStatus: "failed",
        error: {
          code: "AMOUNT_MISMATCH",
          message: "Payment amount does not match order total"
        }
      };
    }

    // 7. Check if order is already processed
    if (order.status === "paid") {
      // Order already confirmed, return existing ticket details
      const tickets = await getTicketDetails(order.id);

      return {
        success: true,
        orderId: order.id,
        ticketCount: tickets.length,
        totalAmount: order.totalAmount,
        orderStatus: "paid",
        tickets: tickets.map(ticket => ({
          ticketId: ticket.ticketId,
          seatId: ticket.seatId,
          seatNumber: ticket.seatNumber,
          rowName: ticket.rowName,
          areaName: ticket.areaName,
          qrCode: ticket.qrCode
        })),
        emailSent: true // Assume email was sent previously
      };
    }

    // 8. Execute payment confirmation transaction
    const transactionResult = await executePaymentTransaction(order.id, userId);

    // 9. Get detailed ticket information
    const ticketDetails = await getTicketDetails(order.id);

    // 10. Send order confirmation email
    let emailSent = false;
    try {
      emailSent = await sendOrderConfirmationEmail(
        userId,
        transactionResult.order,
        ticketDetails
      );
    } catch (emailError) {
      // Log email error but don't fail the order
      console.error("Failed to send order confirmation email:", emailError);
    }

    // 11. Return success response
    return {
      success: true,
      orderId: order.id,
      ticketCount: transactionResult.seatCount,
      totalAmount: transactionResult.order.totalAmount,
      orderStatus: "paid",
      tickets: ticketDetails.map(ticket => ({
        ticketId: ticket.ticketId,
        seatId: ticket.seatId,
        seatNumber: ticket.seatNumber,
        rowName: ticket.rowName,
        areaName: ticket.areaName,
        qrCode: ticket.qrCode
      })),
      emailSent
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      orderId: "",
      orderStatus: "error",
      error: {
        code: "PAYMENT_PROCESSING_ERROR",
        message: errorMessage
      }
    };
  }
}

/**
 * Sends order confirmation email (placeholder implementation)
 * @param userId - User ID
 * @param orderData - Order information
 * @param tickets - Ticket details
 * @returns Promise<boolean> indicating email delivery success
 */
async function sendOrderConfirmationEmail(
  userId: string,
  orderData: any,
  tickets: any[]
): Promise<boolean> {
  try {
    // TODO: Implement actual email sending logic
    // This is a placeholder that will be replaced with actual email service
    console.log(`Sending order confirmation email for order ${orderData.id} to user ${userId}`);
    console.log(`Order details:`, {
      orderId: orderData.id,
      totalAmount: orderData.totalAmount,
      ticketCount: tickets.length
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return true to indicate successful email delivery
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

