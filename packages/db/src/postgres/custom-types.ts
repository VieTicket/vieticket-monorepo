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

/** Minimal shape for a submitted proof document. */
type ProofDocument = {
  documentType: string;
  documentUrl: string[];
};

/** Organizer-level metadata such as verification documents. */
export type OrganizerMetadata = {
  organizerProofDocuments: ProofDocument[];
};

/** Event-level metadata such as proof documents. */
export type EventMetadata = {
  eventProofDocuments: ProofDocument[];
};

export type PaymentMetadata = {
  provider: "vnpay",
  data: VNPayOrderData
} | {
  provider: "unknown"
}