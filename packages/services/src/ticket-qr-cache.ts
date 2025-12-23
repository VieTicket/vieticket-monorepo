import { generateTicketQRData } from "@vieticket/utils/ticket-validation/server";
import { get, set } from "@vieticket/redis";

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Generates or retrieves cached QR data for a ticket.
 * Caches for 5 minutes to reduce Ed25519 signing overhead.
 */
export async function getCachedTicketQRData(
  ticketId: string,
  visitorName: string,
  eventId: string,
  seat: string,
  row: string,
  area: string
): Promise<string> {
  const cacheKey = `ticket-qr:${ticketId}`;

  // Try to get from cache
  const cached = await get(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate new QR data
  const qrData = generateTicketQRData(
    ticketId,
    visitorName,
    eventId,
    seat,
    row,
    area
  );

  // Cache for 5 minutes (best-effort, don't throw on cache failure)
  try {
    await set(cacheKey, qrData, CACHE_TTL_SECONDS);
  } catch (error) {
    console.error(`Failed to cache QR data for ticket ${ticketId}:`, error);
  }

  return qrData;
}
