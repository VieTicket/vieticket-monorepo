import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { genderEnum, roleEnum } from "../enums";
import { type InferSelectModel } from "drizzle-orm";
import { relations } from "drizzle-orm";

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: genderEnum("gender"),
    phone: varchar("phone", { length: 20 }),
    image: text("image"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    role: roleEnum("role").notNull().default("customer"),
    banned: boolean("banned"),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (table) => [
    index("email_idx").on(table.email),
    // TODO: add role_idx and ban_idx if admin needs to query by role (`SELECT * FROM users WHERE role = '...'`)
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("user_id_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").$defaultFn(
      () => /* @__PURE__ */ new Date()
    ),
    updatedAt: timestamp("updated_at").$defaultFn(
      () => /* @__PURE__ */ new Date()
    ),
  },
  (table) => [index("identifier_idx").on(table.identifier)]
);

export const organizers = pgTable("organizers", {
  id: text("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  foundedDate: timestamp("founded_date"),
  website: varchar("website", { length: 255 }),
  isActive: boolean("is_active").default(false),
  address: varchar("address", { length: 255 }),
  organizerType: varchar("organizer_type", { length: 64 }),
  rejectionReason: text("rejection_reason"),
  rejectionSeen: boolean("rejection_seen").default(false),
  rejectedAt: timestamp("rejected_at"),
});

// Simplified relations - remove if causing issues
export const userRelations = relations(user, ({ one }) => ({
  organizer: one(organizers, {
    fields: [user.id],
    references: [organizers.id],
  }),
}));

export const organizerRelations = relations(organizers, ({ one }) => ({
  user: one(user, {
    fields: [organizers.id],
    references: [user.id],
  }),
}));

// TODO: Update the code that uses these exported type to use from users-model instead.
export type User = InferSelectModel<typeof user>;
export type Organizer = InferSelectModel<typeof organizers>;
export type UserProfileData = Partial<Omit<User, "id">>;
export type OrganizerProfileData = Partial<Omit<Organizer, "id" | "userId">>;
