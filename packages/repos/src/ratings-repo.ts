import { and, desc, eq, lt, sql, count, avg, inArray } from "drizzle-orm";
import { db } from "@vieticket/db/pg";
import { eventRatings, events, tickets, orders, user } from "@vieticket/db/pg/schema";
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
  try {
    console.log("Getting rating summary for eventId:", eventId);
    
    // Use Drizzle ORM instead of raw SQL
    const result = await db
      .select({
        average: avg(eventRatings.stars),
        count: count(eventRatings.id),
      })
      .from(eventRatings)
      .where(eq(eventRatings.eventId, eventId));
    
    const row = result[0];
    const summary = { 
      average: Number(row?.average ?? 0), 
      count: Number(row?.count ?? 0) 
    };
    
    console.log("Rating summary result:", summary);
    return summary;
  } catch (error) {
    console.error("Error getting rating summary:", error);
    return { average: 0, count: 0 };
  }
}

export async function getOrganizerAverageRating(organizerId: string) {
  try {
    // Get all events by this organizer
    const organizerEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    if (organizerEvents.length === 0) {
      return { average: 0, count: 0 };
    }

    const eventIds = organizerEvents.map(e => e.id);

    if (eventIds.length === 0) {
      return { average: 0, count: 0 };
    }

    // Calculate average rating across all events
    const result = await db
      .select({
        average: sql<number>`COALESCE(AVG(${eventRatings.stars}), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(eventRatings)
      .where(inArray(eventRatings.eventId, eventIds));

    const stats = result[0];
    
    if (!stats) {
      return { average: 0, count: 0 };
    }
    
    const average = stats.average !== null && stats.average !== undefined 
      ? Number(stats.average) 
      : 0;
    
    return {
      average: average > 0 ? Number(average.toFixed(1)) : 0,
      count: Number(stats.count) || 0
    };
  } catch (error) {
    console.error("Error getting organizer average rating:", error);
    return { average: 0, count: 0 };
  }
}

export async function listEventRatings(eventId: string, limit = 10) {
  const rows = await db
    .select({
      id: eventRatings.id,
      eventId: eventRatings.eventId,
      userId: eventRatings.userId,
      stars: eventRatings.stars,
      comment: eventRatings.comment,
      createdAt: eventRatings.createdAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(eventRatings)
    .leftJoin(user, eq(eventRatings.userId, user.id))
    .where(eq(eventRatings.eventId, eventId))
    .orderBy(desc(eventRatings.createdAt))
    .limit(limit);
  return rows;
}

export async function getUserEventRating(userId: string, eventId: string) {
  const row = await db
    .select({
      id: eventRatings.id,
      eventId: eventRatings.eventId,
      userId: eventRatings.userId,
      stars: eventRatings.stars,
      comment: eventRatings.comment,
      createdAt: eventRatings.createdAt,
    })
    .from(eventRatings)
    .where(and(eq(eventRatings.userId, userId), eq(eventRatings.eventId, eventId)))
    .limit(1);
  
  return row[0] || null;
}


