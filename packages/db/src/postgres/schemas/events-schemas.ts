import {
  type InferInsertModel,
  type InferSelectModel,
  relations,
} from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { currency } from "../custom-types";
import { organizers } from "./users-schemas";
import { approvalStatusEnum } from "../enums";

// Schemas
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
  views: integer().notNull().default(0),
  approvalStatus: approvalStatusEnum("approval_status")
    .notNull()
    .default("pending"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  organizerId: text("organizer_id")
    .references(() => organizers.id)
    .notNull(),
});

export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  price: currency("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rows = pgTable("rows", {
  id: uuid("id").defaultRandom().primaryKey(),
  areaId: uuid("area_id")
    .references(() => areas.id)
    .notNull(),
  rowName: varchar("row_name", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seats = pgTable("seats", {
  id: uuid("id").defaultRandom().primaryKey(),
  rowId: uuid("row_id")
    .references(() => rows.id)
    .notNull(),
  seatNumber: varchar("seat_number", { length: 16 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(organizers, {
    fields: [events.organizerId],
    references: [organizers.id],
  }),
  areas: many(areas),
}));

export type NewEvent = InferInsertModel<typeof events>;
export type Event = InferSelectModel<typeof events>;
export type EventWithOrganizer = Event & {
  organizer: Pick<InferSelectModel<typeof organizers>, "id" | "name">;
};

export const areasRelations = relations(areas, ({ one, many }) => ({
  event: one(events, {
    fields: [areas.eventId],
    references: [events.id],
  }),
  rows: many(rows),
}));
export type Area = InferSelectModel<typeof areas>;
export type EventWithAreas = Event & {
  areas: Area[];
};

export type EventFull = Event & {
  organizer: InferSelectModel<typeof organizers> & {
    avatar?: string | null;
  };
  areas: Area[];
};
