import { db } from "@/lib/db";
import { user } from "@vieticket/db/pg/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";

/**
 * API route to unlock users with expired bans
 * 
 * This endpoint can be called:
 * 1. Automatically via Vercel Cron (configured in vercel.json)
 * 2. Manually by admin from the UI
 * 3. Via scheduled fetch from client side (fallback)
 * 
 * The endpoint runs every 10 minutes to check for expired bans.
 * 
 * Security: If CRON_SECRET is set in environment variables,
 * the endpoint will require authorization header for cron calls.
 */
export async function POST(request: Request) {
  try {
    // Optional: Check for authorization token if calling from cron
    // Vercel Cron automatically adds Authorization header with CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set and request has Authorization header (from cron),
    // verify it matches. Manual calls from admin pages won't have this header.
    if (cronSecret && authHeader) {
      // This is a cron call, verify the secret
      if (authHeader !== `Bearer ${cronSecret}`) {
        return Response.json(
          {
            success: false,
            error: "Unauthorized",
            message: "Invalid authorization token",
          },
          { status: 401 }
        );
      }
    }
    // If no Authorization header, allow the call (manual/admin calls)

    console.log("Checking for expired bans...");

    const now = new Date();

    // Find users with expired bans
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
      console.log("No expired bans found");
      return Response.json({
        success: true,
        message: "No expired bans found",
        unlockedCount: 0,
      });
    }

    console.log(`Found ${expiredUsers.length} users with expired bans`);

    // Unlock users with expired bans
    const unlockedUsers = [];
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

      console.log(`Unlocked user: ${expiredUser.email} (${expiredUser.id})`);
      unlockedUsers.push({
        id: expiredUser.id,
        email: expiredUser.email,
      });
    }

    console.log("Successfully processed expired bans");

    return Response.json({
      success: true,
      message: `Successfully unlocked ${unlockedUsers.length} user(s)`,
      unlockedCount: unlockedUsers.length,
      unlockedUsers,
    });
  } catch (error) {
    console.error("Error processing expired bans:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to process expired bans",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: Request) {
  return POST(request);
}

