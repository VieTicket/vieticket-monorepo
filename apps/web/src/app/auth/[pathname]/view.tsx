"use client";

import { AuthCard, ProvidersCard } from "@daveyplate/better-auth-ui";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function AuthView({ pathname }: { pathname: string }) {
  // Just an example, SettingsCards already includes this
  // useAuthenticate({ enabled: pathname === "settings" })

  return (
    <main className="flex grow flex-col items-center justify-center gap-4 p-4">
      <div className="w-full max-w-md">
        <AuthCard pathname={pathname} />
      </div>
    </main>
  );
}
