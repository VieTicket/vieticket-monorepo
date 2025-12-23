import { notFound } from "next/navigation";
import { AdminPayoutRequestDetail } from "@/components/admin/payout-request-detail";
import { getAdminPayoutRequestByIdAction } from "@/lib/actions/organizer/payout-request-actions";

export default async function AdminPaymentRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const awaitedParams = await params;
  const result = await getAdminPayoutRequestByIdAction(awaitedParams.id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPayoutRequestDetail
        initialRequest={result.data!.payoutRequest}
        revenue={result.data!.revenue}
      />
    </div>
  );
}
