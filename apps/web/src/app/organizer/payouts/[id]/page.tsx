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
        <div className="w-full sm:w-11/12 md:w-5/6 lg:w-3/4 xl:w-2/3 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-20 py-4 sm:py-6 lg:py-8">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6">Payout Request Details</h1>
            <PayoutRequestDetails payoutRequest={payoutRequest} />
        </div>
    );
}