import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, organizers, showings } from "@vieticket/db/pg/schema";
import { isNull, eq, inArray } from "drizzle-orm";

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
        approvalStatus: events.approvalStatus,
        image_url: events.posterUrl,
        category: events.type,
      })
      .from(events)
      .leftJoin(organizers, eq(events.organizerId, organizers.id))
      .where(eq(events.approvalStatus, "pending"))
      .orderBy(events.createdAt);

    // Fetch showings for pending events
    const eventIds = pendingEvents.map((e) => e.id);
    const allShowings = eventIds.length > 0
      ? await db
          .select()
          .from(showings)
          .where(inArray(showings.eventId, eventIds))
      : [];

    // Group showings by eventId
    const showingsByEventId = new Map<string, typeof allShowings>();
    for (const showing of allShowings) {
      const eventId = showing.eventId;
      if (!showingsByEventId.has(eventId)) {
        showingsByEventId.set(eventId, []);
      }
      showingsByEventId.get(eventId)!.push(showing);
    }

    // Transform to include showings
    const transformedEvents = pendingEvents.map((event) => {
      const eventShowings = showingsByEventId.get(event.id) || [];
      return {
        ...event,
        showings: eventShowings.map((showing) => ({
          id: showing.id,
          name: showing.name || "",
          startTime: showing.startTime.toISOString(),
          endTime: showing.endTime.toISOString(),
          ticketSaleStart: showing.ticketSaleStart?.toISOString() || null,
          ticketSaleEnd: showing.ticketSaleEnd?.toISOString() || null,
          isActive: showing.isActive,
        })),
      };
    });

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching pending events:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending events" },
      { status: 500 }
    );
  }
}
