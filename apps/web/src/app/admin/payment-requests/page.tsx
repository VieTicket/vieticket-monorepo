"use client"

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getAdminPayoutRequestsAction } from "@/lib/actions/organizer/payout-request-actions";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

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
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPayoutRequests = async (pageNum = page, status: PayoutStatus | "all" = statusFilter) => {
    setIsTableLoading(true);
    try {
      const response = await getAdminPayoutRequestsAction(
        pageNum,
        PAGE_SIZE,
        status !== "all" ? status : undefined,
        debouncedSearch || undefined
      );
      if (response.success && response.data) {
        const requestData = response.data.data || [];
        setRequests(requestData);
        setTotalPages(response.data.totalPages || 1);
      } else {
        setRequests([]);
        toast.error(t("toasts.fetchFailed"), { description: response.message || t("toasts.unexpectedError") });
      }
    } catch (error) {
      setRequests([]);
      toast.error(t("toasts.unexpectedError"));
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutRequests(page, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, debouncedSearch]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <Input
          placeholder={t("searchPlaceholder", { defaultValue: "Search payout requests" })}
          value={searchTerm}
          onChange={(e) => {
            setPage(1);
            setSearchTerm(e.target.value);
          }}
          className="w-full md:w-1/2"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPage(1);
            setStatusFilter(value as PayoutStatus | "all");
          }}
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder={t("filterLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("statusOptions.all")}</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`statusOptions.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-h-[300px] relative">
        {requests.length === 0 && !isTableLoading ? (
          <p>{t("noRequests")}</p>
        ) : (
          <>
            {requests.length > 0 && (
              <table className="min-w-full border">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">{t("table.event")}</th>
                    <th className="p-2">{t("table.requestedAmount")}</th>
                    <th className="p-2">{t("table.agreedAmount")}</th>
                    <th className="p-2">{t("table.deduction", { defaultValue: "Deduction (%)" })}</th>
                    <th className="p-2">{t("table.status")}</th>
                    <th className="p-2">{t("table.requestDate")}</th>
                    <th className="p-2">{t("table.completionDate")}</th>
                    <th className="p-2">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const displayAgreedValue = request.agreedAmount ?? request.requestedAmount;
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
                          <span className="whitespace-nowrap">
                            {displayAgreedValue !== undefined && displayAgreedValue !== null
                              ? formatCurrencyVND(Number(displayAgreedValue))
                              : t("table.notSet", { defaultValue: "Not set" })}
                          </span>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {/* Revenue is not fetched on the list view; deduction is computed on the detail page */}
                          {"—"}
                        </td>
                        <td className="p-2">
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
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {new Date(request.requestDate).toLocaleDateString("en-US")}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {request.completionDate ? new Date(request.completionDate).toLocaleDateString("en-US") : "N/A"}
                        </td>
                        <td className="p-2">
                          <Link
                            href={`/admin/payment-requests/${request.id}`}
                            className="text-blue-600 underline font-medium"
                          >
                            {t("viewDetails")}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {requests.length > 0 && (
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
            )}
          </>
        )}

        {isTableLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-background/60 backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">{t("loading")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
