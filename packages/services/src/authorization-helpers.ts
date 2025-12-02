import { User } from "@vieticket/db/pg/schemas/users";
import { isUserMemberOfOrganization } from "@vieticket/repos/organization";

/**
 * Checks if a user can access a resource (seat map or event).
 * Access is granted if:
 * 1. User is the creator/owner of the resource, OR
 * 2. Resource is linked to an organization AND user is a member of that organization
 * 
 * @param userId - The ID of the user requesting access
 * @param resourceCreatorId - The ID of the user who created the resource
 * @param resourceOrganizationId - The organization ID linked to the resource (if any)
 * @returns True if user has access, false otherwise
 */
export async function canUserAccessResource(
  userId: string,
  resourceCreatorId: string,
  resourceOrganizationId?: string | null
): Promise<boolean> {
  // Check if user is the creator/owner
  if (userId === resourceCreatorId) {
    return true;
  }

  // Check if resource is linked to an organization and user is a member
  if (resourceOrganizationId) {
    const isMember = await isUserMemberOfOrganization(userId, resourceOrganizationId);
    return isMember;
  }

  return false;
}

/**
 * Checks if a user can modify a resource (seat map or event).
 * Modification is allowed if:
 * 1. User is the creator/owner of the resource, OR
 * 2. Resource is linked to an organization AND user is a member of that organization
 * 
 * Note: For create operations, members cannot create new resources, only owners/organizers can.
 * 
 * @param userId - The ID of the user requesting modification
 * @param resourceCreatorId - The ID of the user who created the resource
 * @param resourceOrganizationId - The organization ID linked to the resource (if any)
 * @returns True if user can modify, false otherwise
 */
export async function canUserModifyResource(
  userId: string,
  resourceCreatorId: string,
  resourceOrganizationId?: string | null
): Promise<boolean> {
  // Same logic as access for now
  return canUserAccessResource(userId, resourceCreatorId, resourceOrganizationId);
}

/**
 * Checks if a user has general seat map access permissions.
 * Access is granted if user has organizer role OR is a member of any organization.
 * This is used for operations like listing, searching, and creating seat maps.
 * 
 * @param user - The user object with role information
 * @param activeOrganizationId - The ID of the active organization context (if any)
 * @returns True if user can access seat map features, false otherwise
 */
export async function canUserAccessSeatMaps(
  user: User,
  activeOrganizationId?: string | null
): Promise<boolean> {
  // Organizers always have access
  if (user.role === "organizer") {
    return true;
  }

  // If there's an active organization, check if user is a member
  if (activeOrganizationId) {
    const isMember = await isUserMemberOfOrganization(user.id, activeOrganizationId);
    return isMember;
  }

  return false;
}
