import { dateFormat, getDateInGMT7, type QueryDrResponse } from "vnpay";
import { vnpay } from ".";

export type VNPayQueryDrRequest = {
  txnRef: string;
  transactionDate: number; // yyyyMMddHHmmss of original payment request (GMT+7)
  orderInfo: string;
  transactionNo?: number;
  requestId?: string;
  ipAddr?: string;
  createDate?: number; // yyyyMMddHHmmss of this query request (GMT+7)
};

export type VNPayQueryDrResult = {
  /** Whether the payment is successful (based on vnp_TransactionStatus). */
  success: boolean;
  /** Whether the query itself succeeded (based on vnp_ResponseCode). */
  queryOk: boolean;
  /** Whether the VNPay response signature is verified. */
  verified: boolean;
  responseCode?: string;
  transactionStatus?: string;
  payDate?: string | number;
  transactionNo?: string | number;
  amount?: string | number;
  message?: string;
  raw?: QueryDrResponse;
};

/**
 * Query a PAY transaction result from VNPay (QueryDR).
 *
 * Note: Official docs mark vnp_TransactionNo as optional for QueryDR.
 * The upstream `vnpay` package type currently requires it, so we cast.
 */
export async function queryVNPayPaymentResult(
  params: VNPayQueryDrRequest
): Promise<VNPayQueryDrResult> {
  const nowGmt7 = getDateInGMT7(new Date());
  const createDate = params.createDate ?? dateFormat(nowGmt7);

  const request = {
    vnp_RequestId: params.requestId ?? `${Date.now()}`,
    vnp_IpAddr: params.ipAddr ?? "127.0.0.1",
    vnp_TxnRef: params.txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_TransactionDate: params.transactionDate,
    vnp_CreateDate: createDate,
    ...(typeof params.transactionNo === "number"
      ? { vnp_TransactionNo: params.transactionNo }
      : {}),
  } as any;

  const response = (await vnpay.queryDr(request)) as QueryDrResponse;

  const responseCode = response?.vnp_ResponseCode?.toString();
  const transactionStatus = response?.vnp_TransactionStatus?.toString();

  return {
    verified: Boolean(response?.isVerified),
    queryOk: Boolean(response?.isSuccess),
    success: Boolean(response?.isVerified) && transactionStatus === "00",
    responseCode,
    transactionStatus,
    payDate: response?.vnp_PayDate,
    transactionNo: response?.vnp_TransactionNo,
    amount: response?.vnp_Amount,
    message: response?.message ?? response?.vnp_Message,
    raw: response,
  };
}

