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
// Fetch doanh thu theo thời gian cho một sự kiện
export async function fetchRevenueOverTimeByEventId(eventId: string) {
  return await organizerDashBoardService.getRevenueOverTimeByEvent(eventId);
}

// Fetch phân bổ doanh thu theo sự kiện (chỉ một sự kiện thì trả về 1 phần tử)
export async function fetchRevenueDistributionByEventId(eventId: string) {
  return await organizerDashBoardService.getRevenueDistributionForSingleEvent(
    eventId
  );
}

// Fetch tổng số vé bán được
export async function fetchTotalTicketsSoldForEventByEventId(eventId: string) {
  const data =
    await organizerDashBoardService.getTotalTicketsSoldForEvent(eventId);
  console.log(data);
  return data;
}

// Fetch tổng số vé
export async function fetchTotalTicketsSByEventId(eventId: string) {
  const data = await organizerDashBoardService.getTotalTicket(eventId);
  console.log(data);
  return data;
}

export async function fetchOrdersByEvent(eventId: string) {
  const data = await organizerDashBoardService.getOrdersByEvent(eventId);
  console.log(data);
  return data;
}
