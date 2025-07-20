// app/api/categories/route.ts
import { db } from "@/lib/db";
import { events } from "@vieticket/db/pg/schemas/events";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export async function GET() {
  const result = await db
    .selectDistinct({ type: events.type })
    .from(events)
    .where(sql`${events.type} IS NOT NULL`);

  const categories = result.map((item) => ({
    label: item.type,
    value: item.type.toLowerCase(),
  }));

  return NextResponse.json(categories);
}
