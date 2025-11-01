import {
  type InferInsertModel,
  type InferSelectModel,
  relations,
} from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { currency } from "../custom-types";
import { eventApprovalStatusEnum } from "../enums";
import { organizers } from "./users-schemas";

// Schemas
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).unique().notNull(),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    location: varchar("location", { length: 255 }),
    type: varchar("type", { length: 64 }),
    // TODO: remove after code migration - ticket sale times should be per showing
    ticketSaleStart: timestamp("ticket_sale_start"),
    ticketSaleEnd: timestamp("ticket_sale_end"),
    maxTicketsByOrder: integer("max_tickets_by_order"),
    posterUrl: varchar("poster_url", { length: 255 }),
    bannerUrl: varchar("banner_url", { length: 255 }),
    views: integer().notNull().default(0),
    approvalStatus:
      eventApprovalStatusEnum("approval_status").default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    // TODO: remove after code migration
    seatMapId: text("seat_map_id"),
    organizerId: text("organizer_id")
      .references(() => organizers.id)
      .notNull(),
  },
  (table) => [index("events_organizer_id_idx").on(table.organizerId)]
);

export const showings = pgTable(
  "showings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    seatMapId: text("seat_map_id"),
    name: varchar("name", { length: 255 }),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    ticketSaleStart: timestamp("ticket_sale_start"),
    ticketSaleEnd: timestamp("ticket_sale_end"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("showings_event_id_idx").on(table.eventId)]
);

export const areas = pgTable(
  "areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // TODO: will be removed after code migration
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    // TODO: will be notNull after code migration complete
    showingId: uuid("showing_id").references(() => showings.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 64 }).notNull(),
    price: currency("price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("areas_event_id_idx").on(table.eventId),
    index("areas_showing_id_idx").on(table.showingId),
  ]
);

export const rows = pgTable(
  "rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    areaId: uuid("area_id")
      .references(() => areas.id, { onDelete: "cascade" })
      .notNull(),
    rowName: varchar("row_name", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("rows_area_id_idx").on(table.areaId)]
);

export const seats = pgTable(
  "seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rowId: uuid("row_id")
      .references(() => rows.id, { onDelete: "cascade" })
      .notNull(),
    seatNumber: varchar("seat_number", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("seats_row_id_idx").on(table.rowId)]
);

// Relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(organizers, {
    fields: [events.organizerId],
    references: [organizers.id],
  }),
  areas: many(areas),
  showings: many(showings),
}));

export const showingsRelations = relations(showings, ({ one, many }) => ({
  event: one(events, {
    fields: [showings.eventId],
    references: [events.id],
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
  showing: one(showings, {
    fields: [areas.showingId],
    references: [showings.id],
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
  showings: InferSelectModel<typeof showings>[];
};
export const rowsRelations = relations(rows, ({ one, many }) => ({
  area: one(areas, {
    fields: [rows.areaId],
    references: [areas.id],
  }),
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one }) => ({
  row: one(rows, {
    fields: [seats.rowId],
    references: [rows.id],
  }),
}));
