import { db } from "@vieticket/db/pg";
import { user } from "@vieticket/db/pg/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { cancelMessage, publishJson, type QstashPublishResult } from "@vieticket/queues";
import { redis } from "@vieticket/redis";

function resolveAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return (vercel.startsWith("http") ? vercel : `https://${vercel}`).replace(/\/+$/, "");
  }

  return null;
}

function resolveUnlockBanUrl() {
  const baseUrl = resolveAppBaseUrl();
  if (!baseUrl) return null;
  return `${baseUrl}/api/qstash/unlock-expired-bans`;
}

/**
 * Schedule a QStash job to unlock a user when their ban expires.
 * Stores the QStash message ID in Redis for later cancellation.
 */
export async function scheduleUserUnlock(
  userId: string,
  banExpiresAt: Date
): Promise<QstashPublishResult> {
  const url = resolveUnlockBanUrl();
  if (!url) {
    return {
      queued: false,
      kind: "config_missing",
      reason: "NEXT_PUBLIC_BASE_URL (or VERCEL_URL) is not set.",
    } satisfies QstashPublishResult;
  }

  const notBefore = Math.floor(banExpiresAt.getTime() / 1000);

  const result = await publishJson({
    url,
    body: { userId },
    notBefore,
    deduplicationId: `ban-unlock-${userId}`,
  });

  if (result.queued && result.messageId) {
    // Store message ID in Redis
    const redisKey = `ban:unlock:${userId}`;
    await redis.set(redisKey, result.messageId);
  }

  return result;
}

/**
 * Cancel a scheduled unlock job for a user (e.g., when admin manually unbans).
 */
export async function cancelScheduledUnlock(userId: string): Promise<void> {
  const redisKey = `ban:unlock:${userId}`;
  const messageId = await redis.get<string>(redisKey);

  if (!messageId) {
    // No scheduled unlock found
    return;
  }

  const result = await cancelMessage(messageId);
  if (!result.cancelled) {
    console.error(
      `[ban-service] Failed to cancel unlock message ${messageId} for user ${userId}: ${result.reason}`
    );
  }

  // Remove from Redis regardless of cancellation result
  await redis.del(redisKey);
}

/**
 * Clear the stored message ID from Redis after successful unlock.
 */
async function clearUnlockMessageId(userId: string): Promise<void> {
  const redisKey = `ban:unlock:${userId}`;
  await redis.del(redisKey);
}

/**
 * Unlock a specific user if their ban has expired.
 * Called by QStash at the scheduled time.
 */
export async function unlockExpiredUser(userId: string): Promise<{
  success: boolean;
  message: string;
  user?: { id: string; email: string | null };
}> {
  const now = new Date();

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!targetUser) {
    // User not found - clean up Redis and consider it a success
    await clearUnlockMessageId(userId);
    return {
      success: true,
      message: "User not found (may have been deleted)",
    };
  }

  // Check if user is still banned and ban has expired
  if (!targetUser.banned) {
    // Already unlocked - clean up Redis
    await clearUnlockMessageId(userId);
    return {
      success: true,
      message: "User is already unlocked",
      user: { id: targetUser.id, email: targetUser.email },
    };
  }

  if (!targetUser.banExpires) {
    // Permanent ban - don't unlock
    await clearUnlockMessageId(userId);
    return {
      success: false,
      message: "User has a permanent ban (no expiration set)",
    };
  }

  if (targetUser.banExpires > now) {
    // Ban hasn't expired yet - this shouldn't happen, but handle it
    return {
      success: false,
      message: `Ban has not expired yet (expires at ${targetUser.banExpires.toISOString()})`,
    };
  }

  // Unlock the user
  await db
    .update(user)
    .set({
      banned: false,
      banReason: null,
      banExpires: null,
      updatedAt: now,
    })
    .where(eq(user.id, userId));

  await clearUnlockMessageId(userId);

  console.log(`[ban-service] Unlocked user: ${targetUser.email} (${targetUser.id})`);

  return {
    success: true,
    message: "User successfully unlocked",
    user: { id: targetUser.id, email: targetUser.email },
  };
}

/**
 * Check and unlock all users with expired bans.
 * This can be used for batch processing or manual cleanup.
 */
export async function unlockAllExpiredUsers(): Promise<{
  success: boolean;
  message: string;
  unlockedCount: number;
  unlockedUsers: Array<{ id: string; email: string | null }>;
}> {
  const now = new Date();

  const expiredUsers = await db
    .select()
    .from(user)
    .where(
      and(
        eq(user.banned, true),
        isNotNull(user.banExpires),
        lt(user.banExpires, now)
      )
    );

  if (expiredUsers.length === 0) {
    return {
      success: true,
      message: "No expired bans found",
      unlockedCount: 0,
      unlockedUsers: [],
    };
  }

  console.log(`[ban-service] Found ${expiredUsers.length} users with expired bans`);

  const unlockedUsers: Array<{ id: string; email: string | null }> = [];

  for (const expiredUser of expiredUsers) {
    await db
      .update(user)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: now,
      })
      .where(eq(user.id, expiredUser.id));

    // Clean up Redis
    await clearUnlockMessageId(expiredUser.id);

    console.log(`[ban-service] Unlocked user: ${expiredUser.email} (${expiredUser.id})`);
    unlockedUsers.push({
      id: expiredUser.id,
      email: expiredUser.email,
    });
  }

  return {
    success: true,
    message: `Successfully unlocked ${unlockedUsers.length} user(s)`,
    unlockedCount: unlockedUsers.length,
    unlockedUsers,
  };
}
