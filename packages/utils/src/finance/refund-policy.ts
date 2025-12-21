export const REFUND_REASON_VALUES = [
  "personal",
  "event_cancelled",
  "event_postponed",
  "fraud",
] as const;

export type RefundReasonValue = (typeof REFUND_REASON_VALUES)[number];

export const ALLOWED_REFUND_OVERRIDE_PERCENTAGES = [0, 60, 80, 90, 100] as const;
export type AllowedRefundOverridePercentage =
  (typeof ALLOWED_REFUND_OVERRIDE_PERCENTAGES)[number];

export type RefundPolicyCalculationInput = {
  reason: RefundReasonValue;
  orderTotal: number;
  selectedTickets: { price: number }[];
  startTime?: Date | string | number | null;
  requestedAt: Date | string | number;
};

export type RefundPolicyCalculationResult = {
  baseAmount: number;
  percentageApplied: number;
  amount: number;
};

export type CustomerRefundEligibility = {
  personalEligible?: boolean;
  postponedEligible?: boolean;
  cancelledEligible?: boolean;
  fraudAllowed?: boolean;
};

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toDateSafe(value: Date | string | number | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function calculateRefundAmount(
  input: RefundPolicyCalculationInput
): RefundPolicyCalculationResult {
  const { reason, orderTotal, selectedTickets, startTime, requestedAt } =
    input;

  const requestedAtDate = toDateSafe(requestedAt);
  if (!requestedAtDate) {
    throw new Error("requestedAt is invalid.");
  }

  const baseAmount =
    reason === "personal"
      ? selectedTickets.reduce((sum, t) => sum + Number(t.price ?? 0), 0)
      : orderTotal;

  if (baseAmount <= 0) {
    throw new Error("Refund amount must be greater than zero.");
  }

  if (reason === "personal") {
    const startTimeDate = toDateSafe(startTime);
    if (!startTimeDate) {
      throw new Error("startTime is required for personal refunds.");
    }

    const diffHours =
      (startTimeDate.getTime() - requestedAtDate.getTime()) /
      (1000 * 60 * 60);

    let percentage = 0;
    if (diffHours >= 168) {
      percentage = 80;
    } else if (diffHours >= 120) {
      percentage = 60;
    } else {
      percentage = 0;
    }

    if (percentage === 0) {
      throw new Error(
        "Personal refunds are not allowed within 120 hours of event start."
      );
    }

    const amount = round2(baseAmount * (percentage / 100));
    return {
      baseAmount: round2(baseAmount),
      percentageApplied: percentage,
      amount,
    };
  }

  let percentageApplied = 0;
  if (reason === "event_cancelled" || reason === "fraud") {
    percentageApplied = 100;
  } else if (reason === "event_postponed") {
    percentageApplied = 90;
  } else {
    throw new Error("Unsupported refund reason.");
  }

  const amount = round2(baseAmount * (percentageApplied / 100));
  return { baseAmount: round2(baseAmount), percentageApplied, amount };
}

export type RefundRequestInput = {
  reason: RefundReasonValue;
  ticketIds?: string[];
};

export function validateRefundRequestInput(
  input: RefundRequestInput
): { ok: true; value: RefundRequestInput } | { ok: false; error: string } {
  if (!input.reason) {
    return { ok: false, error: "Refund reason is required." };
  }

  if (input.reason === "personal") {
    const ticketIds = (input.ticketIds ?? []).map(String).filter(Boolean);
    const uniqueTicketIds = Array.from(new Set(ticketIds));
    if (uniqueTicketIds.length === 0) {
      return { ok: false, error: "Select at least one ticket to refund." };
    }
    return {
      ok: true,
      value: {
        ...input,
        ticketIds: uniqueTicketIds,
      },
    };
  }

  return { ok: true, value: { ...input, ticketIds: undefined } };
}

export function getAvailableRefundReasonsForCustomer(
  eligibility: CustomerRefundEligibility | undefined
): RefundReasonValue[] {
  const cancelledEligible = Boolean(eligibility?.cancelledEligible);
  const postponedEligible = Boolean(eligibility?.postponedEligible);
  const personalEligible = Boolean(eligibility?.personalEligible);
  const fraudAllowed = eligibility?.fraudAllowed ?? true;

  if (cancelledEligible) return ["event_cancelled"];
  if (postponedEligible) return ["event_postponed"];
  if (personalEligible) return ["personal", "fraud"];
  return fraudAllowed ? ["fraud"] : [];
}
