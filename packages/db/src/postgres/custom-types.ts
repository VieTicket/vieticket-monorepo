import { type VNPayOrderData } from "@vieticket/utils/vnpay";
import { customType } from "drizzle-orm/pg-core";

type NumericConfig = {
  precision?: number;
  scale?: number;
};

export const currency = customType<{
  data: number;
  driverData: string;
  config: NumericConfig;
}>({
  dataType: (config) => {
    if (config?.precision && config?.scale) {
      return `numeric(${config.precision}, ${config.scale})`;
    }
    return "numeric";
  },
  fromDriver: (value: string) => Number.parseFloat(value),
  toDriver: (value: number) => value.toString(),
});

export const tsVector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * OrganizerMetadata represents metadata related to an event organizer.
 * It contains proof documents that verify the organizer's identity or credentials.
 *
 * @property organizerProofDocument - An array of proof documents provided by the organizer.
 *   Each entry should have the following structure:
 *     - documentUrl: string - The URL where the document can be accessed.
 *     - documentType: string - The type of document (e.g., "business_license", "id_card").
 *
 * Use this type when you need to store or validate organizer-related documents.
 */
export type OrganizerMetadata = {
  organizerProofDocument: Array<{
    documentUrl: string;
    documentType: string;
  }>;
};

export type PaymentMetadata = {
  provider: "vnpay",
  data: VNPayOrderData
} | {
  provider: "unknown"
}