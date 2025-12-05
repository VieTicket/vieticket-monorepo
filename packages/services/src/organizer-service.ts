import { User } from "@vieticket/db/pg/schemas/users";
import {
  approveOrganizer,
  createOrganizer,
  findActiveOrganizersWithUser,
  findOrganizerByUserId,
  findPendingOrganizers,
  markRejectionAsSeen,
  rejectOrganizer
} from "@vieticket/repos/organizer";

/**
 * Service function to create an organizer profile.
 * @param user - The authenticated user object
 * @returns The created organizer profile
 * @throws Error if user is not authorized or if organizer already exists
 */
export async function createOrganizerProfile(user: User) {
  try {
    // Check if organizer profile already exists
    const existingOrganizer = await findOrganizerByUserId(user.id);

    if (existingOrganizer) {
      return existingOrganizer; // Return existing organizer instead of throwing error
    }

    // Create organizer profile with isActive = false
    const organizerData = {
      id: user.id, // Use user ID as organizer ID
      name: user.name || "New Organizer",
      isActive: false,
    };

    const organizer = await createOrganizer(organizerData);
    return organizer;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create organizer profile: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while creating organizer profile"
    );
  }
}

/**
 * Service function to get all pending organizer applications.
 * Only admins can access this.
 * @param user - The authenticated admin user.
 * @returns Array of pending organizer applications.
 */
export async function getPendingOrganizers(user: any) {
  // Authorization check
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can view pending organizers");
  }

  try {
    const pendingOrganizers = await findPendingOrganizers();
    return pendingOrganizers;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch pending organizers: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while fetching pending organizers"
    );
  }
}

/**
 * Service function to approve an organizer application.
 * Only admins can approve organizers.
 * @param userId - The user ID of the organizer to approve.
 * @param user - The authenticated admin user.
 * @returns The approved organizer.
 */
export async function approveOrganizerApplication(userId: string, user: any) {
  // Authorization check
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can approve organizers");
  }

  // Input validation
  if (!userId || userId.trim().length === 0) {
    throw new Error("User ID is required");
  }

  try {
    const approvedOrganizer = await approveOrganizer(userId.trim());

    if (!approvedOrganizer) {
      throw new Error("Organizer not found or already approved");
    }

    return approvedOrganizer;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to approve organizer: ${error.message}`);
    }
    throw new Error("An unknown error occurred while approving organizer");
  }
}

/**
 * Service function to reject an organizer application.
 * Only admins can reject organizers.
 * @param userId - The user ID of the organizer to reject.
 * @param reason - The reason for rejection.
 * @param user - The authenticated admin user.
 * @returns The rejected organizer record.
 */
export async function rejectOrganizerApplication(
  userId: string,
  reason: string,
  user: any
) {
  // Authorization check
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can reject organizers");
  }

  // Input validation
  if (!userId || userId.trim().length === 0) {
    throw new Error("User ID is required");
  }

  if (!reason || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  try {
    const rejectedOrganizer = await rejectOrganizer(
      userId.trim(),
      reason.trim()
    );

    if (!rejectedOrganizer) {
      throw new Error("Organizer not found");
    }

    return rejectedOrganizer;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reject organizer: ${error.message}`);
    }
    throw new Error("An unknown error occurred while rejecting organizer");
  }
}

/**
 * Service function to mark rejection as seen by organizer.
 * @param user - The authenticated organizer user.
 * @returns Updated organizer profile.
 */
export async function markOrganizerRejectionAsSeen(user: any) {
  // Authorization check
  if (user.role !== "organizer") {
    throw new Error(
      "Unauthorized: Only organizers can mark rejections as seen"
    );
  }

  try {
    const updatedOrganizer = await markRejectionAsSeen(user.id);

    if (!updatedOrganizer) {
      throw new Error("Organizer profile not found");
    }

    return updatedOrganizer;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to mark rejection as seen: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while updating rejection status"
    );
  }
}

/**
 * Service function to get all active organizers with user information.
 * Only admins can access this.
 * @param user - The authenticated admin user.
 * @returns Array of active organizers with user data.
 */
export async function getActiveOrganizers(user: any) {
  // Authorization check
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can view active organizers");
  }

  try {
    const activeOrganizers = await findActiveOrganizersWithUser();
    return activeOrganizers;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch active organizers: ${error.message}`);
    }
    throw new Error(
      "An unknown error occurred while fetching active organizers"
    );
  }
}
