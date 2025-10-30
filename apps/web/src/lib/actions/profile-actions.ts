"use server";

import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  getFullUserProfile,
  updateProfile,
  updateAvatarUrl,
} from "@vieticket/services/profile";
import { GENDER_VALUES, organizers } from "@vieticket/db/pg/schema";
import { db } from "@vieticket/db/pg";
import { eq, or } from "drizzle-orm";
import { user as userSchema } from "@vieticket/db/pg/schema";

// Schema for user details from the form
// TODO: Create it own validator package
const UserProfileSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." }),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER_VALUES).optional(),
  phone: z.string().optional(),
});

// Schema for organizer details from the form
const OrganizerProfileSchema = z.object({
  organizerName: z
    .string()
    .min(2, { message: "Organizer name must be at least 2 characters." }),
  website: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  foundedDate: z.string().optional(),
  organizerType: z.string().optional(),
});

// Combined schema for the entire form data
const UpdateProfileFormSchema = UserProfileSchema.extend({
  organizerDetails: OrganizerProfileSchema.optional(),
});

type UpdateProfileFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined> | null;
};

export async function updateProfileAction(
  formData: unknown
): Promise<UpdateProfileFormState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized: You must be logged in." };
  }
  const validationResult = UpdateProfileFormSchema.safeParse(formData);
  if (!validationResult.success) {
    return {
      success: false,
      message: "Invalid data. Please check the form.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { organizerDetails, ...userData } = validationResult.data;

  // Map form field names to database column names for the organizer
  const organizerData = organizerDetails
    ? {
        name: organizerDetails.organizerName,
        website: organizerDetails.website || null,
        address: organizerDetails.address || null,
        foundedDate: organizerDetails.foundedDate
          ? new Date(organizerDetails.foundedDate)
          : null,
        organizerType: organizerDetails.organizerType || null,
      }
    : undefined;

  const result = await updateProfile(session.user.id, userData, organizerData);

  if (result.success) {
    // Invalidate cache for the profile page to reflect changes
    revalidatePath("/profile/account");
  }

  return result;
}

export async function getProfileAction() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to access profile.");
    }

    // Get user data
    const userData = await db.query.user.findFirst({
      where: eq(userSchema.id, user.id),
    });

    if (!userData) {
      throw new Error("User not found");
    }

    // Get organizer data separately if user is an organizer
    let organizerData = null;
    if (user.role === "organizer") {
      organizerData = await db.query.organizers.findFirst({
        where: eq(organizers.id, user.id),
      });
    }
    console.log("User data:", organizerData);

    // Transform the data to include organizer fields properly
    const profileData = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      dateOfBirth: userData.dateOfBirth,
      gender: userData.gender,
      phone: userData.phone,
      image: userData.image,
      banned: userData.banned,
      banReason: userData.banReason,
      organizer: organizerData
        ? {
            name: organizerData.name,
            website: organizerData.website,
            address: organizerData.address,
            foundedDate: organizerData.foundedDate,
            organizerType: organizerData.organizerType,
            isActive: organizerData.isActive,
            rejectionReason: organizerData.rejectionReason,
            rejectionSeen: organizerData.rejectionSeen,
            rejectedAt: organizerData.rejectedAt,
          }
        : null,
    };

    return { success: true, data: profileData };
  } catch (error) {
    console.error("Error in getProfileAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function uploadAvatarAction(imageUrl: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return { success: false, message: "Unauthorized: You must be logged in." };
  }
  // Validate URL (basic check)
  if (!/^https:\/\/res\.cloudinary\.com\//.test(imageUrl)) {
    return { success: false, message: "Invalid image URL." };
  }
  const result = await updateAvatarUrl(session.user.id, imageUrl);
  if (result.success) {
    revalidatePath("/profile/account");
  }
  return result;
}
