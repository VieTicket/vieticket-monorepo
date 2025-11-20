import { NextResponse } from "next/server";
import { getOrganizerAverageRating } from "@vieticket/repos/ratings";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ organizerId: string }> }
) {
  try {
    const { organizerId } = await params;
    
    if (!organizerId) {
      return NextResponse.json({ error: "Organizer ID is required" }, { status: 400 });
    }

    const rating = await getOrganizerAverageRating(organizerId);
    
    return NextResponse.json({ rating });
  } catch (error) {
    console.error("Error fetching organizer rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizer rating" }, 
      { status: 500 }
    );
  }
}