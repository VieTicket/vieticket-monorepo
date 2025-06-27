import {
  getRevenueOverTime,
  getRevenueDistributionByEvent,
  getTopRevenueEvents,
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
};
