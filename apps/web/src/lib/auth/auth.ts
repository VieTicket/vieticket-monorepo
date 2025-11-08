import type { User } from "better-auth";
import {
  Role,
} from "@vieticket/db/pg/schema";
import { Session } from "better-auth/types";
import auth from "@vieticket/auth";
export { auth };

type UserWithRole = Omit<User, "role"> & { role: Role };

export async function getAuthSession(headers: Headers): Promise<{
  session: Session;
  user: UserWithRole;
} | null> {
  const session = await auth.api.getSession({ headers });
  return session as { session: Session; user: UserWithRole } | null;
}
