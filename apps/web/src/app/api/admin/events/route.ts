import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { events, user, showings } from "@vieticket/db/pg/schema";
import { desc, eq, inArray } from "drizzle-orm";

export async function GET() {
  try {
    // Check admin authorization
    await authorise("admin");

    // Fetch all events with organizer information
    const allEvents = await db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        posterUrl: events.posterUrl,
        type: events.type,
        approvalStatus: events.approvalStatus,
        organizer: {
          name: user.name,
          email: user.email,
        },
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .leftJoin(user, eq(events.organizerId, user.id))
      .orderBy(desc(events.createdAt));

    // Fetch showings for all events
    const eventIds = allEvents.map((e) => e.id);
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

    // Transform to match the expected interface
    const transformedEvents = allEvents.map((event) => {
      const eventShowings = showingsByEventId.get(event.id) || [];
      return {
        id: event.id,
        title: event.name,
        description: event.description || "",
        location: event.location || "",
        start_date: event.startTime.toISOString(),
        end_date: event.endTime.toISOString(),
        price: 0, // You might want to calculate this from areas
        capacity: 0, // You might want to calculate this from seats
        organizer_name: event.organizer?.name || "Unknown",
        organizer_email: event.organizer?.email || "",
        created_at: event.createdAt?.toISOString() || "",
        approvalStatus: event.approvalStatus,
        image_url: event.posterUrl || "",
        category: event.type || "General",
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
    console.error("Error fetching events:", error);

    if (error instanceof Error && error.message.includes("No valid session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
