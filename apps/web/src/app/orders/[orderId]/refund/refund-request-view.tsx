"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitRefundForm } from "@/lib/actions/refund-actions";
import { RefundReason } from "@vieticket/db/pg/enums";
import {
  getAvailableRefundReasonsForCustomer,
  validateRefundRequestInput,
} from "@vieticket/utils/finance/refund-policy";
import { useTranslations } from "next-intl";

type RefundableTicket = {
  ticketId: string;
  status: string;
  seatNumber: string;
  rowName: string;
  areaName: string;
};

type RefundEligibility = {
  personalEligible?: boolean;
  postponedEligible?: boolean;
  cancelledEligible?: boolean;
  fraudAllowed?: boolean;
};

type OrderForRefund = {
  id: string;
  status: string;
  totalAmount: number;
  tickets: RefundableTicket[];
  event?: { eventName?: string | null };
  refundEligibility?: RefundEligibility;
};

type RefundActionState = {
  success: boolean | null;
  refundId?: string;
  error?: string;
};

export function RefundRequestView({ order }: { order: OrderForRefund }) {
  const t = useTranslations("refunds.request");
  const tReason = useTranslations("refunds.reasonOptions");
  const router = useRouter();

  const refundableTickets = useMemo(
    () => order.tickets.filter((t) => t.status !== "refunded"),
    [order.tickets]
  );

  const eligibleOrderStatus = ["paid", "partial_refunded"].includes(order.status);
  const availableReasons = useMemo(
    () =>
      getAvailableRefundReasonsForCustomer(order.refundEligibility) as RefundReason[],
    [order.refundEligibility]
  );

  const defaultReason: RefundReason = (availableReasons[0] ??
    "fraud") as RefundReason;

  const [selectedReason, setSelectedReason] =
    useState<RefundReason>(defaultReason);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);

  const [refundState, refundAction, refundPending] = useActionState(
    async (_prev: RefundActionState, formData: FormData): Promise<RefundActionState> => {
      const res = await submitRefundForm(formData);
      return res.success
        ? { success: true, refundId: String((res.data as any)?.id ?? "") || undefined }
        : {
            success: false,
            error: res.error || t("errors.unableToSubmit"),
          };
    },
    { success: null }
  );

  useEffect(() => {
    if (refundState.success && refundState.refundId) {
      router.replace(`/orders/refunds/${refundState.refundId}`);
    }
  }, [refundState.refundId, refundState.success, router]);

  const reasonsForUI = useMemo(
    () =>
      availableReasons.map((value) => ({
        value,
        label: tReason(value),
      })),
    [availableReasons, tReason]
  );

  function toggleTicket(ticketId: string) {
    setSelectedTicketIds((prev) => {
      if (prev.includes(ticketId)) return prev.filter((id) => id !== ticketId);
      return [...prev, ticketId];
    });
  }

  function onReasonChange(next: RefundReason) {
    setSelectedReason(next);
    setClientError(null);
    if (next !== "personal") {
      setSelectedTicketIds([]);
    }
  }

  const submissionValidation = useMemo(() => {
    if (!eligibleOrderStatus) {
      return { ok: false as const, error: t("errors.orderNotEligible") };
    }
    if (availableReasons.length === 0) {
      return {
        ok: false as const,
        error: t("errors.noOptions"),
      };
    }
    if (!availableReasons.includes(selectedReason)) {
      return { ok: false as const, error: t("errors.reasonNotAvailable") };
    }
    if (selectedReason === "personal" && refundableTickets.length === 0) {
      return { ok: false as const, error: t("errors.noRefundableTickets") };
    }

    return validateRefundRequestInput({
      reason: selectedReason,
      ticketIds: selectedReason === "personal" ? selectedTicketIds : undefined,
    });
  }, [
    eligibleOrderStatus,
    availableReasons,
    selectedReason,
    refundableTickets.length,
    selectedTicketIds,
    t,
  ]);

  const canSubmit = submissionValidation.ok && !refundPending;
  const errorToShow =
    clientError ?? (refundState.success === false ? refundState.error : null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("orderLabel")} <span className="font-mono text-xs">{order.id}</span>
              {order.event?.eventName ? ` • ${order.event.eventName}` : null}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/orders/${order.id}`}>{t("backToOrder")}</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("details.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("details.subtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!eligibleOrderStatus && (
              <div className="text-sm text-red-600">
                {t("errors.orderNotEligible")}
              </div>
            )}

            {eligibleOrderStatus && availableReasons.length === 0 && (
              <div className="text-sm text-muted-foreground">
                {t("errors.noOptions")}
              </div>
            )}

            {eligibleOrderStatus && availableReasons.length > 0 && (
              <form
                action={refundAction}
                className="space-y-4"
                onSubmit={(event) => {
                  if (!submissionValidation.ok) {
                    event.preventDefault();
                    setClientError(submissionValidation.error);
                  } else {
                    setClientError(null);
                  }
                }}
              >
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="reason" value={selectedReason} />

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("form.reasonLabel")}</label>
                  <div className="grid gap-2">
                    {reasonsForUI.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => onReasonChange(r.value)}
                        className={cn(
                          "flex items-center justify-between rounded border px-3 py-2 text-sm text-left",
                          selectedReason === r.value
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 dark:border-gray-700"
                        )}
                      >
                        <span>{r.label}</span>
                        <span
                          className={cn(
                            "text-xs",
                            selectedReason === r.value
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {selectedReason === r.value ? t("form.selected") : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedReason === "personal" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("form.selectTicketsLabel")}</label>
                    <div className="grid gap-2">
                      {refundableTickets.map((ticket) => (
                        <label
                          key={ticket.ticketId}
                          className="flex items-center gap-2 rounded border px-3 py-2 text-sm border-gray-200 dark:border-gray-700"
                        >
                          <input
                            type="checkbox"
                            name="ticketIds"
                            value={ticket.ticketId}
                            checked={selectedTicketIds.includes(ticket.ticketId)}
                            onChange={() => toggleTicket(ticket.ticketId)}
                          />
                          <span>
                            {t("form.ticketLabel", { id: ticket.ticketId.slice(-6) })} —{" "}
                            {ticket.areaName} / {t("form.rowLabel", { row: ticket.rowName })} /{" "}
                            {t("form.seatLabel", { seat: ticket.seatNumber })}
                          </span>
                        </label>
                      ))}
                      {refundableTickets.length === 0 && (
                        <p className="text-xs text-red-500">
                          {t("errors.noRefundableTickets")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={!canSubmit}>
                    {refundPending ? t("form.submitting") : t("form.submit")}
                  </Button>
                  {refundState.success === true && (
                    <span className="text-green-600 text-sm">{t("form.submitted")}</span>
                  )}
                  {errorToShow && (
                    <span className="text-red-600 text-sm">{errorToShow}</span>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
