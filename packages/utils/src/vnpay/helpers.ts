import { ProductCode, ReturnQueryFromVNPay } from "vnpay/types-only";
import { vnpay } from ".";

type VNPayPaymentParams = {
    amount: number;
    ipAddr: string;
    orderId: string;
    orderInfo: string;
    returnUrl: string;
};

/**
 * Generates a VNPay payment URL with the required parameters.
 * 
 * @param params - The payment parameters object
 * @param params.amount - The payment amount
 * @param params.ipAddr - The client's IP address
 * @param params.orderId - The order identifier to be converted to transaction reference
 * @param params.orderInfo - Description or information about the order
 * @param params.returnUrl - The URL to redirect to after payment completion
 * 
 * @returns An object containing the transaction reference and the generated payment URL
 * @returns returns.vnp_TxnRef - The converted transaction reference from the order ID
 * @returns returns.paymentURL - The complete VNPay payment URL for redirection
 */
export function generatePaymentUrl({
    amount,
    ipAddr,
    orderId,
    orderInfo,
    returnUrl
}: VNPayPaymentParams) {

    const vnp_TxnRef = convertOrderIdToTxnRef(orderId);

    return {
        vnp_TxnRef,
        paymentURL: vnpay.buildPaymentUrl({
            vnp_Amount: amount,
            vnp_IpAddr: ipAddr,
            vnp_TxnRef,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: ProductCode.Entertainment_Training,
            vnp_ReturnUrl: returnUrl,
        })
    }
}

export function verifyVNPayResponse(
    queries: ReturnQueryFromVNPay
): ReturnType<typeof vnpay.verifyReturnUrl> & { vnp_Amount: number } {
    const vnpayReturn = vnpay.verifyReturnUrl(queries)
    const { vnp_Amount, ...rest } = vnpayReturn

    return {
        ...rest,
        // unary + is the shortest way to cast string|number → number
        vnp_Amount: +vnp_Amount,
    }
}

function convertOrderIdToTxnRef(orderId: string): string {
    return orderId.replace(/-/g, '').substring(0, 32);
}
