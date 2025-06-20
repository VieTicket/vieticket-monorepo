import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth/auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
  plugins: [inferAdditionalFields<typeof auth>()],
  // TODO: Remove { session.user as { role?: string } } workaround in components
  // user: {
  //   plugins: [inferAdditionalFields<typeof auth>()],
  // },
});
