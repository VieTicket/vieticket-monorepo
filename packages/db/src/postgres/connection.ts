import { drizzle, NeonDatabase } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

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

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Please provide it in your .env file or via the configureDb function.",
    );
  }

  const pool = new Pool({ connectionString });

  const instance = drizzle(pool, {
    schema,
  });

  // Cache the instance in the global object for subsequent calls if it's the default one.
  if (!url) {
    globalForDb.drizzle = instance;
  }

  return instance;
}

/**
 * @deprecated This function is deprecated. Prefer using the auto-inferred `db` instance 
 * or `configureDb()` for custom connections.
 * 
 * Creates a new Drizzle ORM database client using the provided connection string.
 * 
 * This function initializes a new Neon serverless connection pool with the given 
 * `connectionString`, and wraps it with Drizzle ORM, applying the provided schema.
 * 
 * Note: In modern usage, it is recommended to use the auto-inferred `db` instance 
 * (which reads `DATABASE_URL` from the environment) or the `configureDb(url)` function 
 * for cases where a custom connection is needed.
 * 
 * @param {string} connectionString - The full PostgreSQL connection string.
 * @returns {DbClient} A new Drizzle database client.
 */
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, {
    schema: { ...schema },
  });
}