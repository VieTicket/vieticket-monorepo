import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getRefundDetailAction } from "@/lib/actions/refund-actions";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";

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

function formatDate(value: unknown) {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("vi-VN");
}

export default async function CustomerRefundDetailPage({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  const { refundId } = await params;
  const result = await getRefundDetailAction(refundId);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6 my-8 mx-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Refund</h1>
          <p className="text-muted-foreground">Unable to load refund details.</p>
        </div>

        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-red-600 text-sm">
              {result.error ?? "Failed to load refund."}
            </div>
            <Button asChild variant="outline">
              <Link href="/orders/refunds">Back to refunds</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { refund, tickets } = result.data as any;

  return (
    <div className="space-y-6 my-8 mx-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Refund #{String(refund.id).slice(-8)}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{refund.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/orders/refunds">Back</Link>
          </Button>
          <Button asChild>
            <Link href={`/orders/${refund.orderId}`}>View order</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {statusLabels[refund.status] ?? refund.status}
            </Badge>
            <span className="text-sm text-muted-foreground capitalize">
              {String(refund.reason).replaceAll("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Refund amount</div>
              <div className="font-medium">
                {formatCurrencyVND(Number(refund.amount))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Base amount</div>
              <div className="font-medium">
                {formatCurrencyVND(Number(refund.baseAmount ?? refund.amount))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Percentage</div>
              <div className="font-medium">{refund.percentageApplied ?? "-"}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Requested at</div>
              <div className="text-sm">{formatDate(refund.requestedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Approved at</div>
              <div className="text-sm">{formatDate(refund.approvedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Refunded at</div>
              <div className="text-sm">{formatDate(refund.refundedAt)}</div>
            </div>
          </div>

          {refund.rejectionReason ? (
            <>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground">Rejection reason</div>
                <div className="text-sm">{refund.rejectionReason}</div>
              </div>
            </>
          ) : null}

          {refund.adminOverride ? (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Admin override</div>
                <div className="text-sm">
                  Overridden from{" "}
                  <span className="font-medium">
                    {refund.overridePreviousPercentage ?? "-"}%
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {refund.percentageApplied ?? "-"}%
                  </span>
                  {refund.adminOverrideReason ? ` • ${refund.adminOverrideReason}` : null}
                </div>
              </div>
            </>
          ) : null}

          {refund.status === "payment_failed" ? (
            <>
              <Separator />
              <div className="text-sm text-amber-700">
                Refund payment failed. Support may need to follow up to complete the refund.
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets?.length ? (
            <div className="space-y-2">
              {tickets.map((t: any) => (
                <div
                  key={t.ticketId}
                  className="flex flex-col gap-1 rounded border border-gray-200 dark:border-gray-700 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs">{t.ticketId}</div>
                    <div className="text-sm font-medium">
                      {formatCurrencyVND(Number(t.ticketPrice))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t.areaName ? `${t.areaName} • ` : ""}
                    {t.rowName ? `Row ${t.rowName} • ` : ""}
                    {t.seatNumber ? `Seat ${t.seatNumber}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ticket status: {t.ticketStatus ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No tickets found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

