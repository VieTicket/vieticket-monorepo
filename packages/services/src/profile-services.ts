import { Organizer, User } from "@vieticket/db/schemas/users";
import { getUserWithOptionalOrganizerById, updateUserAndOrganizerProfile } from "@vieticket/repos/users"

type UserProfileData = Partial<Omit<User, "id">>;
type OrganizerProfileData = Partial<Omit<Organizer, "id" | "userId">>;

/**
 * Orchestrates the update of a user's profile.
 * @param userId - The ID of the user to update.
 * @param userData - The user profile data.
 * @param organizerData - The organizer profile data, if applicable.
 * @returns An object indicating the operation's success or failure.
 */
export async function updateProfile(
    userId: string,
    userData: UserProfileData,
    organizerData?: OrganizerProfileData
) {
    try {
        await updateUserAndOrganizerProfile(userId, userData, organizerData);
        return {
            success: true,
            message: "Profile updated successfully!",
        };
    } catch (error) {
        console.error("Error updating profile:", error);
        return {
            success: false,
            message: "Failed to update profile. Please try again.",
        };
    }
}

export async function getFullUserProfile(userId: string) {
    try {
        const userWithOptionalOrganizer = await getUserWithOptionalOrganizerById(userId);
        return {
            success: true,
            data: userWithOptionalOrganizer,
        };
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return {
            success: false,
            message: "Failed to fetch profile data.",
            data: null,
        };
    }
}

export async function updateAvatarUrl(userId: string, imageUrl: string) {
    try {
        // TODO: Validate that the URL is valid, and contains an image
        await updateUserAndOrganizerProfile(userId, { image: imageUrl });
        return { success: true, message: "Avatar updated successfully!" };
    } catch (error) {
        console.error("Error updating avatar:", error);
        return { success: false, message: "Failed to update avatar." };
    }
}