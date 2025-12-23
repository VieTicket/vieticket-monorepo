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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search, CreditCard } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">{t("title")}</h1>
        <p className="text-slate-400 mt-2">{t("subtitle", { defaultValue: "Manage and review payout requests from organizers" })}</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CreditCard className="h-5 w-5 text-yellow-400" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("searchPlaceholder", { defaultValue: "Search payout requests" })}
                value={searchTerm}
                onChange={(e) => {
                  setPage(1);
                  setSearchTerm(e.target.value);
                }}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-400/50"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as PayoutStatus | "all");
              }}
            >
              <SelectTrigger className="w-full md:w-56 bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder={t("filterLabel")} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-700">{t("statusOptions.all")}</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status} className="text-white hover:bg-slate-700">
                    {t(`statusOptions.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-h-[300px] relative">
            {requests.length === 0 && !isTableLoading ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-400">{t("noRequests")}</p>
              </div>
            ) : (
              <>
                {requests.length > 0 && (
                  <div className="rounded-md border border-slate-700/50 overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-slate-700/50">
                          <TableHead className="text-slate-300">{t("table.event")}</TableHead>
                          <TableHead className="text-slate-300">{t("table.requestedAmount")}</TableHead>
                          <TableHead className="text-slate-300">{t("table.agreedAmount")}</TableHead>
                          <TableHead className="text-slate-300">{t("table.deduction", { defaultValue: "Deduction (%)" })}</TableHead>
                          <TableHead className="text-slate-300">{t("table.status")}</TableHead>
                          <TableHead className="text-slate-300">{t("table.requestDate")}</TableHead>
                          <TableHead className="text-slate-300">{t("table.completionDate")}</TableHead>
                          <TableHead className="text-slate-300">{t("table.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request) => {
                          const displayAgreedValue = request.agreedAmount ?? request.requestedAmount;
                          return (
                            <TableRow key={request.id} className="border-slate-700/50 hover:bg-slate-700/20">
                              <TableCell className="min-w-0 max-w-xs text-slate-200">
                                <div className="truncate" title={request.event?.name || "N/A"}>
                                  {request.event?.name || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-200">
                                {formatCurrencyVND(request.requestedAmount)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-200">
                                {displayAgreedValue !== undefined && displayAgreedValue !== null
                                  ? formatCurrencyVND(Number(displayAgreedValue))
                                  : t("table.notSet", { defaultValue: "Not set" })}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-400">
                                {"—"}
                              </TableCell>
                              <TableCell>
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
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-300">
                                {new Date(request.requestDate).toLocaleDateString("en-US")}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-slate-300">
                                {request.completionDate ? new Date(request.completionDate).toLocaleDateString("en-US") : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/admin/payment-requests/${request.id}`}
                                  className="text-violet-400 hover:text-violet-300 underline font-medium transition-colors"
                                >
                                  {t("viewDetails")}
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {requests.length > 0 && (
                  <div className="flex justify-center items-center mt-4 pt-4 border-t border-slate-700/50 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border-slate-600 bg-slate-700/50 text-white hover:bg-violet-500/20 hover:border-violet-400/50 hover:text-violet-300 disabled:bg-slate-800/30 disabled:text-slate-500"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t("buttons.previous")}
                    </Button>
                    <span className="text-sm text-slate-300 px-3">
                      {t("pagination.pageOf", { page, totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="border-slate-600 bg-slate-700/50 text-white hover:bg-violet-500/20 hover:border-violet-400/50 hover:text-violet-300 disabled:bg-slate-800/30 disabled:text-slate-500"
                    >
                      {t("buttons.next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}

            {isTableLoading && (
              <div className="absolute inset-0 flex justify-center items-center bg-slate-900/60 backdrop-blur-sm rounded-md">
                <div className="text-sm text-slate-400">{t("loading")}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
