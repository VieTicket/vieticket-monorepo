import { User } from "@vieticket/db/postgres/schema";
import {
    executeOrderTransaction,
    getSeatAvailabilityStatus,
    getSeatPricing,
    getSeatStatus,
    updateOrderVNPayData,
    updateOrderStatus,
    executePaymentTransaction,
    getOrderByVNPayTxnRef,
    getUserUnconfirmedSeatHolds
} from "@vieticket/repos/checkout";
import { getEventByTicketId, getTicketDetails } from "@vieticket/repos/orders";
import { findEventById, getEventSeatingStructure } from "@vieticket/repos/events";
import { generatePaymentUrl, ReturnQueryFromVNPay, verifyVNPayResponse } from "@vieticket/utils/vnpay";
import { generateQRCodeImage } from "@vieticket/utils/ticket-validation/client";
import { generateTicketQRData } from "@vieticket/utils/ticket-validation/server";
import { sendMail } from "@vieticket/utils/mailer";

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
    user: User,
): Promise<PaymentProcessingResult> {
    try {
        // 1. Authorize user (must be customer)
        if (user.role !== "customer") {
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
        if (order.userId !== user.id) {
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
                })),
                emailSent: true
            };
        }

        // 8. Generate ticket data before executing payment transaction
        const seatHolds = await getUserUnconfirmedSeatHolds(user.id);

        if (seatHolds.length === 0) {
            throw new Error("No seat holds found for this user");
        }


        const ticketData = seatHolds.map((hold) => ({
            ticketId: crypto.randomUUID(),
            seatId: hold.seatId,
            status: "active" as const
        }));

        // 9. Execute payment confirmation transaction with pre-generated ticket data
        const transactionResult = await executePaymentTransaction(order.id, user.id, ticketData);

        // 10. Get detailed ticket information
        const ticketDetails = await getTicketDetails(order.id);

        // 11. Send order confirmation email
        let emailSent = false;
        try {
            // Get user details to obtain email
            emailSent = await sendOrderConfirmationEmail(
                user,
                transactionResult.order,
                ticketDetails
            );
        } catch (emailError) {
            // Log email error but don't fail the order
            console.error("Failed to send order confirmation email:", emailError);
        }

        // 12. Return success response
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
 * Sends order confirmation email with QR code tickets
 * @param user - User object
 * @param orderData - Order information
 * @param tickets - Ticket details with IDs and names
 * @returns Promise<boolean> indicating email delivery success
 */
async function sendOrderConfirmationEmail(
    user: User,
    orderData: any,
    tickets: any[],
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
                    user.name, // Will be replaced with actual user name
                    {
                        id: eventInfo.eventId,
                        name: eventInfo.eventName
                    },
                    {
                        id: ticket.seatId,
                        number: ticket.seatNumber
                    },
                    {
                        id: ticket.rowId,
                        name: ticket.rowName
                    },
                    {
                        id: ticket.areaId,
                        name: ticket.areaName
                    }
                );
                const qrCodeDataUrl = await generateQRCodeImage(qrData);
                return {
                    ...ticket,
                    qrCodeDataUrl,
                    qrData
                };
            })
        );

        // Format total amount for display
        const formattedTotal = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(orderData.totalAmount);

        // Format order date
        const orderDate = new Date(orderData.orderDate || orderData.updatedAt).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
          ${ticketsWithQR.map((ticket, index) => `
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
                <img src="${ticket.qrCodeDataUrl}" alt="QR Code cho vé ${index + 1}" class="qr-code" />
                <div class="validation-code">
                  Mã vé: ${ticket.ticketId}
                </div>
              </div>
            </div>
          `).join('')}

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
${ticketsWithQR.map((ticket, index) => `
Vé #${index + 1}
- Khu vực: ${ticket.areaName}
- Vị trí: Hàng ${ticket.rowName}, Ghế ${ticket.seatNumber}
- Mã vé: ${ticket.ticketId}
`).join('')}

LƯU Ý QUAN TRỌNG:
- Vui lòng mang theo email này để xuất trình tại cổng vào
- Mỗi mã QR chỉ được sử dụng một lần
- Không chia sẻ mã QR với người khác

Cảm ơn bạn đã sử dụng dịch vụ VieTicket!
Liên hệ: support@vieticket.com
        `;

        // Send email using the existing sendMail utility
        await sendMail({
            to: user.email,
            subject: `🎫 Xác nhận đơn hàng #${orderData.id} - VieTicket`,
            text: textContent,
            html: htmlContent
        });

        return true;
    } catch (error) {
        console.error("Email sending failed:", error);
        return false;
    }
}