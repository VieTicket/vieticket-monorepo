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
    const { approval_status } = await request.json();
    const eventId = awaitParams.id;

    // Validate approval status
    if (!approval_status || !["approved", "rejected"].includes(approval_status)) {
      return NextResponse.json(
        { error: "Invalid approval status. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Update the event approval status
    await db
      .update(events)
      .set({ approvalStatus: approval_status })
      .where(eq(events.id, eventId));

    return NextResponse.json({
      success: true,
      message: `Event ${approval_status} successfully`,
    });
  } catch (error) {
    console.error("Error updating event approval:", error);
    return NextResponse.json(
      { error: "Failed to update event approval status" },
      { status: 500 }
    );
  }
}
