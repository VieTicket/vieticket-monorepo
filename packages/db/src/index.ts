import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema"
import { Pool } from "@neondatabase/serverless";

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });

  return drizzle(pool, {
    schema: { ...schema },
  });
}

export * from "./schema"