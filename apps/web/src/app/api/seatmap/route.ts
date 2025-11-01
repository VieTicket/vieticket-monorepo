import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { findSeatMapWithShapesById } from "@vieticket/repos/seat-map";
import { getOrganizerById } from "@vieticket/repos/users";

/**
 * POST /api/seatmap
 * Returns: { seatMap, organizer }
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { seatMapId, userId } = data;
    console.log("Received seatMapId:", data);
    if (!seatMapId && !userId) {
      return NextResponse.json(
        { error: "seatMapId and userId query parameters are required" },
        { status: 400 }
      );
    }

    if (!seatMapId) {
      const organizer = await getOrganizerById(userId);

      if (!organizer) {
        return NextResponse.json(
          { error: "Organizer not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ organizer }, { status: 200 });
    }

    const [seatMap, organizer] = await Promise.all([
      findSeatMapWithShapesById(seatMapId),
      getOrganizerById(userId),
    ]);

    if (!seatMap) {
      return NextResponse.json(
        { error: "Seat map not found" },
        { status: 404 }
      );
    }

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ seatMap, organizer }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch seat map or organizer", message },
      { status: 500 }
    );
  }
}
