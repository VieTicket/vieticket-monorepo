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

    // 3. Get user session
    const session = await getAuthSession(request.headers);
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "User not authenticated"
          }
        },
        { status: 401 }
      );
    }

    // 4. Process payment result through service layer
    const result = await processPaymentResult(
      vnpayResponseData,
      session.user as User
    );

    // 5. Return appropriate response based on result
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      // Determine HTTP status code based on error type
      let statusCode = 400;
      if (result.error?.code === "ORDER_NOT_FOUND") {
        statusCode = 404;
      } else if (result.error?.code === "ORDER_USER_MISMATCH") {
        statusCode = 403;
      } else if (result.error?.code === "PAYMENT_FAILED") {
        statusCode = 402; // Payment Required
      }

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
