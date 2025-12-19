import { type RefundResponse } from "vnpay";
import {
  requestVNPayRefund,
  type VNPayRefundRequest,
} from "../vnpay/refund";
import { RefundTransactionType, VnpLocale } from "vnpay/enums";
import { PaymentMetadata } from ".";

export type RefundAttemptPayload = {
  refundId: string;
  orderId: string;
  amount: number;
  reason: string;
  currency?: string;
  metadata?: PaymentMetadata;
};

export type RefundAttemptResult =
  | { success: true; reference: string; provider?: string; raw?: RefundResponse }
  | {
      success: false;
      code?: string;
      message?: string;
      provider?: string;
      reference?: string;
      raw?: RefundResponse;
    };

type VNPayPaymentMetadata = Extract<PaymentMetadata, { provider: "vnpay" }>;

function isVNPayPaymentMetadata(
  meta: PaymentMetadata | undefined
): meta is VNPayPaymentMetadata {
  return Boolean(meta && meta.provider === "vnpay");
}

/**
 * PSP refund executor. Currently supports VNPay (requires stored VNPay return metadata).
 */
export async function executeRefundWithPSP(
  payload: RefundAttemptPayload,
  options?: { simulateFailure?: boolean }
): Promise<RefundAttemptResult> {
  if (options?.simulateFailure) {
    return {
      success: false,
      code: "SIMULATED_FAILURE",
      message: "Simulated PSP refund failure for testing.",
      provider: payload.metadata?.provider,
    };
  }

  // VNPay path
  if (isVNPayPaymentMetadata(payload.metadata)) {
    const data = payload.metadata.data as any;

    const txnRef = String(data?.vnp_TxnRef ?? "");
    if (!txnRef) {
      return {
        success: false,
        code: "VNPAY_MISSING_TXN_REF",
        message: "VNPay payment metadata is missing vnp_TxnRef.",
        provider: "vnpay",
      };
    }

    const transactionDateRaw = data?.vnp_PayDate;
    const transactionDate = Number(transactionDateRaw);
    if (!transactionDateRaw || !Number.isFinite(transactionDate)) {
      return {
        success: false,
        code: "VNPAY_MISSING_PAY_DATE",
        message:
          "VNPay payment metadata is missing vnp_PayDate required for refunds.",
        provider: "vnpay",
        reference: txnRef,
      };
    }

    const transactionNoRaw = data?.vnp_TransactionNo;
    const transactionNo =
      transactionNoRaw !== undefined ? Number(transactionNoRaw) : undefined;

    const transactionType =
      payload.reason === "event_cancelled" || payload.reason === "fraud"
        ? RefundTransactionType.FULL_REFUND
        : RefundTransactionType.PARTIAL_REFUND;

    const locale = (data?.vnp_Locale as VnpLocale | undefined) ?? VnpLocale.VN;

    const request: VNPayRefundRequest = {
      txnRef,
      amount: payload.amount,
      transactionDate,
      transactionType,
      transactionNo,
      createBy: "system",
      ipAddr: data?.vnp_IpAddr ?? "127.0.0.1",
      orderInfo: data?.vnp_OrderInfo ?? `Refund ${payload.refundId}`,
      requestId: `${payload.refundId}`,
      locale,
    };

    try {
      const res = await requestVNPayRefund(request);
      if (res.success) {
        return {
          success: true,
          reference: res.reference ?? `vnpay-${payload.refundId}`,
          provider: "vnpay",
          raw: res.raw,
        };
      }
      return {
        success: false,
        code: res.code,
        message: res.message,
        provider: "vnpay",
        reference: txnRef,
        raw: res.raw,
      };
    } catch (error) {
      return {
        success: false,
        code: "VNPAY_ERROR",
        message: error instanceof Error ? error.message : "Unknown VNPay error",
        provider: "vnpay",
        reference: txnRef,
      };
    }
  }

  return {
    success: false,
    code: "PSP_METADATA_MISSING",
    message:
      "Payment metadata is missing or unsupported. Unable to execute PSP refund.",
    provider: payload.metadata?.provider ?? "unknown",
  };
}
