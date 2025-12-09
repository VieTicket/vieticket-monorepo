"use client"

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  updatePayoutStatusAction,
  uploadPayoutProofAction,
  getAdminPayoutRequestsAction
} from "@/lib/actions/organizer/payout-request-actions";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { FileUploader } from "@/components/ui/file-uploader";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";

const PAGE_SIZE = 10;
const STATUS_OPTIONS: PayoutStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "in_discussion",
  "completed"
];

export default function AdminPaymentRequestsPage() {
  const t = useTranslations("organizer-dashboard.RequestPayout");
  const [requests, setRequests] = useState<PayoutRequestWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusEdits, setStatusEdits] = useState<Record<string, PayoutStatus>>({});
  const [agreedAmountEdits, setAgreedAmountEdits] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");

  const fetchPayoutRequests = async (pageNum = page, status: PayoutStatus | "all" = statusFilter) => {
    setLoading(true);
    try {
      const response = await getAdminPayoutRequestsAction(pageNum, PAGE_SIZE, status !== "all" ? status : undefined);
      if (response.success && response.data) {
        const requestData = response.data.data || [];
        setRequests(requestData);
        setTotalPages(response.data.totalPages || 1);
        setAgreedAmountEdits((prev) => {
          const next = { ...prev };
          requestData.forEach((req) => {
            if (next[req.id] === undefined) {
              next[req.id] = req.agreedAmount ?? req.requestedAmount;
            }
          });
          return next;
        });
      } else {
        setRequests([]);
        toast.error(t("toasts.fetchFailed"), { description: response.message || t("toasts.unexpectedError") });
      }
    } catch (error) {
      setRequests([]);
      toast.error(t("toasts.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutRequests(page, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleStatusEdit = (requestId: string, status: string) => {
    setStatusEdits((prev) => ({ ...prev, [requestId]: status as PayoutStatus }));
  };

  const handleAgreedAmountSave = async (requestId: string) => {
    const currentRequest = requests.find((r) => r.id === requestId);
    if (!currentRequest) return;
    const newAmount =
      agreedAmountEdits[requestId] ??
      currentRequest.agreedAmount ??
      currentRequest.requestedAmount;
    if (newAmount === undefined || newAmount === null) return;
  if (!window.confirm(t("confirm.updateAgreed"))) return;

    try {
      const result = await updatePayoutStatusAction(requestId, currentRequest.status, newAmount);
      if (result) {
        toast.success(t("toasts.agreedAmountUpdated"));
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, agreedAmount: newAmount }
              : req
          )
        );
        setAgreedAmountEdits((prev) => {
          const copy = { ...prev };
          delete copy[requestId];
          return copy;
        });
      } else {
        toast.error(t("toasts.agreedAmountUpdateFailed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("toasts.unexpectedError"));
    }
  };

  const handleAgreedAmountEdit = (requestId: string, value: string) => {
    setAgreedAmountEdits((prev) => ({
      ...prev,
      [requestId]: Number(value)
    }));
  };

  const handleStatusSave = async (requestId: string) => {
    const newStatus = statusEdits[requestId];
    if (!newStatus) return;
  if (!window.confirm(t("confirm.updateStatus"))) return;

    // Only allow agreedAmount to be set when status is "approved"
    const updateData: {
      status: PayoutStatus;
      agreedAmount?: number;
    } = { status: newStatus };

    const currentRequest = requests.find((r) => r.id === requestId);
    const resolvedAgreedAmount =
      agreedAmountEdits[requestId] ??
      currentRequest?.agreedAmount ??
      currentRequest?.requestedAmount;

    if (newStatus === "approved" && resolvedAgreedAmount !== undefined) {
      updateData.agreedAmount = resolvedAgreedAmount;
    }

    try {
      const result = await updatePayoutStatusAction(requestId, updateData.status, updateData.agreedAmount);
      if (result) {
        toast.success(t("toasts.statusUpdated"));
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? {
                ...req,
                status: newStatus,
                agreedAmount: updateData.agreedAmount ?? req.agreedAmount,
                completionDate:
                  newStatus === "approved" || newStatus === "rejected"
                    ? new Date()
                    : req.completionDate,
              }
              : req
          )
        );
        setStatusEdits((prev) => {
          const copy = { ...prev };
          delete copy[requestId];
          return copy;
        });
        setAgreedAmountEdits((prev) => {
          const copy = { ...prev };
          delete copy[requestId];
          return copy;
        });
      } else {
        toast.error(t("toasts.statusUpdateFailed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("toasts.unexpectedError"));
    }
  };

  // Upload payment evidence logic (similar to avatar upload in AccountForm)
  const handleProofUploadSuccess = async (requestId: string, response: { secure_url: string }) => {
    const proofUrl = response.secure_url;
    try {
      const result = await uploadPayoutProofAction(requestId, proofUrl);
      if (result) {
        toast.success(t("toasts.proofUploaded"));
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId ? { ...req, proofDocumentUrl: proofUrl } : req
          )
        );
      } else {
        toast.error(t("toasts.proofUploadFailed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("toasts.unexpectedError"));
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="statusFilter" className="font-medium">{t("filterLabel")}</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PayoutStatus | "all")}
          className="border p-1"
        >
          <option value="all">{t("statusOptions.all")}</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{t(`statusOptions.${status}`)}</option>
          ))}
        </select>
      </div>
      {requests.length === 0 ? (
        <p>{t("noRequests")}</p>
      ) : (
        <>
          <table className="min-w-full border">
            <thead>
              <tr className="border-b">
                <th className="p-2">{t("table.event")}</th>
                <th className="p-2">{t("table.requestedAmount")}</th>
                <th className="p-2">{t("table.agreedAmount")}</th>
                <th className="p-2">Deduction (%)</th>
                <th className="p-2">{t("table.status")}</th>
                <th className="p-2">{t("table.requestDate")}</th>
                <th className="p-2">{t("table.completionDate")}</th>
                <th className="p-2">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const editedAgreedAmount = agreedAmountEdits[request.id];
                const displayAgreedValue =
                  editedAgreedAmount ?? request.agreedAmount ?? request.requestedAmount;

                return (
                  <tr key={request.id} className="border-b">
                    <td className="p-2 min-w-0 max-w-xs">
                      <div className="truncate" title={request.event?.name || "N/A"}>
                        {request.event?.name || "N/A"}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="whitespace-nowrap">
                        {formatCurrencyVND(request.requestedAmount)}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          min={0}
                          value={displayAgreedValue ?? ""}
                          onChange={e => handleAgreedAmountEdit(request.id, e.target.value)}
                          className="border p-1 w-24"
                          placeholder={t("placeholders.agreedAmount")}
                        />
                        {displayAgreedValue !== undefined && displayAgreedValue !== null && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrencyVND(Number(displayAgreedValue))}
                          </span>
                        )}
                        {editedAgreedAmount !== undefined &&
                          editedAgreedAmount !== request.agreedAmount && (
                            <button
                              className="px-2 py-1 bg-green-500 text-white rounded whitespace-nowrap"
                              onClick={() => handleAgreedAmountSave(request.id)}
                            >
                            {t("buttons.save")}
                          </button>
                        )
                      }
                    </div>
                  </td>
                    <td className="p-2 whitespace-nowrap">
                      {request.requestedAmount > 0 &&
                      displayAgreedValue !== undefined &&
                      displayAgreedValue !== null &&
                      Number.isFinite(Number(displayAgreedValue))
                        ? `${Math.max(
                            0,
                            Math.min(
                              100,
                              ((request.requestedAmount - Number(displayAgreedValue)) / request.requestedAmount) *
                                100
                            )
                          ).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={statusEdits[request.id] ?? request.status}
                          onChange={(e) => handleStatusEdit(request.id, e.target.value)}
                          className="border p-1"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{t(`statusOptions.${status}`)}</option>
                          ))}
                        </select>
                        {statusEdits[request.id] && statusEdits[request.id] !== request.status && (
                          <button
                            className="px-2 py-1 bg-blue-500 text-white rounded whitespace-nowrap"
                            onClick={() => handleStatusSave(request.id)}
                          >
                            {t("buttons.save")}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {new Date(request.requestDate).toLocaleDateString("en-US")}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {request.completionDate ? new Date(request.completionDate).toLocaleDateString("en-US") : "N/A"}
                    </td>
                    <td className="p-2 space-y-2 min-w-0 max-w-xs">
                      {/* Show preview if already uploaded */}
                      {request.proofDocumentUrl && (
                        <a
                          href={request.proofDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mb-2 text-blue-600 underline truncate"
                          title={request.proofDocumentUrl}
                        >
                          {t("table.viewEvidence")}
                        </a>
                      )}
                      <FileUploader
                        folder="payout-evidence"
                        buttonLabel={t("table.uploadEvidence")}
                        mode="button"
                        onUploadSuccess={(response) => handleProofUploadSuccess(request.id, response)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-center items-center mt-4 space-x-2">
            <button
              className="px-3 py-1 border rounded"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("buttons.previous")}
            </button>
            <span>
              {t("pagination.pageOf", { page, totalPages })}
            </span>
            <button
              className="px-3 py-1 border rounded"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("buttons.next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
