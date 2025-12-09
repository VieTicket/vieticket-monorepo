import { getEventRevenue } from "@vieticket/repos/event-revenue";
import { findEventById } from "@vieticket/repos/events";
import { User } from "@vieticket/db/pg/models/users";

export async function getEventRevenueService(
  eventId: string,
  user: Pick<User, 'id' | 'role'>
): Promise<number> {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can view event revenue");
  }

  const event = await findEventById(eventId);
  if (!event || event.organizerId !== user.id) {
    throw new Error("Event not found or you are not the organizer");
  }

  return getEventRevenue(eventId);
}

export async function getEventRevenueForAdminService(eventId: string): Promise<number> {
  // Admins can view any event revenue for payout validations
  return getEventRevenue(eventId);
}
