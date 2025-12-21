import { Client } from "@upstash/qstash";
import type { PublishRequest } from "@upstash/qstash";

export type QstashPublishResult =
  | { queued: true; messageId: string; deduplicated?: boolean; url: string }
  | { queued: false; reason: string; kind: "config_missing" | "publish_failed" };

export type PublishJsonToUrlRequest<TBody> = Extract<PublishRequest<TBody>, { url: string }>;

let client: Client | null = null;
function getClient() {
  if (!client) client = new Client();
  return client;
}

export async function publishJson<TBody>(
  request: PublishJsonToUrlRequest<TBody>
): Promise<QstashPublishResult> {
  if (!process.env.QSTASH_TOKEN) {
    return {
      queued: false,
      reason: "QSTASH_TOKEN is not set.",
      kind: "config_missing",
    };
  }

  const url = typeof request.url === "string" ? request.url.trim() : "";
  if (!url) {
    return {
      queued: false,
      reason: "QStash publish url is required.",
      kind: "config_missing",
    };
  }

  try {
    const result = await getClient().publishJSON({ ...request, url });

    return {
      queued: true,
      url: result.url ?? url,
      messageId: result.messageId,
      deduplicated: result.deduplicated,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Failed to publish";
    return { queued: false, kind: "publish_failed", reason };
  }
}
