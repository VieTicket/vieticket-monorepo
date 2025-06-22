import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, organizers } from "@vieticket/db/postgres/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch all events with organizer info
    const allEvents = await db
      .select({
        id: events.id,
        title: events.name,
        description: events.description,
        location: events.location,
        start_date: events.startTime,
        end_date: events.endTime,
        price: events.posterUrl, // Using posterUrl as placeholder, will need areas table for actual pricing
        capacity: events.views, // Using views as placeholder, will need areas/seats for actual capacity
        organizer_name: organizers.name,
        organizer_email: organizers.id, // Will need to join with user table for email
        created_at: events.createdAt,
        is_approved: events.isApproved,
        image_url: events.posterUrl,
        category: events.type,
      })
      .from(events)
      .leftJoin(organizers, eq(events.organizerId, organizers.id))
      .orderBy(events.createdAt);

    return NextResponse.json(allEvents);
  } catch (error) {
    console.error("Error fetching all events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
} 