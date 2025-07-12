import type { Config } from 'drizzle-kit';
import { config } from "dotenv";

config({path: '.env'})

export default {
  dialect: 'postgresql',
  schema: ['./src/postgres/schema.ts',],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || ''
  },
} satisfies Config;
