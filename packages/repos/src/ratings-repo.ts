import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@vieticket/db/pg";
import { eventRatings, events, tickets, orders } from "@vieticket/db/pg/schema";
import { randomUUID } from "crypto";

export async function hasUserPurchasedEvent(userId: string, eventId: string) {
  try {
    const existsRes = await db.execute<{ exists_result: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM tickets t
        JOIN orders o ON o.id = t.order_id
        JOIN seats s ON s.id = t.seat_id
        JOIN rows rw ON rw.id = s.row_id
        JOIN areas ar ON ar.id = rw.area_id
        WHERE o.user_id = ${userId}
          AND o.status IN ('paid', 'refunded')
          AND ar.event_id = ${eventId}
      ) AS exists_result;
    `);

    const existsRow = (existsRes as any).rows?.[0] as { exists_result?: boolean } | undefined;
    return !!existsRow?.exists_result;
  } catch (err) {
    console.error("hasUserPurchasedEvent error:", {
      userId,
      eventId,
      error: err && (err as any).message ? (err as any).message : err,
      stack: err && (err as any).stack ? (err as any).stack : undefined,
    });
    throw err;
  }
}

export async function isEventEnded(eventId: string) {
  const now = new Date();
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), lt(events.endTime, now)))
    .limit(1);
  return !!row;
}

export async function upsertEventRating(
  userId: string,
  eventId: string,
  stars: number,
  comment?: string
) {
  try {
    // Try to update an existing rating first
    const updateRes = await db.execute<{ id: string }>(sql`
      UPDATE ratings
      SET stars = ${stars}, comment = ${comment}, created_at = now()
      WHERE user_id = ${userId} AND event_id = ${eventId}
      RETURNING id;
    `);

    const updated = (updateRes as any).rows?.[0];
    if (updated) return;

    // If no existing row was updated, insert a new rating using server-generated UUID
    const id = randomUUID();
    await db.execute(sql`
      INSERT INTO ratings (id, user_id, event_id, stars, comment, created_at)
      VALUES (${id}, ${userId}, ${eventId}, ${stars}, ${comment}, now());
    `);
  } catch (err) {
    console.error("upsertEventRating error:", {
      userId,
      eventId,
      stars,
      comment,
      error: err && (err as any).message ? (err as any).message : err,
      stack: err && (err as any).stack ? (err as any).stack : undefined,
    });
    throw err;
  }
}

export async function getEventRatingSummary(eventId: string) {
  const sumRes = await db.execute<{
    avgStars: number | null;
    countRatings: number;
  }>(sql`
    select avg(stars)::float as avgStars, count(*) as countRatings
    from ratings
    where event_id = ${eventId}
  `);
  const row = (sumRes as any).rows?.[0] as { avgStars: number | null; countRatings: number } | undefined;
  return { average: row?.avgStars ?? 0, count: Number(row?.countRatings ?? 0) };
}

export async function getOrganizerAverageRating(organizerId: string) {
  const stat = await db.query.organizerRatingStats.findFirst({
    where: (s, { eq }) => eq(s.organizerId, organizerId),
  });
  if (!stat || stat.ratingsCount === 0) return 0;
  return stat.totalStars / stat.ratingsCount;
}

export async function listEventRatings(eventId: string, limit = 10) {
  const rows = await db
    .select()
    .from(eventRatings)
    .where(eq(eventRatings.eventId, eventId))
    .orderBy(desc(eventRatings.createdAt))
    .limit(limit);
  return rows;
}


