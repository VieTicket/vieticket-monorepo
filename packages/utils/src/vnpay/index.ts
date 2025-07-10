import { VNPay } from 'vnpay/vnpay';
export * from './helpers';
import type { BuildPaymentUrl } from 'vnpay/types-only';
export type { ReturnQueryFromVNPay } from 'vnpay/types-only';

/**
 * Modify VNPayOrderData to make vnp_TxnRef required and others optional.
 */
export type VNPayOrderData = Partial<Omit<BuildPaymentUrl, 'vnp_TxnRef'>> & {
  vnp_TxnRef: string;
};

// Define the configuration interface
export interface VNPayConfiguration {
  tmnCode: string;
  secureSecret: string;
  vnpayHost?: string;
  enableSandbox?: boolean;
}

// Use globalThis to ensure a single instance is used across hot reloads in development
const globalForVNPay = globalThis as unknown as {
  vnpay: VNPay | undefined;
};

/**
 * Internal VNPay instance for use within the vnpay package only.
 * It automatically infers the configuration from environment variables.
 */
export const vnpay: VNPay = globalForVNPay.vnpay ?? createVNPayInstance();

/**
 * Configuration function to create a new VNPay instance with custom settings.
 * This is useful for specific scenarios like testing or multiple payment gateways.
 *
 * @param {VNPayConfiguration} config - The VNPay configuration object.
 * @returns {VNPay} A new VNPay instance.
 */
export function configureVNPay(config: VNPayConfiguration): VNPay {
  return createVNPayInstance(config);
}

/**
 * The core function that creates the VNPay instance.
 * It can be called with specific config or will fall back to environment variables.
 */
function createVNPayInstance(config?: VNPayConfiguration): VNPay {
  const finalConfig = config ?? getConfigFromEnv();

  if (!finalConfig.tmnCode || !finalConfig.secureSecret) {
    throw new Error(
      "VNPay configuration is incomplete. Please provide VNPAY_TMNCODE and VNPAY_SECURE_SECRET in your .env file or use configureVNPay() function."
    );
  }

  const instance = new VNPay({
    tmnCode: finalConfig.tmnCode,
    secureSecret: finalConfig.secureSecret,
    vnpayHost: finalConfig.vnpayHost || (finalConfig.enableSandbox !== false
      ? 'https://sandbox.vnpayment.vn'
      : 'https://vnpayment.vn'
    )
  });

  // Cache the instance in the global object for subsequent calls if it's the default one
  if (!config) {
    globalForVNPay.vnpay = instance;
  }

  return instance;
}

/**
 * Reads VNPay configuration from environment variables.
 */
function getConfigFromEnv(): VNPayConfiguration {
  return {
    tmnCode: process.env.VNPAY_TMNCODE || '',
    secureSecret: process.env.VNPAY_SECURE_SECRET || '',
    vnpayHost: process.env.VNPAY_HOST,
    enableSandbox: process.env.NODE_ENV !== 'production' || process.env.VNPAY_SANDBOX === 'true'
  };
}
