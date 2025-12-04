"use server";

import { auth } from "@/lib/auth/auth";
import { db } from "@vieticket/db/pg/direct";
import { user } from "@vieticket/db/pg/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function inviteUserToOrganization(email: string, organizationId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  // Check if user exists
  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  try {
    if (existingUser) {
      // User exists, add them directly
      // Note: addMember usually requires 'owner' permission on the organization
      await auth.api.addMember({
        body: {
          userId: existingUser.id,
          organizationId,
          role: "member",
        },
        headers: await headers(),
      });
      return { success: true, message: "User added to organization" };
    } else {
      // User does not exist, invite them
      await auth.api.createInvitation({
        body: {
          email,
          role: "member",
          organizationId,
        },
        headers: await headers(),
      });
      return { success: true, message: "Invitation sent" };
    }
  } catch (error: any) {
    console.error("Error inviting/adding member:", error);
    return { error: error.body?.message || error.message || "Failed to process request" };
  }
}
