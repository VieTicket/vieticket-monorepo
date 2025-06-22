import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, user, organizers, orders } from "@vieticket/db/postgres/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET() {
  try {
    // Get current date and last month date for comparison
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    // 1. Count approved events
    const approvedEventsCount = await db
      .select({ count: events.id })
      .from(events)
      .where(eq(events.isApproved, true));

    // 2. Count all users (accounts)
    const totalUsersCount = await db
      .select({ count: user.id })
      .from(user);

    // 3. Count all organizers
    const totalOrganizersCount = await db
      .select({ count: organizers.id })
      .from(organizers);

    // 4. Calculate total revenue from paid orders
    const totalRevenue = await db
      .select({ 
        total: orders.totalAmount 
      })
      .from(orders)
      .where(eq(orders.status, 'paid'));

    // 5. Calculate revenue for current month
    const currentMonthRevenue = await db
      .select({ 
        total: orders.totalAmount 
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'paid'),
          gte(orders.orderDate, new Date(now.getFullYear(), now.getMonth(), 1)),
          lte(orders.orderDate, now)
        )
      );

    // 6. Calculate revenue for last month
    const lastMonthRevenue = await db
      .select({ 
        total: orders.totalAmount 
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'paid'),
          gte(orders.orderDate, new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)),
          lte(orders.orderDate, lastMonth)
        )
      );

    // Calculate revenue change percentage
    const currentMonthTotal = currentMonthRevenue.reduce((sum, row) => sum + Number(row.total), 0);
    const lastMonthTotal = lastMonthRevenue.reduce((sum, row) => sum + Number(row.total), 0);
    const revenueChange = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    // For now, we'll use placeholder values for events and organizers change
    // You can implement similar logic for these metrics if needed
    const eventsChange = 0; // Placeholder
    const organizersChange = 0; // Placeholder
    const usersChange = 0; // Placeholder

    const stats = {
      totalRevenue: totalRevenue.reduce((sum, row) => sum + Number(row.total), 0),
      ongoingEvents: approvedEventsCount.length,
      activeOrganizers: totalOrganizersCount.length,
      allUsers: totalUsersCount.length,
      revenueChange: Math.round(revenueChange * 10) / 10, // Round to 1 decimal place
      eventsChange,
      organizersChange,
      usersChange
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin statistics" },
      { status: 500 }
    );
  }
} 