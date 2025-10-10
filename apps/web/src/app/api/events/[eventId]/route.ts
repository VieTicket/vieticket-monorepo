import { NextRequest, NextResponse } from "next/server";
import { fetchEventById } from "@/lib/services/eventService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    
    const event = await fetchEventById(eventId);
    
    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404 }
    );
  }
}
