"use client";

import { PayoutRequestList } from "@/components/organizer/payout-request-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function OrganizerPayoutsPage() {
  const t = useTranslations("organizer-dashboard.RequestPayout");

  return (
    <div className="w-full sm:w-11/12 md:w-5/6 lg:w-3/4 xl:w-2/3 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-20 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{t("page.title")}</h1>
        <Link href="/organizer/payouts/new" className="self-start">
          <Button className="text-sm">{t("buttons.newPayout")}</Button>
        </Link>
      </div>
      
      <PayoutRequestList />
    </div>
  );
}