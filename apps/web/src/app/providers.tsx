"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { LayoutProvider } from "@/providers/LayoutProvider";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { ActiveOrganizationProvider } from "@/providers/active-organization-provider";
import { GlobalAIProvider } from "@/components/ai/global-ai-provider";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <GlobalAIProvider>
          <LayoutProvider>
            <AuthUIProvider
              authClient={authClient}
              navigate={router.push}
              replace={router.replace}
              onSessionChange={() => {
                router.refresh();
              }}
              Link={Link}
              social={{
                providers: ["google"],
              }}
              emailVerification={true}
            >
              <ActiveOrganizationProvider>
                {children}
              </ActiveOrganizationProvider>
            </AuthUIProvider>
          </LayoutProvider>
        </GlobalAIProvider>
      </LocaleProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
