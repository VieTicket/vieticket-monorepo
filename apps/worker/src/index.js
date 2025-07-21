import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { user } from "@vieticket/db/pg/schema";

// Database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function unlockExpiredBans() {
  try {
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
      return;
    }

    console.log(`Found ${expiredUsers.length} users with expired bans`);

    // Unlock users with expired bans
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
    }

    console.log("Successfully processed expired bans");
  } catch (error) {
    console.error("Error processing expired bans:", error);
  }
}

const INTERVAL_MS = 10 * 60 * 1000;

console.log("Starting user ban expiration worker...");
console.log(`Will check for expired bans every ${INTERVAL_MS / 1000} seconds`);

// Run immediately on startup
unlockExpiredBans();

// Then run on interval
setInterval(unlockExpiredBans, INTERVAL_MS);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down worker...");
  client.end();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down worker...");
  client.end();
  process.exit(0);
});
