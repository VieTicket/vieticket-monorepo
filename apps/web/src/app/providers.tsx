"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth/auth-client";
import { LayoutProvider } from "@/providers/LayoutProvider";
import QueryProvider from "@/providers/query-provider";

export function Providers({ children }: { children: ReactNode }) {
  
  const router = useRouter();

  return (
    <LayoutProvider>
      <AuthUIProvider
        authClient={authClient}
        navigate={router.push}
        replace={router.replace}
        onSessionChange={() => {
          // Clear router cache (protected routes)
          router.refresh();
        }}
        Link={Link}
        providers={["google"]}
        emailVerification={true}
      >
        {/* <AuthUIProvider ... > */}
        <QueryProvider>{children}</QueryProvider>
      {/* </AuthUIProvider> */}
      </AuthUIProvider>
    </LayoutProvider>
  );
}
