import { getEventsByOrganizer } from "@/lib/services/eventService";

import { organizerDashBoardService } from "@/lib/services/organizerDashBoardService";

export async function fetchRevenueOverTime(organizerId: string) {
  return await organizerDashBoardService.getRevenueOverTime(organizerId);
}

export async function fetchRevenueDistribution(organizerId: string) {
  return await organizerDashBoardService.getRevenueDistributionByEvent(
    organizerId
  );
}

export async function fetchTopRevenueEvents(organizerId: string, limit = 5) {
  return await organizerDashBoardService.getTopRevenueEvents(
    organizerId,
    limit
  );
}
// export async function fetchEventsByStatus(organizerId: string) {
//   return await getEventsByStatus(organizerId);
// }
export async function fetchEventsByOrganizer(organizerId: string) {
  return await getEventsByOrganizer(organizerId);
}
