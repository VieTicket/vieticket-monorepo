// File: apps/web/src/app/organizer/general/page.tsx (no "use client")

import { authorise } from "@/lib/auth/authorise";
import {
  fetchRevenueOverTime,
  fetchRevenueDistribution,
  fetchTopRevenueEvents,
} from "../actions";
import OrganizerDashboardModern from "./ClientDashboard";

export default async function OrganizerGeneralPage() {
  const session = await authorise("organizer");
  const organizerId = session.user.id;
  const [overTime, distribution, top] = await Promise.all([
    fetchRevenueOverTime(organizerId),
    fetchRevenueDistribution(organizerId),
    fetchTopRevenueEvents(organizerId),
  ]);

  return (
    <OrganizerDashboardModern
      revenueOverTime={overTime}
      revenueDistribution={distribution}
      topEvents={top}
    />
  );
}
