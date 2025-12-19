import { dateFormat, type RefundResponse } from "vnpay";
import { RefundTransactionType, VnpLocale } from "vnpay/enums";
import { vnpay } from ".";

export type VNPayRefundRequest = {
  txnRef: string;
  amount: number;
  transactionDate: number; // yyyyMMddHHmmss of original payment (GMT+7)
  transactionType?: RefundTransactionType; // 02 full, 03 partial
  transactionNo?: number;
  createBy?: string;
  ipAddr?: string;
  orderInfo?: string;
  requestId?: string;
  locale?: VnpLocale;
};

export type VNPayRefundResponse = {
  success: boolean;
  code?: string;
  message?: string;
  reference?: string;
  raw?: RefundResponse;
};

/**
 * Execute a refund request against VNPay.
 * Wraps vnpay.refund and normalizes the response.
 */
export async function requestVNPayRefund(
  params: VNPayRefundRequest
): Promise<VNPayRefundResponse> {
  const now = new Date();
  const transactionNo = params.transactionNo;
  const locale = params.locale ?? VnpLocale.VN;
  const transactionType =
    params.transactionType ?? RefundTransactionType.FULL_REFUND;
  const response = await vnpay.refund({
    vnp_RequestId: params.requestId ?? `${Date.now()}`,
    vnp_TransactionType: transactionType,
    vnp_TxnRef: params.txnRef,
    vnp_Amount: params.amount,
    vnp_TransactionNo: transactionNo,
    vnp_TransactionDate: params.transactionDate,
    vnp_CreateBy: params.createBy ?? "system",
    vnp_CreateDate: dateFormat(now),
    vnp_IpAddr: params.ipAddr ?? "127.0.0.1",
    vnp_OrderInfo: params.orderInfo ?? "Refund request",
    vnp_Locale: locale,
  });

  return {
    success: Boolean(response?.isSuccess),
    code: response?.vnp_ResponseCode?.toString(),
    message: response?.vnp_Message,
    reference:
      response?.vnp_TransactionNo?.toString() ??
      response?.vnp_ResponseId?.toString(),
    raw: response,
  };
}
