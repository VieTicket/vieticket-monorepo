import { AccountForm } from "@/components/profile/account-form";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "My Account | VieTicket",
};

function ProfileEditContent() {
  return (
    <div className="p-6 sm:p-8 rounded-lg">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        Account Information
      </h1>
      <hr className="mb-8" />
      <AccountForm />
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileEditContent />
    </Suspense>
  );
}
