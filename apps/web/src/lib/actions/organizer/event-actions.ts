"use server"

import { getOrganizerEndedEvents } from "@vieticket/services/event";
import { getAuthSession } from "@/lib/auth/auth";
import { headers } from "next/headers";

export async function getOrganizerEvents() {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    throw new Error("Unauthorized: Please log in");
  }

  return getOrganizerEndedEvents(session.user.id);
}