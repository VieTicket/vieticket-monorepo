"use server";

import { getEventsByOrganizer } from "@/lib/services/eventService";
import { getAuthSession } from "@/lib/auth/auth";
import { headers } from "next/headers";

export async function fetchCurrentOrganizerEvents() {
  const session = await getAuthSession(await headers());

  if (!session?.user) {
    throw new Error("Unauthorized: Please log in");
  }

  if (session.user.role !== "organizer") {
    throw new Error("Forbidden: Only organizers can access this");
  }

  return await getEventsByOrganizer(session.user.id);
}
