"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  getPendingOrganizers,
  approveOrganizerApplication,
  rejectOrganizerApplication,
  getActiveOrganizers,
} from "@vieticket/services/organizer";
import { headers as headersFn } from "next/headers";

export async function getPendingOrganizersAction() {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    const pendingOrganizers = await getPendingOrganizers(user);

    // Force the objects to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(pendingOrganizers));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in getPendingOrganizersAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function approveOrganizerAction(userId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    const approvedOrganizer = await approveOrganizerApplication(userId, user);

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(approvedOrganizer));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in approveOrganizerAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function rejectOrganizerAction(userId: string, reason: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    const rejectedOrganizer = await rejectOrganizerApplication(
      userId,
      reason,
      user
    );

    // Force the object to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(rejectedOrganizer));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in rejectOrganizerAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function getAllActiveOrganizersAction() {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in.");
    }

    const activeOrganizers = await getActiveOrganizers(user);

    // Force the objects to be plain and serializable
    const plainData = JSON.parse(JSON.stringify(activeOrganizers));

    return { success: true, data: plainData };
  } catch (error) {
    console.error("Error in getAllActiveOrganizersAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
