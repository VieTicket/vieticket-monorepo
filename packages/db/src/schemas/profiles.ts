import {
  pgTable,
  date,
  timestamp,
  varchar,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { genderEnum, roleEnum } from "./../enums";

// TODO: change to profile
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  dob: date("dob"),
  gender: genderEnum("gender"),
  role: roleEnum("role").default("unassigned"),
  email: varchar("email", { length: 100 }).unique().notNull(),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizers = pgTable("organizers", {
  id: uuid("id")
    .primaryKey()
    .references(() => profiles.id),
  foundedDate: date("founded_date"),
  website: varchar("website", { length: 255 }),
  isActive: boolean("is_active").default(true),
  address: varchar("address", { length: 255 }),
  organizerType: varchar("organizer_type", { length: 64 }),
});
