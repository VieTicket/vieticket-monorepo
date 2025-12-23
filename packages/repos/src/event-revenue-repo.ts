import { db } from "@vieticket/db/pg";
import { orders, refunds } from "@vieticket/db/pg/schemas/orders";
import { and, eq, inArray, sql } from "drizzle-orm";

const CACHE_TTL_SECONDS = 3600;

export async function getEventRevenue(eventId: string): Promise<number> {
  const refundsByOrder = db
    .select({
      orderId: refunds.orderId,
      totalRefunded: sql<number>`COALESCE(SUM(${refunds.amount}), 0)`.as(
        "totalRefunded"
      ),
    })
    .from(refunds)
    .innerJoin(orders, eq(refunds.orderId, orders.id))
    .where(
      and(
        eq(orders.eventId, eventId),
        inArray(orders.status, ["paid", "partial_refunded", "refunded"]),
        eq(refunds.status, "refunded")
      )
    )
    .groupBy(refunds.orderId)
    .as("refund_sums");

  const [row] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orders.totalAmount} - COALESCE(${refundsByOrder.totalRefunded}, 0)), 0)`,
    })
    .from(orders)
    .leftJoin(refundsByOrder, eq(refundsByOrder.orderId, orders.id))
    .where(
      and(
        eq(orders.eventId, eventId),
        inArray(orders.status, ["paid", "partial_refunded", "refunded"])
      )
    )
    .$withCache({
      tag: `event:${eventId}:revenue_total`,
      config: { ex: CACHE_TTL_SECONDS },
    });

  return Number(row?.total ?? 0);
}
