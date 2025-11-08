"use server";

import { getAuthSession } from "@/lib/auth/auth";
import { deleteEvent } from "@/lib/queries/events-mutation";
import { findEventById } from "@vieticket/repos/events";
import { headers } from "next/headers";

export async function deleteEventAction(eventId: string) {
  try {
    const session = await getAuthSession(await headers());

    if (!session?.user) {
      throw new Error("Unauthorized: Please log in");
    }

    if (session.user.role !== "organizer") {
      throw new Error("Forbidden: Only organizers can delete events");
    }

    // Check if event exists and belongs to the organizer
    const event = await findEventById(eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.organizerId !== session.user.id) {
      throw new Error("Forbidden: You can only delete your own events");
    }

    // Check if event is approved - only allow deletion if not approved
    if (event.approvalStatus === "approved") {
      throw new Error("Cannot delete approved events");
    }

    // Delete the event
    await deleteEvent(eventId);

    return {
      success: true,
      message: "Event deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteEventAction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
