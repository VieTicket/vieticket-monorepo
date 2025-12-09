"use client";

import { PayoutRequest, PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cancelPayoutRequestAction } from "@/lib/actions/organizer/payout-request-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "../ui/badge";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";

interface PayoutRequestDetailsProps {
  payoutRequest: PayoutRequestWithEvent;
}

export function PayoutRequestDetails({ payoutRequest }: PayoutRequestDetailsProps) {
  const router = useRouter();
  const t = useTranslations("organizer-dashboard.RequestPayout");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelRequest = async () => {
    if (!confirm(t("confirm.cancelRequest", { defaultValue: "Are you sure you want to cancel this payout request?" }))) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await cancelPayoutRequestAction(payoutRequest.id);
      if (response.success) {
        toast.success(t("toasts.cancelled", { defaultValue: "Payout request cancelled successfully" }), {
          description: t("toasts.statusUpdated")
        });
        // Refresh the page to show updated status
        router.refresh();
      } else {
        toast.error(t("toasts.cancelFailed", { defaultValue: "Failed to cancel payout request" }), {
          description: response.message || t("toasts.unexpectedError")
        });
      }
    } catch (error) {
      toast.error(t("toasts.unexpectedError"));
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div>
      <Button variant={'outline'} className="mb-4">
        <Link
          href={"/organizer/payouts"}
          className="flex items-center gap-1"
        >
          <ArrowLeft /> <span>{t("backToList", { defaultValue: "Back to list" })}</span>
        </Link>
      </Button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t("table.event")}</h2>
            <p>{payoutRequest.event?.name || t("table.notSet", { defaultValue: "Not set" })}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("table.requestedAmount")}</h2>
            <p>{formatCurrencyVND(payoutRequest.requestedAmount)}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("table.agreedAmount")}</h2>
            <p>
              {payoutRequest.agreedAmount
                ? formatCurrencyVND(payoutRequest.agreedAmount)
                : t("table.notSet", { defaultValue: "Not set" })}
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("table.status")}</h2>
            <Badge
              variant={
                ({
                  pending: "secondary",
                  approved: "default",
                  rejected: "destructive",
                  in_discussion: "outline",
                  cancelled: "destructive",
                  completed: "default",
                } as Record<string, "default" | "secondary" | "destructive" | "outline">)[payoutRequest.status] ||
                "default"
              }
            >
              {t(`statusOptions.${payoutRequest.status}`)}
            </Badge>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("table.requestDate")}</h2>
            <p>{format(payoutRequest.requestDate, 'PPP', { locale: vi })}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("table.completionDate")}</h2>
            <p>{payoutRequest.completionDate ? format(payoutRequest.completionDate, 'PPP', { locale: vi }) : t("table.notSet", { defaultValue: "Not set" })}</p>
          </div>
        </div>

        {payoutRequest.proofDocumentUrl && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold">{t("table.viewEvidence")}</h2>
            <img
              src={payoutRequest.proofDocumentUrl}
              alt={t("table.viewEvidence")}
              className="mt-2 max-w-xs"
            />
          </div>
        )}

        {payoutRequest.status === "pending" && (
          <div className="mt-6">
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={isCancelling}
            >
              {isCancelling ? t("buttons.saving", { defaultValue: "Cancelling..." }) : t("buttons.cancelRequest", { defaultValue: "Cancel Request" })}
            </Button>
          </div>
        )}

        {/* TODO: Integrate chat for negotiation history */}
      </div>
    </div>
  );
}
