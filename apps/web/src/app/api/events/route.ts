import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@vieticket/db/pg/schemas/events";
import { areas } from "@vieticket/db/pg/schema";
import { and, eq, sql } from "drizzle-orm";


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "6");
  const price = searchParams.get("price");
  
  const whereConditions = [eq(events.approvalStatus, 'approved')];

  // Add price filtering with proper JOIN
  if (price && price !== 'all') {
    const priceRanges: Record<string, [number, number]> = {
      'lt500k': [0, 500000],
      '500k-1m': [500000, 1000000],
      '1m-3m': [1000000, 3000000],
      '3m-5m': [3000000, 5000000],
      'gt5m': [5000000, Infinity]
    };

    const [minPrice, maxPrice] = priceRanges[price] || [0, Infinity];

    const result = await db
      .select({
        id: events.id,
        name: events.name,
        slug: events.slug,
        startTime: events.startTime,
        endTime: events.endTime,
        location: events.location,
        bannerUrl: events.bannerUrl,
        views: events.views,
        type: events.type,
      })
      .from(events)
      .innerJoin(areas, eq(events.id, areas.eventId))
      .where(
        and(
          ...whereConditions,
          sql`${areas.price} >= ${minPrice}`,
          maxPrice !== Infinity ? sql`${areas.price} <= ${maxPrice}` : undefined
        )
      )
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      events: result,
      page,
      hasMore: result.length === limit
    });
  }

  // If no price filter, use regular query
  const result = await db
    .select()
    .from(events)
    .where(and(...whereConditions))
    .limit(limit)
    .offset((page - 1) * limit);

  return NextResponse.json({
    events: result,
    page,
    hasMore: result.length === limit
  });
}