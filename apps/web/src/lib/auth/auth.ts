import { Session } from "better-auth/types";
import auth from "@vieticket/auth";
import { UserWithRole } from "better-auth/plugins";
export { auth };

export async function getAuthSession(headers: Headers): Promise<{
  session: Session;
  user: UserWithRole;
} | null> {
  const session = await auth.api.getSession({ headers });
  return session as { session: Session; user: UserWithRole } | null;
}


