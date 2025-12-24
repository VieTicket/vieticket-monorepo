import { Card, CardContent } from "@/components/ui/card";
import {
  approveRefundAction,
  executeRefundAction,
  listRefundsAction,
  markRefundManualAction,
  rejectRefundAction,
} from "@/lib/actions/refund-actions";
import { RotateCcw } from "lucide-react";
import { RefundsList } from "@/components/refunds/refunds-list";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

export default async function RefundsPage({
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
  const t = await getTranslations("refunds.adminPage");
  const refundsResult = await listRefundsAction(sp);

  async function approve(formData: FormData) {
    "use server";
    const refundId = formData.get("refundId") as string | null;
    if (!refundId) return;
    await approveRefundAction(refundId);
    revalidatePath("/admin/refunds");
  }

  async function reject(formData: FormData) {
    "use server";
    const refundId = formData.get("refundId") as string | null;
    const reason = formData.get("reason") as string | null;
    if (!refundId) return;
    await rejectRefundAction(refundId, reason ?? undefined);
    revalidatePath("/admin/refunds");
  }

  async function execute(formData: FormData) {
    "use server";
    const refundId = formData.get("refundId") as string | null;
    if (!refundId) return;
    await executeRefundAction(refundId);
    revalidatePath("/admin/refunds");
  }

  async function markManual(formData: FormData) {
    "use server";
    const refundId = formData.get("refundId") as string | null;
    if (!refundId) return;
    await markRefundManualAction(refundId);
    revalidatePath("/admin/refunds");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">{t("title")}</h1>
        <p className="text-gray-600">{t("subtitle")}</p>
      </div>

      {!refundsResult.success && (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-6">
            <div className="text-red-600 text-sm">
              {refundsResult.error ?? t("errors.failedToLoad")}
            </div>
          </CardContent>
        </Card>
      )}

      {refundsResult.success && refundsResult.pagination && (
        <RefundsList
          role="admin"
          refunds={(refundsResult.data ?? []) as any[]}
          pagination={refundsResult.pagination}
          actions={{ approve, reject, execute, markManual }}
          title={
            <span className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {t("listTitle")}
            </span>
          }
          description={t("listDescription")}
        />
      )}
    </div>
  );
}
