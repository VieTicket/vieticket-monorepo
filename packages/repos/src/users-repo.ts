import { eq } from "drizzle-orm";
import { db } from "@vieticket/db/postgres"
import { organizers, user, type OrganizerProfileData, type UserProfileData } from "@vieticket/db/postgres/schema";

export async function getOrganizerById(id: string) {
    return db.query.organizers.findFirst({
        where: eq(organizers.id, id),
    });
};

export async function getUserById(id: string) {
    return db.query.user.findFirst({
        where: eq(user.id, id),
    });
};

export async function getUserWithOptionalOrganizerById(id: string) {
    const userData = await db.query.user.findFirst({
        where: eq(user.id, id),
    });

    if (!userData) {
        return null;
    }

    // Only fetch organizer data if user is an organizer
    let organizerData = null;
    if (userData.role === "organizer") {
        organizerData = await db.query.organizers.findFirst({
            where: eq(organizers.id, id),
        });
    }

    return {
        ...userData,
        organizer: organizerData,
    };
};

/**
 * Updates the user and optionally the organizer profile within a single database transaction.
 * @param userId - The ID of the user to update.
 * @param userData - An object containing user fields to update.
 * @param organizerData - An object containing organizer fields to update.
 * @param dbInstance - The Drizzle database instance or a transaction instance.
 */
export async function updateUserAndOrganizerProfile(
    userId: string,
    userData: UserProfileData,
    organizerData?: OrganizerProfileData,
) {
    return db.transaction(async (tx) => {
        // Update user profile if data is provided
        userData.updatedAt = new Date();
        if (Object.keys(userData).length > 0) {
            await tx.update(user).set(userData).where(eq(user.id, userId));
        }

        // If organizer data is provided, update the corresponding organizer profile
        if (organizerData && Object.keys(organizerData).length > 0) {
            await tx
                .update(organizers)
                .set(organizerData)
                .where(eq(organizers.id, userId));
        }
    })
}