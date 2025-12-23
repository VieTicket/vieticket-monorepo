import { db } from "@vieticket/db/pg";
import { payoutRequests } from "@vieticket/db/pg/schemas/payout-requests";
import { events } from "@vieticket/db/pg/schemas/events";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { PaginationParams } from "./types";

const CACHE_TTL_SECONDS = 3600;

type PayoutFilters = PaginationParams & {
  status?: PayoutStatus;
  search?: string;
};

function buildBaseConditions(options: {
  organizerId?: string;
  status?: PayoutStatus;
  search?: string;
}) {
  const conditions = [];
  if (options.organizerId) {
    conditions.push(eq(payoutRequests.organizerId, options.organizerId));
  }
  if (options.status) {
    conditions.push(eq(payoutRequests.status, options.status));
  }
  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(ilike(events.name, pattern));
  }
  return conditions;
}

export async function createPayoutRequest(data: {
    eventId: string;
    organizerId: string;
    requestedAmount: number;
}) {
    const [request] = await db
        .insert(payoutRequests)
        .values({
            eventId: data.eventId,
            organizerId: data.organizerId,
            requestedAmount: data.requestedAmount,
        })
        .returning();

    return request;
}

export async function findPayoutRequestById(id: string) {
    return db.query.payoutRequests.findFirst({
        where: eq(payoutRequests.id, id),
        with: {
            event: {
                columns: {
                    id: true,
                    name: true,
                    startTime: true,
                    endTime: true
                }
            }
        }
    });
}

export async function findPayoutRequestsByEventId(eventId: string) {
    return db.query.payoutRequests.findMany({
        where: eq(payoutRequests.eventId, eventId),
    });
}

export async function findPayoutRequestsByOrganizerId(
    organizerId: string,
    pagination: PayoutFilters = { offset: 0, limit: 10 }
) {
    const { offset, limit, status, search } = pagination;
    const conditions = buildBaseConditions({ organizerId, status, search }).filter(Boolean);
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseRowsQuery = db
        .select({
            payout: payoutRequests,
            event: {
                id: events.id,
                name: events.name,
                startTime: events.startTime,
                endTime: events.endTime,
            },
        })
        .from(payoutRequests)
        .leftJoin(events, eq(payoutRequests.eventId, events.id));

    const rows = await (whereClause ? baseRowsQuery.where(whereClause) : baseRowsQuery)
        .orderBy(desc(payoutRequests.requestDate))
        .offset(offset)
        .limit(limit)
        .$withCache({
          tag: `payout_requests:organizer:${organizerId}:list:offset_${offset}:limit_${limit}:status_${status ?? "all"}:search_${search ?? ""}`,
          config: { ex: CACHE_TTL_SECONDS },
        });

    return rows.map(({ payout, event }) => ({
        ...payout,
        event,
    }));
}

export async function updatePayoutRequest(
    id: string,
    data: {
        status?: PayoutStatus;
        agreedAmount?: number;
        proofDocumentUrl?: string;
    }
) {
    const [request] = await db
        .update(payoutRequests)
        .set(data)
        .where(eq(payoutRequests.id, id))
        .returning();

    return request;
}

export async function countPayoutRequestsByOrganizerId(
    organizerId: string,
    pagination: PayoutFilters = { offset: 0, limit: 10 }
) {
    const { status, search } = pagination;
    const conditions = buildBaseConditions({ organizerId, status, search }).filter(Boolean);
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseCountQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(payoutRequests)
        .leftJoin(events, eq(payoutRequests.eventId, events.id));

    const [result] = await (whereClause ? baseCountQuery.where(whereClause) : baseCountQuery)
      .$withCache({
        tag: `payout_requests:organizer:${organizerId}:count:status_${status ?? "all"}:search_${search ?? ""}`,
        config: { ex: CACHE_TTL_SECONDS },
      });

    return result.count;
}

export async function deletePayoutRequest(id: string) {
    await db.delete(payoutRequests).where(eq(payoutRequests.id, id));
}

export async function hasActivePayoutRequestForEvent(eventId: string): Promise<boolean> {
    const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(payoutRequests)
        .where(
            and(
                eq(payoutRequests.eventId, eventId),
                sql`payout_requests.status NOT IN ('cancelled', 'rejected')`
            )
        )
        .$withCache({
          tag: `payout_requests:event:${eventId}:has_active`,
          config: { ex: CACHE_TTL_SECONDS },
        });
    return result.count > 0;
}

export async function getPayoutRequestsForAdmin(
  pagination: PayoutFilters = { offset: 0, limit: 10 }
): Promise<{
  data: any[];
  totalCount: number;
  totalPages: number;
}> {
  const { offset, limit, status, search } = pagination;
  const conditions = buildBaseConditions({ status, search }).filter(Boolean);
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseRowsQuery = db
    .select({
      payout: payoutRequests,
      event: {
        id: events.id,
        name: events.name,
        startTime: events.startTime,
        endTime: events.endTime,
      },
    })
    .from(payoutRequests)
    .leftJoin(events, eq(payoutRequests.eventId, events.id));

  const rows = await (whereClause ? baseRowsQuery.where(whereClause) : baseRowsQuery)
    .orderBy(desc(payoutRequests.requestDate))
    .offset(offset)
    .limit(limit)
    .$withCache({
      tag: `payout_requests:admin:list:offset_${offset}:limit_${limit}:status_${status ?? "all"}:search_${search ?? ""}`,
      config: { ex: CACHE_TTL_SECONDS },
    });

  const baseCountQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(payoutRequests)
    .leftJoin(events, eq(payoutRequests.eventId, events.id));

  const [countResult] = await (whereClause ? baseCountQuery.where(whereClause) : baseCountQuery)
    .$withCache({
      tag: `payout_requests:admin:count:status_${status ?? "all"}:search_${search ?? ""}`,
      config: { ex: CACHE_TTL_SECONDS },
    });

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / pagination.limit);

  return {
    data: rows.map(({ payout, event }) => ({ ...payout, event })),
    totalCount,
    totalPages,
  };
}
