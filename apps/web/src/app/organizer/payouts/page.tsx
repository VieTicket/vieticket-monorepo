import { PayoutRequestList } from "@/components/organizer/payout-request-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OrganizerPayoutsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payout Requests</h1>
        <Link href="/organizer/payouts/new">
          <Button>New Payout Request</Button>
        </Link>
      </div>
      
      <PayoutRequestList />
    </div>
  );
}