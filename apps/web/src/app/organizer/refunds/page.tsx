import {
  approveRefundAction,
  listRefundsAction,
  rejectRefundAction,
} from "@/lib/actions/refund-actions";
import { Card, CardContent } from "@/components/ui/card";
import { RefundsList } from "@/components/refunds/refunds-list";
import { revalidatePath } from "next/cache";

export default async function OrganizerRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    dir?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const sp = await searchParams;
  const refundsResult = await listRefundsAction(sp);

  async function approve(formData: FormData) {
    "use server";
    const refundId = formData.get("refundId") as string | null;
    if (!refundId) return;
    await approveRefundAction(refundId);
    revalidatePath("/organizer/refunds");
  }

  async function reject(formData: FormData) {
    "use server";
    const refundId = formData.get("refundId") as string | null;
    const reason = formData.get("reason") as string | null;
    if (!refundId) return;
    await rejectRefundAction(refundId, reason ?? undefined);
    revalidatePath("/organizer/refunds");
  }

  return (
    <div className="space-y-6 my-8 mx-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Refund Requests</h1>
        <p className="text-muted-foreground">Manage personal refund requests for your events.</p>
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
        <RefundsList
          role="organizer"
          refunds={(refundsResult.data ?? []) as any[]}
          pagination={refundsResult.pagination}
          actions={{ approve, reject }}
          title="Personal refund requests"
          description="Search and filter personal refunds; approve/reject pending ones."
        />
      )}
    </div>
  );
}
