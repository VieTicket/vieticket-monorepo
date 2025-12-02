import { db } from "@vieticket/db/pg";
import { organizers, user } from "@vieticket/db/pg/schemas/users";
import { Organizer } from "@vieticket/db/pg/models/users";
import { eq, and } from "drizzle-orm";

/**
 * Creates a new organizer profile.
 * @param data - The organizer data to create.
 * @returns The created organizer profile.
 */
export async function createOrganizer(data: {
  id: string;
  name: string;
  isActive?: boolean;
  foundedDate?: Date;
  website?: string;
  address?: string;
  organizerType?: string;
}): Promise<Organizer> {
  const [organizer] = await db
    .insert(organizers)
    .values({
      id: data.id,
      name: data.name,
      isActive: data.isActive ?? false,
      foundedDate: data.foundedDate,
      website: data.website,
      address: data.address,
      organizerType: data.organizerType,
    })
    .returning();

  return organizer;
}

/**
 * Finds an organizer by user ID.
 * @param userId - The user ID to search for.
 * @returns The organizer profile or null if not found.
 */
export async function findOrganizerByUserId(
  userId: string
): Promise<Organizer | null> {
  const organizer = await db.query.organizers.findFirst({
    where: eq(organizers.id, userId),
  });

  return organizer || null;
}

/**
 * Updates an organizer profile.
 * @param userId - The user ID of the organizer.
 * @param data - The data to update.
 * @returns The updated organizer profile or null if not found.
 */
export async function updateOrganizerProfile(
  userId: string,
  data: Partial<Omit<Organizer, "id">>
): Promise<Organizer | null> {
  const [updatedOrganizer] = await db
    .update(organizers)
    .set(data)
    .where(eq(organizers.id, userId))
    .returning();

  return updatedOrganizer || null;
}

/**
 * Rejects an organizer by setting rejection reason and updating the organizer record.
 * @param userId - The user ID of the organizer.
 * @param reason - The reason for rejection.
 * @returns Updated organizer profile or null if not found.
 */
export async function rejectOrganizer(
  userId: string,
  reason: string
): Promise<Organizer | null> {
  const [updatedOrganizer] = await db
    .update(organizers)
    .set({
      rejectionReason: reason,
      rejectionSeen: false,
      rejectedAt: new Date(),
    })
    .where(eq(organizers.id, userId))
    .returning();

  return updatedOrganizer || null;
}

/**
 * Marks rejection as seen by the organizer.
 * @param userId - The user ID of the organizer.
 * @returns Updated organizer profile or null if not found.
 */
export async function markRejectionAsSeen(
  userId: string
): Promise<Organizer | null> {
  const [updatedOrganizer] = await db
    .update(organizers)
    .set({ rejectionSeen: true })
    .where(eq(organizers.id, userId))
    .returning();

  return updatedOrganizer || null;
}

/**
 * Clears rejection status when organizer is approved.
 * @param userId - The user ID of the organizer.
 * @returns Updated organizer profile or null if not found.
 */
export async function clearRejectionStatus(
  userId: string
): Promise<Organizer | null> {
  const [updatedOrganizer] = await db
    .update(organizers)
    .set({
      rejectionReason: null,
      rejectionSeen: null,
      rejectedAt: null,
      isActive: true,
    })
    .where(eq(organizers.id, userId))
    .returning();

  return updatedOrganizer || null;
}

/**
 * Finds all pending (inactive) organizers with their user information.
 * @returns Array of organizers with user details.
 */
export async function findPendingOrganizers(): Promise<
  Array<Organizer & { user: any }>
> {
  const result = await db
    .select({
      id: organizers.id,
      name: organizers.name,
      foundedDate: organizers.foundedDate,
      website: organizers.website,
      isActive: organizers.isActive,
      address: organizers.address,
      organizerType: organizers.organizerType,
      rejectionReason: organizers.rejectionReason,
      rejectionSeen: organizers.rejectionSeen,
      rejectedAt: organizers.rejectedAt,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      userImage: user.image,
      userCreatedAt: user.createdAt,
      userBanned: user.banned,
      userBanReason: user.banReason,
    })
    .from(organizers)
    .innerJoin(user, eq(organizers.id, user.id))
    .where(eq(organizers.isActive, false));

  // Transform the flat result back to nested structure
  return result.map((row) => ({
    id: row.id,
    name: row.name,
    foundedDate: row.foundedDate,
    website: row.website,
    isActive: row.isActive,
    address: row.address,
    organizerType: row.organizerType,
    rejectionReason: row.rejectionReason,
    rejectionSeen: row.rejectionSeen,
    rejectedAt: row.rejectedAt,
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      phone: row.userPhone,
      image: row.userImage,
      createdAt: row.userCreatedAt,
      banned: row.userBanned,
      banReason: row.userBanReason,
    },
  }));
}

