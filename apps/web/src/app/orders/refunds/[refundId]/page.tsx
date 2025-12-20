import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getRefundDetailAction } from "@/lib/actions/refund-actions";
import { formatCurrencyVND } from "@vieticket/utils/formatters/currency";
import { getLocale, getTranslations } from "next-intl/server";

function formatDate(locale: string, value: unknown) {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(locale);
}

export default async function CustomerRefundDetailPage({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  const { refundId } = await params;
  const t = await getTranslations("refunds.customerDetail");
  const tStatus = await getTranslations("refunds.statusOptions");
  const tReason = await getTranslations("refunds.reasonOptions");
  const locale = await getLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const result = await getRefundDetailAction(refundId);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6 my-8 mx-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("errors.unableToLoad")}</p>
        </div>

        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-red-600 text-sm">
              {result.error ?? t("errors.failedToLoad")}
            </div>
            <Button asChild variant="outline">
              <Link href="/orders/refunds">{t("buttons.backToRefunds")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { refund, tickets } = result.data as any;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("titleWithNumber", { id: String(refund.id).slice(-8) })}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">{refund.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/orders/refunds">{t("buttons.back")}</Link>
          </Button>
          <Button asChild>
            <Link href={`/orders/${refund.orderId}`}>{t("buttons.viewOrder")}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("summary.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {tStatus(refund.status) ?? refund.status}
            </Badge>
            <span className="text-sm text-muted-foreground capitalize">
              {tReason(refund.reason) ?? String(refund.reason).replaceAll("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">
                {t("summary.refundAmount")}
              </div>
              <div className="font-medium">
                {formatCurrencyVND(Number(refund.amount))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("summary.baseAmount")}</div>
              <div className="font-medium">
                {formatCurrencyVND(Number(refund.baseAmount ?? refund.amount))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("summary.percentage")}</div>
              <div className="font-medium">{refund.percentageApplied ?? "-"}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("summary.requestedAt")}</div>
              <div className="text-sm">{formatDate(dateLocale, refund.requestedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("summary.approvedAt")}</div>
              <div className="text-sm">{formatDate(dateLocale, refund.approvedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("summary.refundedAt")}</div>
              <div className="text-sm">{formatDate(dateLocale, refund.refundedAt)}</div>
            </div>
          </div>

          {refund.rejectionReason ? (
            <>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("rejectionReason.label")}
                </div>
                <div className="text-sm">{refund.rejectionReason}</div>
              </div>
            </>
          ) : null}

          {refund.adminOverride ? (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {t("adminOverride.label")}
                </div>
                <div className="text-sm">
                  {t("adminOverride.description", {
                    from: refund.overridePreviousPercentage ?? "-",
                    to: refund.percentageApplied ?? "-",
                  })}
                  {refund.adminOverrideReason ? ` • ${refund.adminOverrideReason}` : null}
                </div>
              </div>
            </>
          ) : null}

          {refund.status === "payment_failed" ? (
            <>
              <Separator />
              <div className="text-sm text-amber-700">{t("paymentFailedNotice")}</div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("tickets.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets?.length ? (
            <div className="space-y-2">
              {tickets.map((ticket: any) => (
                <div
                  key={ticket.ticketId}
                  className="flex flex-col gap-1 rounded border border-gray-200 dark:border-gray-700 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs">{ticket.ticketId}</div>
                    <div className="text-sm font-medium">
                      {formatCurrencyVND(Number(ticket.ticketPrice))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {ticket.areaName ? `${ticket.areaName} • ` : ""}
                    {ticket.rowName ? `${t("tickets.rowLabel", { row: ticket.rowName })} • ` : ""}
                    {ticket.seatNumber ? t("tickets.seatLabel", { seat: ticket.seatNumber }) : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("tickets.ticketStatus")}: {ticket.ticketStatus ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t("tickets.none")}</div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
