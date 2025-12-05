import { PayoutRequestForm } from "@/components/organizer/payout-request-form";
import { Button } from "@/components/ui/button";
import { getOrganizerEvents } from "@/lib/actions/organizer/event-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NewPayoutRequestPage() {
  const events = await getOrganizerEvents();
  const t = await getTranslations("organizer-dashboard.NewPayoutRequest");

  return (
    <div className="w-full sm:w-11/12 md:w-5/6 lg:w-3/4 xl:w-2/3 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-20 py-4 sm:py-6 lg:py-8">
      <Button variant={'outline'} size="sm" className="mb-4">
        <Link
          href={"/organizer/payouts"}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="text-sm">{t("back")}</span>
        </Link>
      </Button>
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6">{t("newPayoutRequest")}</h1>
      <PayoutRequestForm events={events} />
    </div>
  );
}