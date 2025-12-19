import { Card, CardContent } from "@/components/ui/card";
import { listRefundsAction } from "@/lib/actions/refund-actions";
import { CustomerRefundsList } from "@/components/refunds/customer-refunds-list";

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
  const refundsResult = await listRefundsAction(sp);

  return (
    <div className="space-y-6 my-8 mx-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refunds</h1>
        <p className="text-muted-foreground">
          View and track your refund requests.
        </p>
      </div>

      {!refundsResult.success && (
        <Card>
          <CardContent className="py-6">
            <div className="text-red-600 text-sm">
              {refundsResult.error ?? "Failed to load refunds."}
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
  );
}

