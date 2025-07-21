import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, orders } from "@vieticket/db/pg/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { authorise } from "@/lib/auth/authorise";
import { headers } from "next/headers";

export async function GET() {
  try {
    // Add authentication check
    await authorise("admin");

    console.log("Fetching chart data...");
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString("en-US", { month: "short" }),
      });
    }

    // Fetch revenue data for each month
    const revenueData = await Promise.all(
      months.map(async ({ year, month }) => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const result = await db
          .select({
            total: orders.totalAmount,
          })
          .from(orders)
          .where(
            and(
              eq(orders.status, "paid"),
              gte(orders.orderDate, startDate),
              lte(orders.orderDate, endDate)
            )
          );

        return result.reduce((sum, row) => sum + Number(row.total), 0);
      })
    );

    // Fetch events data for each month
    const eventsData = await Promise.all(
      months.map(async ({ year, month }) => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const result = await db
          .select({
            count: events.id,
          })
          .from(events)
          .where(
            and(
              eq(events.approvalStatus, "approved"),
              gte(events.createdAt, startDate),
              lte(events.createdAt, endDate)
            )
          );

        return result.length;
      })
    );

    const chartData = {
      revenue: {
        labels: months.map((m) => m.label),
        data: revenueData,
      },
      events: {
        labels: months.map((m) => m.label),
        data: eventsData,
      },
    };

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching chart data:", error);

    if (error instanceof Error && error.message.includes("No valid session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
