"use client";

import { AuthCard } from "@daveyplate/better-auth-ui";


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
