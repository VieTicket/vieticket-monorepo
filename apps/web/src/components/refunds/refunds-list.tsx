"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

type RefundRow = {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  amount: number | string;
  requestedAt?: string | Date | null;
  eventId?: string | null;
  eventName?: string | null;
  userId?: string | null;
};

type SortField = "requestedAt" | "amount" | "status" | "reason" | null;
type SortDirection = "asc" | "desc";

const REFUND_STATUS_OPTIONS = [
  "requested",
  "pending_organizer",
  "pending_admin",
  "approved",
  "declined",
  "rejected",
  "processing",
  "payment_failed",
  "refunded",
  "completed",
  "failed",
] as const;

const REFUND_REASON_OPTIONS = [
  "personal",
  "event_cancelled",
  "event_postponed",
  "fraud",
] as const;

const statusLabels: Record<string, string> = {
  requested: "Requested",
  pending_organizer: "Pending Organizer",
  pending_admin: "Pending Admin",
  approved: "Approved",
  rejected: "Rejected",
  declined: "Declined",
  processing: "Processing",
  payment_failed: "Payment Failed",
  refunded: "Refunded",
  completed: "Completed",
  failed: "Failed",
};

function parseDate(value: unknown) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function sortIcon(field: SortField, activeField: SortField, direction: SortDirection) {
  if (field !== activeField) return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
  return direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
}

export type RefundsListActions = {
  approve?: (formData: FormData) => void | Promise<void>;
  reject?: (formData: FormData) => void | Promise<void>;
  execute?: (formData: FormData) => void | Promise<void>;
  markManual?: (formData: FormData) => void | Promise<void>;
};

export function RefundsList({
  role,
  refunds,
  pagination,
  actions,
  title,
  description,
}: {
  role: "admin" | "organizer";
  refunds: RefundRow[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  actions: RefundsListActions;
  title: ReactNode;
  description?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qParam = searchParams.get("q") ?? "";
  const statusRaw = searchParams.get("status");
  const statusParam = REFUND_STATUS_OPTIONS.includes(statusRaw as any)
    ? (statusRaw as string)
    : "all";

  const reasonRaw = searchParams.get("reason");
  const reasonParam = REFUND_REASON_OPTIONS.includes(reasonRaw as any)
    ? (reasonRaw as string)
    : "all";

  const sortRaw = searchParams.get("sort");
  const sortParam: SortField =
    sortRaw && ["requestedAt", "amount", "status", "reason"].includes(sortRaw)
      ? (sortRaw as SortField)
      : "requestedAt";

  const dirRaw = searchParams.get("dir");
  const dirParam: SortDirection =
    dirRaw === "asc" || dirRaw === "desc" ? dirRaw : "desc";

  const [searchQuery, setSearchQuery] = useState(qParam);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);

  function pushParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setFilter(name: "status" | "reason", value: string) {
    pushParams({
      [name]: value === "all" ? null : value,
      page: "1",
    });
  }

  function handleSort(field: SortField) {
    if (!field) return;
    const nextDir: SortDirection =
      sortParam === field ? (dirParam === "asc" ? "desc" : "asc") : "asc";
    pushParams({
      sort: field,
      dir: nextDir,
      page: "1",
    });
  }

  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;
  const pageItems = refunds;
  const startIndex = pagination.totalCount === 0 ? 0 : (currentPage - 1) * pagination.limit;
  const endIndex = startIndex + pageItems.length;

  const canApprove = Boolean(actions.approve);
  const canReject = Boolean(actions.reject);
  const canExecute = Boolean(actions.execute);
  const canMarkManual = Boolean(actions.markManual);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form
            className="relative md:w-96"
            onSubmit={(e) => {
              e.preventDefault();
              pushParams({
                q: searchQuery.trim() ? searchQuery.trim() : null,
                page: "1",
              });
            }}
          >
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-20"
              placeholder="Search by refund/order/event/user…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              className="absolute right-2 top-1.5 h-6 px-2"
            >
              Search
            </Button>
          </form>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={statusParam} onValueChange={(v) => setFilter("status", v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REFUND_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {role === "admin" ? (
              <Select
                value={reasonParam}
                onValueChange={(v) => setFilter("reason", v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  {REFUND_REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => handleSort("reason")}
                  >
                    Reason {sortIcon("reason", sortParam, dirParam)}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => handleSort("amount")}
                  >
                    Amount {sortIcon("amount", sortParam, dirParam)}
                  </button>
                </TableHead>
                <TableHead>Event</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortIcon("status", sortParam, dirParam)}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => handleSort("requestedAt")}
                  >
                    Requested {sortIcon("requestedAt", sortParam, dirParam)}
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No refunds found.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((refund) => {
                  const canTakeDecision =
                    role === "admin"
                      ? ["pending_admin", "pending_organizer"].includes(refund.status)
                      : refund.status === "pending_organizer";

                  return (
                    <TableRow key={refund.id}>
                      <TableCell className="font-mono text-xs">{refund.orderId}</TableCell>
                      <TableCell className="capitalize">{refund.reason.replaceAll("_", " ")}</TableCell>
                      <TableCell>{formatCurrencyVND(Number(refund.amount))}</TableCell>
                      <TableCell>{refund.eventName ?? refund.eventId ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {statusLabels[refund.status] ?? refund.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {parseDate(refund.requestedAt)?.toLocaleString("vi-VN") ?? "-"}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {canTakeDecision && canApprove ? (
                          <form className="inline" action={actions.approve}>
                            <input type="hidden" name="refundId" value={refund.id} />
                            <Button size="sm" variant="outline" type="submit">
                              Approve
                            </Button>
                          </form>
                        ) : null}

                        {canTakeDecision && canReject ? (
                          <form className="inline" action={actions.reject}>
                            <input type="hidden" name="refundId" value={refund.id} />
                            <input
                              type="hidden"
                              name="reason"
                              value={role === "admin" ? "Rejected by admin" : "Rejected by organizer"}
                            />
                            <Button size="sm" variant="destructive" type="submit">
                              Reject
                            </Button>
                          </form>
                        ) : null}

                        {role === "admin" && refund.status === "approved" && canExecute ? (
                          <form className="inline" action={actions.execute}>
                            <input type="hidden" name="refundId" value={refund.id} />
                            <Button size="sm" type="submit">
                              Execute PSP
                            </Button>
                          </form>
                        ) : null}

                        {role === "admin" && refund.status === "payment_failed" && canExecute ? (
                          <form className="inline" action={actions.execute}>
                            <input type="hidden" name="refundId" value={refund.id} />
                            <Button size="sm" type="submit">
                              Retry PSP
                            </Button>
                          </form>
                        ) : null}

                        {role === "admin" && refund.status === "payment_failed" && canMarkManual ? (
                          <form className="inline" action={actions.markManual}>
                            <input type="hidden" name="refundId" value={refund.id} />
                            <Button size="sm" variant="secondary" type="submit">
                              Mark manual done
                            </Button>
                          </form>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {pageItems.length === 0 ? 0 : startIndex + 1}–{endIndex} of {pagination.totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => pushParams({ page: String(Math.max(1, currentPage - 1)) })}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => pushParams({ page: String(Math.min(totalPages, currentPage + 1)) })}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
