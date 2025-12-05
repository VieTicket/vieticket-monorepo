"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  markOrganizerRejectionAsSeen,
} from "@vieticket/services/organizer";
import { headers as headersFn } from "next/headers";

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
