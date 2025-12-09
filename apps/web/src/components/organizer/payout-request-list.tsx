"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, CreditCardIcon, EyeIcon } from "lucide-react";
import { getPayoutRequestsWithFilters } from "@/lib/actions/organizer/payout-request-actions";
import Link from "next/link";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PayoutStatus } from "@vieticket/db/pg/schema";

const columns: ColumnDef<PayoutRequestWithEvent>[] = [];

export function PayoutRequestList() {
  const t = useTranslations("organizer-dashboard.RequestPayout");
  const [data, setData] = useState<PayoutRequestWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const columns: ColumnDef<PayoutRequestWithEvent>[] = [
    {
      accessorKey: "event.name",
      header: t("table.event"),
    },
    {
      accessorKey: "requestedAmount",
      header: t("table.requestedAmount"),
      cell: ({ row }) => {
        const amount = row.getValue("requestedAmount") as number;
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(amount);
      },
    },
    {
      accessorKey: "status",
      header: t("table.status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
          pending: "secondary",
          approved: "default",
          rejected: "destructive",
          in_discussion: "outline",
          cancelled: "destructive",
          completed: "default",
        };

        return (
          <Badge variant={variantMap[status] || "default"}>
            {t(`statusOptions.${status}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "requestDate",
      header: t("table.requestDate"),
      cell: ({ row }) => format(new Date(row.getValue("requestDate") as string), "dd/MM/yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link href={`/organizer/payouts/${row.original.id}`}>
          <Button variant="outline" size="sm">
            {t("viewDetails")}
          </Button>
        </Link>
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getPayoutRequestsWithFilters(page, 10, {
          status: statusFilter === "all" ? undefined : statusFilter,
          search: debouncedSearch || undefined,
        });
        // Normalize API result to match PayoutRequestWithEvent typing
        const normalized = result.data.map((item) => ({
          ...item,
          event: item.event ? { ...item.event } : undefined,
        })) as PayoutRequestWithEvent[];
        setData(normalized);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error("Failed to fetch payout requests:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [page, statusFilter, debouncedSearch]);

  const statusOptions: Array<{ label: string; value: PayoutStatus | "all" }> = [
    { label: t("statusOptions.all"), value: "all" },
    { label: t("statusOptions.pending"), value: "pending" },
    { label: t("statusOptions.approved"), value: "approved" },
    { label: t("statusOptions.rejected"), value: "rejected" },
    { label: t("statusOptions.cancelled"), value: "cancelled" },
    { label: t("statusOptions.in_discussion"), value: "in_discussion" },
    { label: t("statusOptions.completed"), value: "completed" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">{t("empty.title")}</h3>
        <p className="text-muted-foreground mt-2">{t("empty.description")}</p>
        <Button className="mt-4" asChild>
          <Link href="/organizer/payouts/new">{t("empty.createBtn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
        <Input
          placeholder={t("searchPlaceholder", { defaultValue: "Search payouts" })}
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
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={data} />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((payoutRequest) => (
          <Card key={payoutRequest.id} className="p-0">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Event Name */}
                <div>
                  <h3 className="font-semibold text-sm truncate">
                    {payoutRequest.event?.name || "Unknown Event"}
                  </h3>
                </div>

                {/* Amount & Status Row */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <CreditCardIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(payoutRequest.requestedAmount)}
                    </span>
                  </div>
                  <Badge 
                    variant={
                      ({
                        pending: "secondary",
                        approved: "default", 
                        rejected: "destructive",
                        in_discussion: "outline",
                        cancelled: "destructive",
                        completed: "default",
                      } as Record<string, "default" | "secondary" | "destructive" | "outline">)[payoutRequest.status] || "default"
                    }
                    className="text-xs"
                  >
                    {t(`statusOptions.${payoutRequest.status}`)}
                  </Badge>
                </div>

                {/* Date & Actions Row */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(payoutRequest.requestDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <Link href={`/organizer/payouts/${payoutRequest.id}`}>
                    <Button variant="outline" size="sm" className="h-8 px-3">
                      <EyeIcon className="w-3 h-3 mr-1" />
                      <span className="text-xs">{t("viewDetails")}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-3 mt-6">
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <Button 
            onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
            disabled={page === 1}
            variant="outline"
            size="sm"
            className="px-3"
          >
            {t("buttons.previous")}
          </Button>
          <Button 
            onClick={() => setPage(prev => prev + 1)} 
            disabled={page === totalPages}
            variant="outline"
            size="sm"
            className="px-3"
          >
            {t("buttons.next")}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground order-1 sm:order-2">
          {t("pagination.pageOf", { page, totalPages })}
        </div>
        <div className="hidden sm:block sm:order-3 w-[100px]">
          {/* Spacer for balance on desktop */}
        </div>
      </div>
    </div>
  );
}
