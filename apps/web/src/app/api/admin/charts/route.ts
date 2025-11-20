import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, orders } from "@vieticket/db/pg/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { authorise } from "@/lib/auth/authorise";
import { headers } from "next/headers";

/**
 * Helper function to generate date ranges based on start and end dates
 * Returns either daily or monthly ranges based on the time span
 */
function generateDateRanges(startDate: Date, endDate: Date) {
  const ranges: Array<{
    start: Date;
    end: Date;
    label: string;
  }> = [];

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If range is less than 90 days, group by day
  // Otherwise, group by month
  const groupByDay = diffDays <= 90;

  if (groupByDay) {
    // Group by day
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      ranges.push({
        start: dayStart,
        end: dayEnd > endDate ? endDate : dayEnd,
        label: currentDate.toLocaleDateString("vi-VN", { 
          day: "2-digit", 
          month: "short" 
        }),
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    // Group by month
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      ranges.push({
        start: monthStart < startDate ? startDate : monthStart,
        end: monthEnd > endDate ? endDate : monthEnd,
        label: currentDate.toLocaleDateString("vi-VN", { 
          month: "short", 
          year: "numeric" 
        }),
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return ranges;
}

export async function GET(request: Request) {
  try {
    // Add authentication check
    await authorise("admin");

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Default to last 6 months if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    defaultStartDate.setHours(0, 0, 0, 0);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    defaultEndDate.setHours(23, 59, 59, 999);

    // Parse dates from query params (they come in YYYY-MM-DD format)
    let startDate: Date;
    let endDate: Date;
    
    if (startDateParam) {
      const [year, month, day] = startDateParam.split("-").map(Number);
      startDate = new Date(year, month - 1, day);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = defaultStartDate;
    }
    
    if (endDateParam) {
      const [year, month, day] = endDateParam.split("-").map(Number);
      endDate = new Date(year, month - 1, day);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = defaultEndDate;
    }

    // Validate dates
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Generate date ranges based on the time span
    const dateRanges = generateDateRanges(startDate, endDate);

    console.log("Fetching chart data from", startDate, "to", endDate);

    // Fetch revenue data for each range
    const revenueData = await Promise.all(
      dateRanges.map(async ({ start, end }) => {
        const result = await db
          .select({
            total: orders.totalAmount,
          })
          .from(orders)
          .where(
            and(
              eq(orders.status, "paid"),
              gte(orders.orderDate, start),
              lte(orders.orderDate, end)
            )
          );

        return result.reduce((sum, row) => sum + Number(row.total), 0);
      })
    );

    // Fetch events data for each range
    const eventsData = await Promise.all(
      dateRanges.map(async ({ start, end }) => {
        const result = await db
          .select({
            count: events.id,
          })
          .from(events)
          .where(
            and(
              eq(events.approvalStatus, "approved"),
              gte(events.createdAt, start),
              lte(events.createdAt, end)
            )
          );

        return result.length;
      })
    );

    const chartData = {
      revenue: {
        labels: dateRanges.map((r) => r.label),
        data: revenueData,
      },
      events: {
        labels: dateRanges.map((r) => r.label),
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
