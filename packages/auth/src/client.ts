import { inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type auth from ".";
import { acAndRole } from "./org-team/config";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
  plugins: [
    inferAdditionalFields<typeof auth>(),
    organizationClient({
      // Client-side organization plugin mirrors server configuration.
      // Dynamic access control and internal teams are intentionally disabled.
      ...acAndRole,
    }),
  ],
});