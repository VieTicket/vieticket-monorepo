import { NextResponse } from "next/server";
import { executeRefund } from "@vieticket/services/refund";

function nonRetryable(message: string, status = 489) {
  return new Response(message, {
    status,
    headers: {
      "Upstash-NonRetryable-Error": "true",
    },
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.QSTASH_REFUND_CALLBACK_SECRET;
  if (!expectedSecret) {
    return nonRetryable("QSTASH_REFUND_CALLBACK_SECRET is not configured.");
  }

  const providedSecret = request.headers.get("x-vieticket-qstash-secret");
  if (providedSecret !== expectedSecret) {
    return nonRetryable("Unauthorized", 401);
  }

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
    const message = error instanceof Error ? error.message : "Unexpected error";

    // Idempotency / already-processed cases: acknowledge so QStash does not retry.
    if (message === "Refund is not ready for execution.") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (message === "Refund not found") {
      return nonRetryable(message);
    }

    // Let QStash retry transient failures.
    return new Response(message, { status: 500 });
  }
}
