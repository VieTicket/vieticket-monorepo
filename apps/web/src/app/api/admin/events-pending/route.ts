import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, organizers } from "@vieticket/db/postgres/schema";
import { isNull, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch events where is_approved is null (pending approval) with organizer info
    const pendingEvents = await db
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
      .where(isNull(events.isApproved))
      .orderBy(events.createdAt);

    return NextResponse.json(pendingEvents);
  } catch (error) {
    console.error("Error fetching pending events:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending events" },
      { status: 500 }
    );
  }
} 