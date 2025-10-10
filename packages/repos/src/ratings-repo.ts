import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@vieticket/db/pg";
import { eventRatings, events, tickets, orders } from "@vieticket/db/pg/schema";

export async function hasUserPurchasedEvent(userId: string, eventId: string) {
  // Has any ticket for seats under this event's areas
  const existsRes = await db.execute<{ exists: boolean }>(sql`
    select exists (
      select 1
      from tickets t
      join orders o on o.id = t.order_id and o.user_id = ${userId} and o.status in ('paid', 'refunded')
      join seats s on s.id = t.seat_id
      join rows rw on rw.id = s.row_id
      join areas ar on ar.id = rw.area_id
      where ar.event_id = ${eventId}
    ) as exists;
  `);
  const existsRow = (existsRes as any).rows?.[0] as { exists: boolean } | undefined;
  return !!existsRow?.exists;
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
  // Upsert (nếu bảng đã có unique constraint (event_id, user_id) có thể dùng on conflict)
  const existing = await db.query.eventRatings.findFirst({
    where: (er, { and, eq }) => and(eq(er.userId, userId), eq(er.eventId, eventId)),
  });

  if (existing) {
    await db
      .update(eventRatings)
      .set({ stars, comment })
      .where(eq(eventRatings.id, existing.id));
  } else {
    await db.insert(eventRatings).values({ userId, eventId, stars, comment });
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


