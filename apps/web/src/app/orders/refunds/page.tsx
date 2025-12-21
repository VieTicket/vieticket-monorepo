import { Card, CardContent } from "@/components/ui/card";
import { listRefundsAction } from "@/lib/actions/refund-actions";
import { CustomerRefundsList } from "@/components/refunds/customer-refunds-list";
import { getTranslations } from "next-intl/server";

export default async function CustomerRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    reason?: string;
    sort?: string;
    dir?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("refunds.customerPage");
  const refundsResult = await listRefundsAction(sp);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!refundsResult.success && (
        <Card>
          <CardContent className="py-6">
            <div className="text-red-600 text-sm">
              {refundsResult.error ?? t("errors.failedToLoad")}
            </div>
          </CardContent>
        </Card>
      )}

      {refundsResult.success && refundsResult.pagination && (
        <CustomerRefundsList
          refunds={(refundsResult.data ?? []) as any[]}
          pagination={refundsResult.pagination}
        />
      )}
      </div>
    </div>
  );
}
