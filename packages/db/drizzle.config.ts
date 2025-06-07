import type { Config } from 'drizzle-kit';
import { config } from "dotenv";

config({path: '.env.local'})

export default {
  dialect: 'postgresql',
  schema: ['./src/schema.ts',],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || ''
  },
} satisfies Config;