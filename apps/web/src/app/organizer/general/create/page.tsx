import { DashboardOverview } from "./DashboardOverview";
import {
  fetchOrdersByEvent,
  fetchRevenueOverTimeByEventId,
  fetchTotalTicketsSByEventId,
  fetchTotalTicketsSoldForEventByEventId,
  fetchEventRatingSummary,
} from "@/app/organizer/actions";

// ví dụ lấy eventId từ query
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const eventId = (await searchParams).id;

  const revenueOverTime = await fetchRevenueOverTimeByEventId(eventId);
  const ticketTypeRevenue =
    await fetchTotalTicketsSoldForEventByEventId(eventId);
  const totalTicket = await fetchTotalTicketsSByEventId(eventId);
  const totalOrder = await fetchOrdersByEvent(eventId);
  const ratingSummary = await fetchEventRatingSummary(eventId);

  return (
    <div className="p-4">
      <DashboardOverview
        eventId={eventId}
        revenueOverTime={revenueOverTime}
        ticketTypeRevenue={ticketTypeRevenue}
        totalAvailableTickets={totalTicket}
        recentTransactions={totalOrder}
        ratingSummary={ratingSummary}
      />
    </div>
  );
}
