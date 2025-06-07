import { createDb } from "@vieticket/db";
import { profiles } from "@vieticket/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const db = createDb(process.env.DATABASE_URL);