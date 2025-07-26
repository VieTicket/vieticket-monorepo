"use client";

import { PayoutRequest, PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cancelPayoutRequestAction } from "@/lib/actions/organizer/payout-request-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayoutRequestDetailsProps {
  payoutRequest: PayoutRequestWithEvent;
}

export function PayoutRequestDetails({ payoutRequest }: PayoutRequestDetailsProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelRequest = async () => {
    if (!confirm("Are you sure you want to cancel this payout request?")) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await cancelPayoutRequestAction(payoutRequest.id);
      if (response.success) {
        toast.success("Success", {
          description: "Payout request cancelled successfully"
        });
        // Refresh the page to show updated status
        router.refresh();
      } else {
        toast.error("Error", {
          description: response.message || "Failed to cancel payout request"
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div>
      <Button variant={'outline'} className="mb-4">
        <Link
          href={"/organizer/payouts"}
          className="flex items-center gap-1"
        >
          <ArrowLeft /> <span>Back</span>
        </Link>
      </Button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold">Event</h2>
            <p>{payoutRequest.event?.name || 'N/A'}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Requested Amount</h2>
            <p>{payoutRequest.requestedAmount.toLocaleString('vi-VN')} VND</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agreed Amount</h2>
            <p>{payoutRequest.agreedAmount ? payoutRequest.agreedAmount.toLocaleString('vi-VN') + ' VND' : 'N/A'}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Status</h2>
            <p>{payoutRequest.status}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Request Date</h2>
            <p>{format(payoutRequest.requestDate, 'PPP', { locale: vi })}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Completion Date</h2>
            <p>{payoutRequest.completionDate ? format(payoutRequest.completionDate, 'PPP', { locale: vi }) : 'N/A'}</p>
          </div>
        </div>

        {payoutRequest.proofDocumentUrl && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold">Proof of Payment</h2>
            <img
              src={payoutRequest.proofDocumentUrl}
              alt="Proof of payment"
              className="mt-2 max-w-xs"
            />
          </div>
        )}

        {payoutRequest.status === "pending" && (
          <div className="mt-6">
            <Button
              variant="destructive"
              onClick={handleCancelRequest}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Request"}
            </Button>
          </div>
        )}

        {/* TODO: Integrate chat for negotiation history */}
      </div>
    </div>
  );
}