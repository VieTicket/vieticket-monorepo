import { AccountForm } from "@/components/profile/account-form";
import { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "My Account | VieTicket",
};

async function ProfileEditContent() {
  const t = await getTranslations("organizer-dashboard");

  return (
    <div className="p-6 sm:p-8 rounded-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        {t("Profile.accountInfo")}
      </h1>
      <hr className="mb-8" />
      <AccountForm />
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* ProfileEditContent is async and will resolve server translations */}
      {/* eslint-disable-next-line react/jsx-no-undef */}
      <ProfileEditContent />
    </Suspense>
  );
}
