import { getEventsByStatus } from "@/lib/services/eventService";

export async function fetchEventsByStatus(organizerId: string) {
  return await getEventsByStatus(organizerId);
}
