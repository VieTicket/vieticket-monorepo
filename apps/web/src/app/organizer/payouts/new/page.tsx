import { PayoutRequestForm } from "@/components/organizer/payout-request-form";
import { Button } from "@/components/ui/button";
import { getOrganizerEvents } from "@/lib/actions/organizer/event-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewPayoutRequestPage() {
  const events = await getOrganizerEvents();

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant={'outline'} className="mb-4">
        <Link
          href={"/organizer/payouts"}
          className="flex items-center gap-1"
        >
          <ArrowLeft /> <span>Back</span>
        </Link>
      </Button>
      <h1 className="text-2xl font-bold mb-6">New Payout Request</h1>
      <PayoutRequestForm events={events} />
    </div>
  );
}