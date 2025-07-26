import { db } from "@vieticket/db/pg";
import { payoutRequests } from "@vieticket/db/pg/schemas/payout-requests";
import { and, eq, sql } from "drizzle-orm";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { PaginationParams } from "./types";

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
    pagination: PaginationParams = { offset: 0, limit: 10 }
) {
    return db.query.payoutRequests.findMany({
        where: eq(payoutRequests.organizerId, organizerId),
        offset: pagination.offset,
        limit: pagination.limit,
        orderBy: (payoutRequests, { desc }) => [desc(payoutRequests.requestDate)],
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

export async function countPayoutRequestsByOrganizerId(organizerId: string) {
    const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(payoutRequests)
        .where(eq(payoutRequests.organizerId, organizerId));

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
        );
    return result.count > 0;
}

export async function getPayoutRequestsForAdmin(
  pagination: PaginationParams & { status?: PayoutStatus } = { offset: 0, limit: 10 }
): Promise<{
  data: any[];
  totalCount: number;
  totalPages: number;
}> {
  const whereClause = pagination.status
    ? eq(payoutRequests.status, pagination.status)
    : undefined;

  const data = await db.query.payoutRequests.findMany({
    offset: pagination.offset,
    limit: pagination.limit,
    ...(whereClause ? { where: whereClause } : {}),
    orderBy: (payoutRequests, { desc }) => [desc(payoutRequests.requestDate)],
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

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(payoutRequests);

  const [result] = whereClause
    ? await countQuery.where(whereClause)
    : await countQuery;

  const totalCount = result.count;
  const totalPages = Math.ceil(totalCount / pagination.limit);

  return {
    data,
    totalCount,
    totalPages,
  };
}
