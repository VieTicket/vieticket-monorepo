import { NextRequest, NextResponse } from "next/server";
import { 
  getTicketTypeRevenueByEvent, 
  getTotalAvailableSeatsByEvent 
} from "@/lib/queries/organizer-dashboard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Get tickets sold and total available tickets
    const [ticketTypeRevenue, totalAvailableTickets] = await Promise.all([
      getTicketTypeRevenueByEvent(eventId),
      getTotalAvailableSeatsByEvent(eventId),
    ]);

    // Calculate total tickets sold
    const totalTicketsSold = ticketTypeRevenue.reduce(
      (sum, item) => sum + (item.ticketsSold || 0),
      0
    );

    // Calculate ticket sale rate (percentage)
    const ticketSaleRate = totalAvailableTickets > 0
      ? (totalTicketsSold / totalAvailableTickets) * 100
      : 0;

    return NextResponse.json({
      success: true,
      ticketSaleRate: Math.min(100, Math.max(0, ticketSaleRate)), // Ensure 0-100%
      totalTicketsSold,
      totalAvailableTickets,
    });
  } catch (error) {
    console.error("Error fetching ticket sale rate:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket sale rate" },
      { status: 500 }
    );
  }
}

