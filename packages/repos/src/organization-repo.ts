import { db } from "@vieticket/db/pg";
import { member, organization } from "@vieticket/db/pg/schema";
import { and, eq } from "drizzle-orm";

/**
 * Checks if a user is a member of a specific organization.
 * @param userId - The ID of the user.
 * @param organizationId - The ID of the organization.
 * @returns True if the user is a member, false otherwise.
 */
export async function isUserMemberOfOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  });

  return !!membership;
}

/**
 * Gets all organizations that a user is a member of.
 * @param userId - The ID of the user.
 * @returns Array of organizations.
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await db.query.member.findMany({
    where: eq(member.userId, userId),
    with: {
      organization: true,
    },
  });

  return memberships.map((m) => m.organization);
}

/**
 * Gets the user's role in a specific organization.
 * @param userId - The ID of the user.
 * @param organizationId - The ID of the organization.
 * @returns The user's role or null if not a member.
 */
export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  });

  return membership?.role ?? null;
}
