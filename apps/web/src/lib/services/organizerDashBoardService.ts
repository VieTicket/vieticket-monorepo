import {
  getRevenueOverTime,
  getRevenueDistributionByEvent,
  getTopRevenueEvents,
  getRevenueOverTimeByEvent,
  getRevenueDistributionForSingleEvent,
  getTicketTypeRevenueByEvent,
  getTotalAvailableSeatsByEvent,
  getOrdersByEvent,
} from "@/lib/queries/organizer-dashboard";

export const organizerDashBoardService = {
  async getRevenueOverTime(organizerId: string) {
    return await getRevenueOverTime(organizerId);
  },

  async getRevenueDistributionByEvent(organizerId: string) {
    return await getRevenueDistributionByEvent(organizerId);
  },

  async getTopRevenueEvents(organizerId: string, limit = 5) {
    return await getTopRevenueEvents(organizerId, limit);
  },
  async getRevenueOverTimeByEvent(eventId: string) {
    return await getRevenueOverTimeByEvent(eventId);
  },

  async getRevenueDistributionForSingleEvent(eventId: string) {
    return await getRevenueDistributionForSingleEvent(eventId);
  },
  async getTotalTicketsSoldForEvent(eventId: string) {
    return await getTicketTypeRevenueByEvent(eventId);
  },
  async getTotalTicket(eventId: string) {
    return await getTotalAvailableSeatsByEvent(eventId);
  },
  async getOrdersByEvent(eventId: string) {
    return await getOrdersByEvent(eventId);
  },
};
