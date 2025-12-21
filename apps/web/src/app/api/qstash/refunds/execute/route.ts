import { NextResponse } from "next/server";
import { executeRefund } from "@vieticket/services/refund";
import { verifySignatureAppRouter } from "@vieticket/queues/nextjs";

function nonRetryable(message: string, status = 489) {
  console.error("[qstash] refund error:", message);
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

  const refundId =
    typeof body === "object" && body !== null && "refundId" in body
      ? String((body as { refundId: unknown }).refundId ?? "")
      : "";

  if (!refundId) {
    return nonRetryable("Missing refundId.");
  }

  try {
    await executeRefund({ id: "system", role: "admin" } as any, refundId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Idempotency / already-processed cases: acknowledge so QStash does not retry.
    if (error instanceof Error && error.message === "Refund is not ready for execution.") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (error instanceof Error && error.message === "Refund not found") {
      return nonRetryable("Refund not found");
    }

    // Do not leak internal errors in responses.
    console.error("[qstash] refund execution failed", error);
    return new Response("Internal error", { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
