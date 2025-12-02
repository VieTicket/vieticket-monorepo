"use client";

import { AuthCard } from "@daveyplate/better-auth-ui";
import "./auth-styles.css";

export function AuthView({ pathname }: { pathname: string }) {
  // Just an example, SettingsCards already includes this
  // useAuthenticate({ enabled: pathname === "settings" })

  return (
    <div className="w-full auth-card-container">
      <AuthCard pathname={pathname} />
    </div>
  );
}