/**
 * Approves an organizer by setting isActive to true and clearing rejection status.
 * @param userId - The user ID of the organizer.
 * @returns Updated organizer profile or null if not found.
 */
export async function approveOrganizer(
  userId: string
): Promise<Organizer | null> {
  return clearRejectionStatus(userId);
}

/**
 * Finds all active organizers.
 * @returns Array of active organizer profiles.
 */
export async function findActiveOrganizers(): Promise<Organizer[]> {
  const activeOrganizers = await db.query.organizers.findMany({
    where: eq(organizers.isActive, true),
  });

  return activeOrganizers;
}

/**
 * Finds all active organizers with their user information.
 * @returns Array of active organizer profiles with user data.
 */
export async function findActiveOrganizersWithUser() {
  const activeOrganizers = await db.query.organizers.findMany({
    where: eq(organizers.isActive, true),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return activeOrganizers;
}

/**
 * Counts all organizers by status.
 * @param isActive - Optional filter by active status.
 * @returns Count of organizers.
 */
export async function countOrganizers(isActive?: boolean): Promise<number> {
  const filter =
    isActive !== undefined ? eq(organizers.isActive, isActive) : undefined;

  const result = await db
    .select({ count: organizers.id })
    .from(organizers)
    .where(filter);

  return result.length;
}

/**
 * Finds organizers with pagination.
 * @param page - Page number (1-based).
 * @param limit - Number of items per page.
 * @param isActive - Optional filter by active status.
 * @returns Object containing organizers and pagination info.
 */
export async function findOrganizersWithPagination(
  page: number = 1,
  limit: number = 10,
  isActive?: boolean
): Promise<{
  organizers: Array<Organizer & { user: any }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const offset = (page - 1) * limit;
  const filter =
    isActive !== undefined ? eq(organizers.isActive, isActive) : undefined;

  const [organizerResults, totalCount] = await Promise.all([
    db
      .select({
        id: organizers.id,
        name: organizers.name,
        foundedDate: organizers.foundedDate,
        website: organizers.website,
        isActive: organizers.isActive,
        address: organizers.address,
        organizerType: organizers.organizerType,
        rejectionReason: organizers.rejectionReason,
        rejectionSeen: organizers.rejectionSeen,
        rejectedAt: organizers.rejectedAt,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        userImage: user.image,
        userCreatedAt: user.createdAt,
        userBanned: user.banned,
        userBanReason: user.banReason,
      })
      .from(organizers)
      .innerJoin(user, eq(organizers.id, user.id))
      .where(filter)
      .limit(limit)
      .offset(offset),
    countOrganizers(isActive),
  ]);

  // Transform the flat results back to nested structure
  const transformedResults = organizerResults.map((row) => ({
    id: row.id,
    name: row.name,
    foundedDate: row.foundedDate,
    website: row.website,
    isActive: row.isActive,
    address: row.address,
    organizerType: row.organizerType,
    rejectionReason: row.rejectionReason,
    rejectionSeen: row.rejectionSeen,
    rejectedAt: row.rejectedAt,
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      phone: row.userPhone,
      image: row.userImage,
      createdAt: row.userCreatedAt,
      banned: row.userBanned,
      banReason: row.userBanReason,
    },
  }));

  return {
    organizers: transformedResults,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1,
    },
  };
}

/**
 * Deletes an organizer profile.
 * @param userId - The user ID of the organizer to delete.
 * @returns The deleted organizer profile or null if not found.
 */
export async function deleteOrganizer(
  userId: string
): Promise<Organizer | null> {
  const [deletedOrganizer] = await db
    .delete(organizers)
    .where(eq(organizers.id, userId))
    .returning();

  return deletedOrganizer || null;
}

/**
 * Checks if an organizer exists by user ID.
 * @param userId - The user ID to check.
 * @returns True if the organizer exists, false otherwise.
 */
export async function organizerExists(userId: string): Promise<boolean> {
  const organizer = await db.query.organizers.findFirst({
    where: eq(organizers.id, userId),
    columns: { id: true },
  });

  return !!organizer;
}

/**
 * Finds organizers by type.
 * @param organizerType - The type of organizer to search for.
 * @param isActive - Optional filter by active status.
 * @returns Array of organizers matching the type.
 */
export async function findOrganizersByType(
  organizerType: string,
  isActive?: boolean
): Promise<Organizer[]> {
  const filters = [eq(organizers.organizerType, organizerType)];

  if (isActive !== undefined) {
    filters.push(eq(organizers.isActive, isActive));
  }

  const result = await db.query.organizers.findMany({
    where: and(...filters),
  });

  return result;
}
