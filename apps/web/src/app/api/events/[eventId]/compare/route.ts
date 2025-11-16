import { NextRequest, NextResponse } from "next/server";
import { fetchEventById } from "@/lib/services/eventService";
import { authorise } from "@/lib/auth/authorise";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Check authentication
    await authorise();

    const { eventId } = await params;
    const { compareEventId } = await request.json();

    if (!compareEventId) {
      return NextResponse.json(
        { error: "Compare event ID is required" },
        { status: 400 }
      );
    }

    // Fetch both events
    const [currentEvent, compareEvent] = await Promise.all([
      fetchEventById(eventId),
      fetchEventById(compareEventId),
    ]);

    // Perform comparison
    const comparison = compareEvents(currentEvent, compareEvent);

    return NextResponse.json({
      success: true,
      comparison,
      events: {
        current: {
          id: currentEvent.id,
          name: currentEvent.name,
          location: currentEvent.location,
          type: currentEvent.type,
          organizer: currentEvent.organizer,
          areas: currentEvent.areas,
        },
        compare: {
          id: compareEvent.id,
          name: compareEvent.name,
          location: compareEvent.location,
          type: compareEvent.type,
          organizer: compareEvent.organizer,
          areas: compareEvent.areas,
        },
      },
    });
  } catch (error) {
    console.error("Error comparing events:", error);
    return NextResponse.json(
      { error: "Failed to compare events" },
      { status: 500 }
    );
  }
}

function compareEvents(event1: any, event2: any) {
  // Price comparison
  const event1Prices = event1.areas.map((area: any) => Number(area.price));
  const event2Prices = event2.areas.map((area: any) => Number(area.price));
  
  const event1Min = Math.min(...event1Prices);
  const event1Max = Math.max(...event1Prices);
  const event1Avg = event1Prices.reduce((a: number, b: number) => a + b, 0) / event1Prices.length;
  
  const event2Min = Math.min(...event2Prices);
  const event2Max = Math.max(...event2Prices);
  const event2Avg = event2Prices.reduce((a: number, b: number) => a + b, 0) / event2Prices.length;

  const priceWinner = event1Avg < event2Avg ? "event1" : event2Avg < event1Avg ? "event2" : "tie";
  const priceDifference = Math.abs(event1Avg - event2Avg);

  // Location comparison
  const locationWinner = event1.location && event2.location ? "tie" : 
    event1.location ? "event1" : event2.location ? "event2" : "tie";

  // Organizer comparison
  const organizerWinner = event1.organizer && event2.organizer ? "tie" : 
    event1.organizer ? "event1" : event2.organizer ? "event2" : "tie";

  // Category comparison
  const categoryWinner = event1.type && event2.type ? "tie" : 
    event1.type ? "event1" : event2.type ? "event2" : "tie";

  // Overall winner calculation
  let event1Score = 0;
  let event2Score = 0;

  if (priceWinner === "event1") event1Score++;
  else if (priceWinner === "event2") event2Score++;

  if (locationWinner === "event1") event1Score++;
  else if (locationWinner === "event2") event2Score++;

  if (organizerWinner === "event1") event1Score++;
  else if (organizerWinner === "event2") event2Score++;

  if (categoryWinner === "event1") event1Score++;
  else if (categoryWinner === "event2") event2Score++;

  const overallWinner = event1Score > event2Score ? "event1" : 
    event2Score > event1Score ? "event2" : "tie";

  return {
    priceComparison: {
      event1: { min: event1Min, max: event1Max, avg: event1Avg },
      event2: { min: event2Min, max: event2Max, avg: event2Avg },
      winner: priceWinner,
      difference: priceDifference,
    },
    locationComparison: {
      event1: event1.location || "Không có thông tin",
      event2: event2.location || "Không có thông tin",
      winner: locationWinner,
    },
    organizerComparison: {
      event1: {
        name: event1.organizer?.name || "Không có thông tin",
        type: event1.organizer?.organizerType || "Không có thông tin",
      },
      event2: {
        name: event2.organizer?.name || "Không có thông tin",
        type: event2.organizer?.organizerType || "Không có thông tin",
      },
      winner: organizerWinner,
    },
    categoryComparison: {
      event1: event1.type || "Không có thông tin",
      event2: event2.type || "Không có thông tin",
      winner: categoryWinner,
    },
    overallWinner,
    comparisonScore: {
      event1: event1Score,
      event2: event2Score,
    },
  };
}
