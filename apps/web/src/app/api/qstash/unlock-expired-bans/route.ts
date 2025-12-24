import { NextResponse } from "next/server";
import { unlockExpiredUser } from "@vieticket/services";
import { verifySignatureAppRouter } from "@vieticket/queues/nextjs";

function nonRetryable(message: string, status = 489) {
  console.error("[qstash] unlock error:", message);
  return new Response(message, {
    status,
    headers: {
      "Upstash-NonRetryable-Error": "true",
    },
  });
}

async function handler(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return nonRetryable("Invalid JSON body.");
  }

  const userId =
    typeof body === "object" && body !== null && "userId" in body
      ? String((body as { userId: unknown }).userId ?? "")
      : "";

  if (!userId) {
    return nonRetryable("Missing userId.");
  }

  try {
    const result = await unlockExpiredUser(userId);
    
    if (!result.success) {
      // Log but don't retry - these are expected conditions
      console.log(`[qstash] unlock skipped for user ${userId}: ${result.message}`);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    // Do not leak internal errors in responses.
    console.error("[qstash] unlock execution failed", error);
    return new Response("Internal error", { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
