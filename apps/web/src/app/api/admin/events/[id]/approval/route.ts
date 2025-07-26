import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@vieticket/db/pg/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const awaitParams = await params;
    const { is_approved } = await request.json();
    const eventId = awaitParams.id;

    // Update the event approval status
    await db
      .update(events)
      .set({ approvalStatus: is_approved ? "approved" : "rejected" })
      .where(eq(events.id, eventId));

    return NextResponse.json({
      success: true,
      message: `Event ${is_approved ? "approved" : "rejected"} successfully`,
    });
  } catch (error) {
    console.error("Error updating event approval:", error);
    return NextResponse.json(
      { error: "Failed to update event approval status" },
      { status: 500 }
    );
  }
}
