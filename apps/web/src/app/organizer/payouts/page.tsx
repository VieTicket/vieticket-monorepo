"use client";

import { PayoutRequestList } from "@/components/organizer/payout-request-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function OrganizerPayoutsPage() {
  const t = useTranslations("organizer-dashboard.RequestPayout");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("page.title")}</h1>
        <Link href="/organizer/payouts/new">
          <Button>{t("buttons.newPayout")}</Button>
        </Link>
      </div>
      
      <PayoutRequestList />
    </div>
  );
}