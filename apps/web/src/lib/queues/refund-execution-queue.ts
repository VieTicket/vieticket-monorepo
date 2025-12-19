import "server-only";

type QstashPublishResponse =
  | { messageId: string; deduplicated?: boolean }
  | { messageId?: string; error?: unknown };

export type EnqueueRefundExecutionResult =
  | { queued: true; messageId?: string; deduplicated?: boolean }
  | { queued: false; reason: string; kind: "config_missing" | "publish_failed" };

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function enqueueRefundExecution(
  refundId: string
): Promise<EnqueueRefundExecutionResult> {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    return {
      queued: false,
      reason: "QSTASH_TOKEN is not set.",
      kind: "config_missing",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return {
      queued: false,
      reason: "NEXT_PUBLIC_BASE_URL is not set.",
      kind: "config_missing",
    };
  }

  const callbackSecret = process.env.QSTASH_REFUND_CALLBACK_SECRET;
  if (!callbackSecret) {
    return {
      queued: false,
      reason: "QSTASH_REFUND_CALLBACK_SECRET is not set.",
      kind: "config_missing",
    };
  }

  const destination = `${normalizeBaseUrl(baseUrl)}/api/qstash/refunds/execute`;
  const publishUrl = `https://qstash.upstash.io/v2/publish/${destination}`;

  const res = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Forward-x-vieticket-qstash-secret": callbackSecret,
    },
    body: JSON.stringify({ refundId }),
  });

  let json: QstashPublishResponse | null = null;
  try {
    json = (await res.json()) as QstashPublishResponse;
  } catch {
    json = null;
  }

  if (!res.ok && res.status !== 202) {
    const details = json ? JSON.stringify(json) : await res.text().catch(() => "");
    return {
      queued: false,
      reason: `Failed to enqueue refund execution (status ${res.status}). ${details}`,
      kind: "publish_failed",
    };
  }

  return {
    queued: true,
    messageId: json && "messageId" in json ? json.messageId : undefined,
    deduplicated: json && "deduplicated" in json ? json.deduplicated : undefined,
  };
}
