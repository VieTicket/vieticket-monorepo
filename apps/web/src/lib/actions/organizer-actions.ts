"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  createOrganizerProfile,
  markOrganizerRejectionAsSeen,
} from "@vieticket/services/organizer";
import { headers as headersFn } from "next/headers";
import { User } from "@vieticket/db/pg/models/users";

export async function createOrganizerAction(userData?: any) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    if (user.role !== "organizer") {
      throw new Error(
        "Unauthorized: Only organizers can create organizer profiles."
      );
    }

    const organizer = await createOrganizerProfile(user as User);

    return { success: true, data: organizer };
  } catch (error) {
    console.error("Error in createOrganizerAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function markRejectionAsSeenAction() {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    const updatedOrganizer = await markOrganizerRejectionAsSeen(user);

    return { success: true, data: updatedOrganizer };
  } catch (error) {
    console.error("Error in markRejectionAsSeenAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
