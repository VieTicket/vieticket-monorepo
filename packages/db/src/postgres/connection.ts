import { drizzle, NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";
import { upstashCache } from "drizzle-orm/cache/upstash";

// Define a type for our Drizzle client with the schema
export type DbClient = NeonDatabase<typeof schema>;

// Use globalThis to ensure a single instance is used across hot reloads in development.
// This is a robust pattern for database connections in a Next.js/serverless environment.
const globalForDb = globalThis as unknown as {
  drizzle: DbClient | undefined;
};

/**
 * The primary, ready-to-use Drizzle instance.
 * It automatically infers the DATABASE_URL from the environment.
 */
export const db: DbClient = globalForDb.drizzle ?? createDbInstance();

/**
 * Configuration function to create a new Drizzle instance, overriding the
 * default environment variable. This is useful for specific scenarios like
 * connecting to a different test database.
 *
 * @param {string} url - The full database connection string.
 * @returns {DbClient} A new Drizzle instance.
 */
export function configureDb(url: string): DbClient {
  return createDbInstance(url);
}

/**
 * The core function that creates the database instance.
 * It can be called with a specific URL or will fall back to the environment variable.
 */
function createDbInstance(url?: string): DbClient {
  const connectionString = url ?? process.env.DATABASE_URL;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const missing = [
    !connectionString && "DATABASE_URL",
    !redisUrl && "UPSTASH_REDIS_REST_URL",
    !redisToken && "UPSTASH_REDIS_REST_TOKEN",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }

  const pool = new Pool({ connectionString: connectionString! });

  const instance = drizzle(pool, {
    cache: upstashCache({ url: redisUrl!, token: redisToken! }),
    schema,
  });

  // Cache the instance in the global object for subsequent calls if it's the default one.
  if (!url) {
    globalForDb.drizzle = instance;
  }

  return instance;
}
