// app/api/events/route.ts
import { db } from "@/lib/db";
import { events } from "@vieticket/db/pg/schemas/events";
import { NextResponse } from "next/server";
import { sql, and, ilike, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "6");
  const offset = (page - 1) * limit;

  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const location = searchParams.get("location");
  const price = searchParams.get("price");
  const date = searchParams.get("date");

  const where = [];

  if (q) {
    where.push(sql`to_tsvector('simple', ${events.name}) @@ plainto_tsquery('simple', ${q})`);
  }

  if (category && category !== "all") {
    where.push(ilike(events.type, `%${category}%`));
  }

  if (location && location !== "all") {
    where.push(ilike(events.location, `%${location}%`));
  }

  if (price && price !== "all") {
    const rangeMap: Record<string, [number, number]> = {
      "lt500k": [0, 500000],
      "500k-1m": [500000, 1000000],
      "1m-3m": [1000000, 3000000],
      "3m-5m": [3000000, 5000000],
      "gt5m": [5000000, Number.MAX_SAFE_INTEGER],
    };
    const [min, max] = rangeMap[price] ?? [0, Number.MAX_SAFE_INTEGER];
    where.push(gte(events.typicalTicketPrice, min));
    if (max !== Number.MAX_SAFE_INTEGER) {
      where.push(lte(events.typicalTicketPrice, max));
    }
  }

  if (date && date !== "all") {
    const now = new Date();
    const startTime = events.start_time;
    if (date === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      where.push(and(gte(startTime, start), lte(startTime, end)));
    } else if (date === "thisWeek") {
      const endOfWeek = new Date();
      endOfWeek.setDate(now.getDate() + 7);
      where.push(and(gte(startTime, now), lte(startTime, endOfWeek)));
    }
  }

  const result = await db
    .select()
    .from(events)
    .where(where.length ? and(...where) : undefined)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(result);
}
