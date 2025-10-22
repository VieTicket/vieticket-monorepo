import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/auth";
import { submitEventRating } from "@vieticket/services";
import { getEventRatingSummary, listEventRatings, getUserEventRating } from "@vieticket/repos/ratings";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  console.log("Fetching ratings for eventId:", eventId);
  
  // Try to get current user's session
  let userRating = null;
  try {
    const session = await getAuthSession(req.headers as any);
    if (session?.user?.id) {
      userRating = await getUserEventRating(session.user.id, eventId);
    }
  } catch (error) {
    console.log("No authenticated user or error getting user rating:", error);
  }
  
  const [summary, recent] = await Promise.all([
    getEventRatingSummary(eventId),
    listEventRatings(eventId, 10),
  ]);
  console.log("Rating summary:", summary);
  console.log("Recent ratings count:", recent.length);
  console.log("User rating:", userRating);
  return NextResponse.json({ summary, recent, userRating });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getAuthSession(req.headers as any);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
const body = await req.json();
  const stars = Number(body?.stars);
  const comment: string | undefined = body?.comment;
  console.log("Received rating:", { stars, comment });
  try {
    const summary = await submitEventRating(session.user.id, eventId, stars, comment);
    return NextResponse.json({ success: true, summary });
  } catch (e: any) {
    // log full error server-side for debugging
    console.error("POST /api/events/[eventId]/ratings error:", e);
    return NextResponse.json({ success: false, error: e?.message ?? "Error" }, { status: 500 });
  }
}


