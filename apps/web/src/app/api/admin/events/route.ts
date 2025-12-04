import { NextResponse } from "next/server";
import { authorise } from "@/lib/auth/authorise";
import { db } from "@/lib/db";
import { events, user, showings, areas, rows, seats } from "@vieticket/db/pg/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { findSeatMapById } from "@vieticket/repos/seat-map";

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
        seatMapId: events.seatMapId,
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

    // Calculate capacity and price for each event
    // Get capacity (total seats) for each event
    const capacityResults = eventIds.length > 0
      ? await db
          .select({
            eventId: areas.eventId,
            totalSeats: sql<number>`COUNT(${seats.id})::int`,
          })
          .from(areas)
          .leftJoin(rows, eq(areas.id, rows.areaId))
          .leftJoin(seats, eq(rows.id, seats.rowId))
          .where(inArray(areas.eventId, eventIds))
          .groupBy(areas.eventId)
      : [];

    // Get price range (min and max) for each event
    const priceResults = eventIds.length > 0
      ? await db
          .select({
            eventId: areas.eventId,
            minPrice: sql<number>`MIN(${areas.price})::numeric`,
            maxPrice: sql<number>`MAX(${areas.price})::numeric`,
          })
          .from(areas)
          .where(inArray(areas.eventId, eventIds))
          .groupBy(areas.eventId)
      : [];

    // Create maps for quick lookup
    const capacityMap = new Map<string, number>();
    const priceMap = new Map<string, { min: number; max: number }>();
    
    capacityResults.forEach((result) => {
      capacityMap.set(result.eventId, Number(result.totalSeats) || 0);
    });
    
    priceResults.forEach((result) => {
      priceMap.set(result.eventId, {
        min: Number(result.minPrice) || 0,
        max: Number(result.maxPrice) || 0,
      });
    });

    // Fetch seatmap images for events that have seatMapId
    const seatMapImageMap = new Map<string, string>();
    const uniqueSeatMapIds = [...new Set(allEvents.map(e => e.seatMapId).filter((id): id is string => Boolean(id)))];
    
    for (const seatMapId of uniqueSeatMapIds) {
      try {
        const seatMap = await findSeatMapById(seatMapId);
        if (seatMap?.image) {
          seatMapImageMap.set(seatMapId, seatMap.image);
        }
      } catch (error) {
        console.error(`Error fetching seatmap ${seatMapId}:`, error);
        // Continue with other seatmaps even if one fails
      }
    }

    // Transform to match the expected interface
    const transformedEvents = allEvents.map((event) => {
      const eventShowings = showingsByEventId.get(event.id) || [];
      const eventCapacity = capacityMap.get(event.id) || 0;
      const eventPrice = priceMap.get(event.id);
      const seatMapImage = event.seatMapId ? seatMapImageMap.get(event.seatMapId) : null;
      
      return {
        id: event.id,
        title: event.name,
        description: event.description || "",
        location: event.location || "",
        start_date: event.startTime.toISOString(),
        end_date: event.endTime.toISOString(),
        price: eventPrice ? (eventPrice.min === eventPrice.max ? eventPrice.min : eventPrice.min) : 0,
        capacity: eventCapacity,
        priceRange: eventPrice ? (eventPrice.min === eventPrice.max ? null : { min: eventPrice.min, max: eventPrice.max }) : null,
        seatMapImage: seatMapImage || null,
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
