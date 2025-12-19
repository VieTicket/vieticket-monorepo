import type { VNPayOrderData } from "../vnpay";

export type PaymentMetadata = {
  provider: "vnpay",
  data: VNPayOrderData
} | {
  provider: "unknown"
};