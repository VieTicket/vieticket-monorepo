import { notFound } from "next/navigation";
import { PayoutRequestDetails } from "@/components/organizer/payout-request-details";
import { fetchPayoutRequestById } from "@/lib/actions/organizer/payout-request-actions";

interface PayoutRequestPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PayoutRequestPage({ params }: PayoutRequestPageProps) {
    const response = await fetchPayoutRequestById((await params).id);
    // Handle error or missing data
    if (!response.success || !response.data || !response.data.payoutRequest) {
        return notFound();
    }

    // Await the payoutRequest promise
    const payoutRequest = await response.data.payoutRequest;
    if (!payoutRequest) {
        return notFound();
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Payout Request Details</h1>
            <PayoutRequestDetails payoutRequest={payoutRequest} />
        </div>
    );
}