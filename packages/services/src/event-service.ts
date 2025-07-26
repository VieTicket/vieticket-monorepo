import { findEndedEventsByOrganizerId } from "@vieticket/repos/events";

export async function getOrganizerEndedEvents(organizerId: string) {
  return findEndedEventsByOrganizerId(organizerId);
}