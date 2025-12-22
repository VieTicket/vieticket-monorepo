import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@vieticket/queues/nextjs";
import { revalidateOrderPayment } from "@vieticket/services/checkout";

function nonRetryable(message: string, status = 489) {
  console.error("[qstash] order revalidate error:", message);
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

  const orderId =
    typeof body === "object" && body !== null && "orderId" in body
      ? String((body as { orderId: unknown }).orderId ?? "")
      : "";

  if (!orderId) {
    return nonRetryable("Missing orderId.");
  }

  try {
    const result = await revalidateOrderPayment(orderId);

    if (!result.ok) {
      if (result.reason === "Order not found") return nonRetryable("Order not found");
      if (result.reason.startsWith("Missing ") || result.reason === "Unsupported payment provider") {
        return nonRetryable(result.reason);
      }

      console.error("[qstash] order payment revalidation failed:", result.reason);
      return new Response("Internal error", { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[qstash] order payment revalidation failed", error);
    return new Response("Internal error", { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
