import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Reuse the same typed Drizzle client as other connections in this package
export type DbClient = NeonHttpDatabase<typeof schema>;

// Ensure a single instance across hot-reloads (Next.js / serverless friendly)
const globalForDirectDb = globalThis as unknown as {
  drizzleHttp: DbClient | undefined;
};

/**
 * The primary, ready-to-use Drizzle instance using the neon-http driver.
 * It will read DATABASE_URL and optional DATABASE_AUTH_TOKEN from env when
 * no explicit URL/token is provided.
 */
export const db: DbClient = globalForDirectDb.drizzleHttp ?? createDbInstance();

/**
 * Create a new Drizzle instance with the neon-http driver. Useful for tests
 * or when you need to connect to a non-default database.
 */
export function configureDb(url: string): DbClient {
  return createDbInstance(url);
}

function createDbInstance(url?: string): DbClient {
  const connectionString = url ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Please provide it in your .env file or via the configureDb function.",
    );
  }

  // For the neon-http driver Drizzle accepts a connection string (or a
  // NeonQueryFunction). We pass the connection string here and rely on
  // db.$withAuth(token) for per-request auth when needed.
  const instance = drizzle(connectionString, { schema });

  // Cache the instance globally when using the default env-derived URL
  if (!url) {
    globalForDirectDb.drizzleHttp = instance;
  }

  return instance;
}
