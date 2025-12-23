import { db } from "@/lib/db";
import { events, orders, user } from "@vieticket/db/pg/schema";
import { eq, and, gte, count, sum } from "drizzle-orm";
import { authorise } from "@/lib/auth/authorise";
import { NextResponse } from "next/server";

const CACHE_TTL_SECONDS = 3600;
const LONG_CACHE_TTL_SECONDS = 86400;

export async function GET() {
  try {
    // Add authentication check
    await authorise("admin");

    console.log("Fetching admin stats...");
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total revenue
    const revenueResult = await db
      .select({
        total: sum(orders.totalAmount),
      })
      .from(orders)
      .where(eq(orders.status, "paid"))
      .$withCache({
        tag: "admin:stats:revenue_total",
        config: { ex: CACHE_TTL_SECONDS },
      });

    const totalRevenue = Number(revenueResult[0]?.total || 0);

    // Get ongoing events
    const ongoingEventsResult = await db
      .select({
        count: count(),
      })
      .from(events)
      .where(eq(events.approvalStatus, "approved"))
      .$withCache({
        tag: "admin:stats:approved_events_count",
        config: { ex: LONG_CACHE_TTL_SECONDS },
      });

    const ongoingEvents = ongoingEventsResult[0]?.count || 0;

    // Get active organizers
    const organizersResult = await db
      .select({
        count: count(),
      })
      .from(user)
      .where(eq(user.role, "organizer"))
      .$withCache({
        tag: "admin:stats:organizers_count",
        config: { ex: LONG_CACHE_TTL_SECONDS },
      });

    const activeOrganizers = organizersResult[0]?.count || 0;

    // Get all users
    const usersResult = await db
      .select({
        count: count(),
      })
      .from(user)
      .$withCache({
        tag: "admin:stats:users_count",
        config: { ex: LONG_CACHE_TTL_SECONDS },
      });

    const allUsers = usersResult[0]?.count || 0;

    // Calculate changes (simplified - you can implement proper month-over-month calculations)
    const stats = {
      totalRevenue,
      ongoingEvents,
      activeOrganizers,
      allUsers,
      revenueChange: 12, // Mock data - implement actual calculation
      eventsChange: 8, // Mock data - implement actual calculation
      organizersChange: 5, // Mock data - implement actual calculation
      usersChange: 15, // Mock data - implement actual calculation
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);

    if (error instanceof Error && error.message.includes("No valid session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
