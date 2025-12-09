"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileUploader } from "@/components/ui/file-uploader";
import Link from "next/link";
import { updatePayoutStatusAction, uploadPayoutProofAction } from "@/lib/actions/organizer/payout-request-actions";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";

const STATUS_OPTIONS: PayoutStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "in_discussion",
  "completed",
];

type Props = {
  initialRequest: PayoutRequestWithEvent;
  revenue: number;
};

export function AdminPayoutRequestDetail({ initialRequest, revenue }: Props) {
  const t = useTranslations("organizer-dashboard.RequestPayout");
  const [request, setRequest] = useState<PayoutRequestWithEvent>(initialRequest);
  const [statusDraft, setStatusDraft] = useState<PayoutStatus>(initialRequest.status);
  const [agreedAmountInput, setAgreedAmountInput] = useState<string>(
    initialRequest.agreedAmount?.toString() ?? initialRequest.requestedAmount.toString()
  );
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingAmount, setIsSavingAmount] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const canEditAgreed = useMemo(
    () => ["pending", "in_discussion"].includes(request.status),
    [request.status]
  );

  const agreedAmountNumber = Number(agreedAmountInput);
  const deductionPercent =
    revenue > 0 && Number.isFinite(agreedAmountNumber)
      ? Math.max(0, Math.min(100, ((revenue - agreedAmountNumber) / revenue) * 100))
      : null;

  const handleSaveAll = async () => {
    if (canEditAgreed) {
      if (!Number.isFinite(agreedAmountNumber)) {
        toast.error(t("errors.invalidAmount", { defaultValue: "Please enter a valid amount." }));
        return;
      }
      if (agreedAmountNumber > revenue) {
        toast.error(t("errors.amountExceedsRevenue", { defaultValue: "Agreed amount cannot exceed event revenue." }));
        return;
      }
    }

    setIsSavingStatus(true);
    setIsSavingAmount(true);
    const payloadAgreed =
      canEditAgreed && Number.isFinite(agreedAmountNumber) && agreedAmountNumber > 0
        ? agreedAmountNumber
        : request.agreedAmount ?? request.requestedAmount;
    try {
      const updated = await updatePayoutStatusAction(
        request.id,
        statusDraft,
        canEditAgreed ? payloadAgreed : undefined
      );
      if (updated) {
        setRequest((prev) => ({
          ...prev,
          status: statusDraft,
          agreedAmount: canEditAgreed ? payloadAgreed : prev.agreedAmount,
          completionDate:
            statusDraft === "approved" || statusDraft === "rejected"
              ? new Date()
              : prev.completionDate,
        }));
        toast.success(t("toasts.statusUpdated"));
      } else {
        toast.error(t("toasts.statusUpdateFailed"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("toasts.statusUpdateFailed"));
    } finally {
      setIsSavingStatus(false);
      setIsSavingAmount(false);
    }
  };

  const handleProofUploadSuccess = async (response: { secure_url: string }) => {
    const proofUrl = response.secure_url;
    setIsUploadingProof(true);
    try {
      const result = await uploadPayoutProofAction(request.id, proofUrl);
      if (result) {
        setRequest((prev) => ({ ...prev, proofDocumentUrl: proofUrl }));
        toast.success(t("toasts.proofUploaded"));
      } else {
        toast.error(t("toasts.proofUploadFailed"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("toasts.proofUploadFailed"));
    } finally {
      setIsUploadingProof(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("page.title")}</p>
          <h1 className="text-2xl font-bold">{request.event?.name || t("table.event")}</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/payment-requests">{t("backToList", { defaultValue: "Back to list" })}</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm text-muted-foreground">{t("table.requestedAmount")}</p>
            <p className="text-lg font-semibold">{formatCurrencyVND(request.requestedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm text-muted-foreground">{t("table.agreedAmount")}</p>
            <p className="text-lg font-semibold">
              {request.agreedAmount !== null && request.agreedAmount !== undefined
                ? formatCurrencyVND(request.agreedAmount)
                : t("table.notSet", { defaultValue: "Not set" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-sm text-muted-foreground">{t("table.status")}</p>
            <Badge
              variant={
                ({
                  pending: "secondary",
                  approved: "default",
                  rejected: "destructive",
                  in_discussion: "outline",
                  cancelled: "destructive",
                  completed: "default",
                } as Record<string, "default" | "secondary" | "destructive" | "outline">)[request.status] ||
                "default"
              }
            >
              {t(`statusOptions.${request.status}`)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("table.agreedAmount")}</p>
              <Input
                type="number"
                value={agreedAmountInput}
                onChange={(e) => setAgreedAmountInput(e.target.value)}
                disabled={!canEditAgreed}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("currentRevenue", { defaultValue: "Current revenue" })}: {formatCurrencyVND(revenue)}
                </span>
                {deductionPercent !== null && Number.isFinite(deductionPercent) && (
                  <span>{t("table.deduction", { defaultValue: "Deduction" })}: {deductionPercent.toFixed(2)}%</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("table.status")}</p>
              <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as PayoutStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`statusOptions.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSaveAll} disabled={isSavingStatus || isSavingAmount}>
              {isSavingStatus || isSavingAmount
                ? t("buttons.saving", { defaultValue: "Saving..." })
                : t("buttons.save")}
            </Button>
            {!canEditAgreed && (
              <span className="text-xs text-muted-foreground">
                {t("errors.cannotEditAgreedStatus", { defaultValue: "Agreed amount can only be edited when status is pending or in discussion." })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-muted">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("table.requestDate")}</p>
              <p className="font-medium">
                {format(new Date(request.requestDate), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{t("table.completionDate")}</p>
              <p className="font-medium">
                {request.completionDate
                  ? format(new Date(request.completionDate), "dd/MM/yyyy HH:mm")
                  : t("table.notSet", { defaultValue: "Not set" })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("table.uploadEvidence")}</p>
            {request.proofDocumentUrl && (
              <a
                href={request.proofDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                {t("table.viewEvidence")}
              </a>
            )}
            <div className={isUploadingProof ? "pointer-events-none opacity-50" : ""}>
              <FileUploader
                folder="payout-evidence"
                buttonLabel={t("table.uploadEvidence")}
                mode="button"
                onUploadSuccess={handleProofUploadSuccess}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
