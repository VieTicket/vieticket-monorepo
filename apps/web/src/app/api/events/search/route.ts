import { NextResponse } from "next/server";
import { getFilteredEvents } from "@/lib/queries/events";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "10");

  if (!q.trim()) {
    return NextResponse.json({ events: [] });
  }

  try {
    const result = await getFilteredEvents({
      page: 1,
      limit,
      price: "all",
      date: "all", 
      location: "all",
      category: "all",
      q,
    });

    return NextResponse.json({
      events: result.events || [],
      hasMore: result.hasMore || false,
    });
  } catch (error) {
    console.error("Error searching events:", error);
    return NextResponse.json(
      { error: "Failed to search events" },
      { status: 500 }
    );
  }
}
