"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PayoutRequest } from "@vieticket/db/pg/models/payout-requests";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPayoutRequests } from "@/lib/actions/organizer/payout-request-actions";
import Link from "next/link";

const columns: ColumnDef<PayoutRequest>[] = [];

export function PayoutRequestList() {
  const t = useTranslations("organizer-dashboard.RequestPayout");
  const [data, setData] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const columns: ColumnDef<PayoutRequest>[] = [
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
        const variantMap = {
          pending: "secondary",
          approved: "default",
          rejected: "destructive",
          in_discussion: "outline",
          completed: "default",
        } as Record<string, "default" | "secondary" | "destructive" | "outline">;

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
            {t("table.viewDetails")}
          </Button>
        </Link>
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getPayoutRequests(page, 10);
        setData(result.data);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error("Failed to fetch payout requests:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [page]);

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
      <DataTable columns={columns} data={data} />
      <div className="flex justify-between items-center mt-4">
        <Button onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={page === 1}>
          {t("buttons.previous")}
        </Button>
        <span>{t("pagination.pageOf", { page, totalPages })}</span>
        <Button onClick={() => setPage(prev => prev + 1)} disabled={page === totalPages}>
          {t("buttons.next")}
        </Button>
      </div>
    </div>
  );
}