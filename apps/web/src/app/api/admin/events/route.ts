import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { events, user } from "@vieticket/db/pg/schema";
import { desc, eq } from "drizzle-orm";

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

    // Transform to match the expected interface
    const transformedEvents = allEvents.map((event) => ({
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
      approvalStatus: event.approvalStatus || "pending", // Ensure we have a default value
      image_url: event.posterUrl || "",
      category: event.type || "General",
    }));

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
