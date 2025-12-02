"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { linkEventToOrganization, findEventById } from "@vieticket/repos/events";
import { isUserMemberOfOrganization, getUserRoleInOrganization } from "@vieticket/repos/organization";

/**
 * Links an event to an organization or unlinks it (sets to personal mode).
 * Only the event owner can perform this action.
 * If linking to an organization, the user must be a member (preferably owner/admin).
 */
export async function linkEventToOrganizationAction(
  eventId: string,
  organizationId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the event to check ownership
    const event = await findEventById(eventId);
    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Only the event owner can link/unlink the event
    if (event.organizerId !== session.user.id) {
      return { success: false, error: "Only the event owner can link/unlink this event" };
    }

    // If linking to an organization, verify membership
    if (organizationId) {
      const isMember = await isUserMemberOfOrganization(session.user.id, organizationId);
      if (!isMember) {
        return { success: false, error: "You are not a member of this organization" };
      }

      // Optionally, check if user is owner/admin of the organization
      const userRole = await getUserRoleInOrganization(session.user.id, organizationId);
      if (userRole !== "owner" && userRole !== "admin") {
        return { 
          success: false, 
          error: "Only organization owners and admins can link events to the organization" 
        };
      }
    }

    // Perform the link/unlink
    await linkEventToOrganization(eventId, organizationId);

    return { success: true };
  } catch (error) {
    console.error("Error linking event to organization:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to link event" 
    };
  }
}
