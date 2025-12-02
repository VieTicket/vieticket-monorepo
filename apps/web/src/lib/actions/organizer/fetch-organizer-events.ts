"use server";

import { getEventsByOrganizer } from "@/lib/services/eventService";
import { getAuthSession } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export async function fetchCurrentOrganizerEvents() {
  const session = await getAuthSession(await headers());

  if (!session?.user) {
    throw new Error("Unauthorized: Please log in");
  }

  // Check if user is organizer role
  const isOrganizerRole = session.user.role === "organizer";
  
  // Check if user is in an organization as owner/admin
  let isOrgOwnerOrAdmin = false;
  if (!isOrganizerRole) {
    // Get active organization
    const organization = await auth.api.getFullOrganization({
      headers: await headers(),
    });
    
    if (organization) {
      const currentMember = organization.members?.find(
        m => m.userId === session.user.id
      );
      isOrgOwnerOrAdmin = currentMember?.role === "owner";
    }
  }

  // Allow access if user is organizer role OR owner/admin of an organization
  if (!isOrganizerRole && !isOrgOwnerOrAdmin) {
    throw new Error("Forbidden: Only organizers or organization owners can access this");
  }

  return await getEventsByOrganizer(session.user.id);
}
