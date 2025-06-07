import {
  boolean,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { organizers } from "./profiles";
import { currency } from "../custom-types";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: varchar("location", { length: 255 }),
  type: varchar("type", { length: 64 }),
  ticketSaleStart: timestamp("ticket_sale_start"),
  ticketSaleEnd: timestamp("ticket_sale_end"),
  posterUrl: varchar("poster_url", { length: 255 }),
  bannerUrl: varchar("banner_url", { length: 255 }),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  organizerId: integer("organizer_id")
    .references(() => organizers.id)
    .notNull(),
});

export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  price: currency("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rows = pgTable("rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  areaId: integer("area_id")
    .references(() => areas.id)
    .notNull(),
  rowName: varchar("row_name", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seats = pgTable("seats", {
  id: uuid("id").defaultRandom().primaryKey(),
  rowId: integer("row_id")
    .references(() => rows.id)
    .notNull(),
  seatNumber: varchar("seat_number", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
