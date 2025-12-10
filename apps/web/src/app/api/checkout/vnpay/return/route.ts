import { NextRequest, NextResponse } from "next/server";
import { processPaymentResult } from "@vieticket/services/checkout";
import { ReturnQueryFromVNPay } from "@vieticket/utils/vnpay";
import { getAuthSession } from "@/lib/auth/auth";
import { User } from "@vieticket/db/pg/schemas/users";

/**
 * Handles VNPay payment return URL
 * Processes payment result and confirms order
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Extract VNPay response parameters from URL
        const searchParams = request.nextUrl.searchParams;
        const vnpayResponseData: ReturnQueryFromVNPay = {
            vnp_Amount: searchParams.get("vnp_Amount") || "",
            vnp_BankCode: searchParams.get("vnp_BankCode") || "",
            vnp_BankTranNo: searchParams.get("vnp_BankTranNo") || "",
            vnp_CardType: searchParams.get("vnp_CardType") || "",
            vnp_OrderInfo: searchParams.get("vnp_OrderInfo") || "",
            vnp_PayDate: searchParams.get("vnp_PayDate") || "",
            vnp_ResponseCode: searchParams.get("vnp_ResponseCode") || "",
            vnp_TmnCode: searchParams.get("vnp_TmnCode") || "",
            vnp_TransactionNo: searchParams.get("vnp_TransactionNo") || "",
            vnp_TransactionStatus: searchParams.get("vnp_TransactionStatus") || "",
            vnp_TxnRef: searchParams.get("vnp_TxnRef") || "",
            vnp_SecureHash: searchParams.get("vnp_SecureHash") || "",
        };

        // 2. Validate that required VNPay parameters are present
        if (!vnpayResponseData.vnp_TxnRef || !vnpayResponseData.vnp_SecureHash) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "INVALID_VNPAY_RESPONSE",
                        message: "Missing required VNPay parameters"
                    }
                },
                { status: 400 }
            );
        }

        // 3. Get user session if present (VNPay return should work without it)
        const session = await getAuthSession(request.headers);

        // 4. Process payment result through service layer
        const result = await processPaymentResult(
            vnpayResponseData,
            session?.user as User | undefined
        );

        // 5. Return appropriate response based on result
        if (result.success) {
            // Redirect to order detail page regardless of order status
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${result.orderId}`,
                { status: 302 }
            );
        } else {
            // Redirect to order detail page even if payment failed, not found, or user mismatch
            if (
                result.error?.code === "ORDER_NOT_FOUND" ||
                result.error?.code === "ORDER_USER_MISMATCH" ||
                result.error?.code === "PAYMENT_FAILED"
            ) {
                return NextResponse.redirect(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${result.orderId || result.orderId || vnpayResponseData.vnp_TxnRef}`,
                    { status: 302 }
                );
            }

            // For other errors, return JSON response
            let statusCode = 400;
            return NextResponse.json(result, { status: statusCode });
        }

    } catch (error) {
        console.error("VNPay return processing error:", error);

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "An unexpected error occurred while processing payment"
                }
            },
            { status: 500 }
        );
    }
}
