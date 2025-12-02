import { Session } from "better-auth/types";
import auth from "@vieticket/auth";
import type { User } from "better-auth";
import type { Role } from "@vieticket/db/pg/enums";
export { auth };

export type UserWithRole = User & {
  role: Role;
};

export async function getAuthSession(headers: Headers): Promise<{
  session: Session;
  user: UserWithRole;
} | null> {
  const session = await auth.api.getSession({ headers });
  return session as { session: Session; user: UserWithRole } | null;
}


