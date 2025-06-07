import {
  pgTable,
  uuid,
  timestamp,
  integer,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";
import { events, seats } from "./events";
import { profiles } from "./profiles";
import { currency } from "../custom-types";
import { orderStatusEnum, refundStatusEnum, ticketStatusEnum } from "../enums";

export const seatHolds = pgTable("seat_holds", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => profiles.id)
    .notNull(),
  seatId: integer("seat_id")
    .references(() => seats.id)
    .notNull(),
  holdExpires: timestamp("hold_expires").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id")
    .references(() => profiles.id)
    .notNull(),
  orderDate: timestamp("order_date").defaultNow(),
  totalAmount: currency("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending"),
  vnpayData: jsonb("vnpay_data"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  seatId: integer("seat_id")
    .references(() => seats.id)
    .notNull(),
  qrCode: varchar("qr_code", { length: 128 }).unique().notNull(),
  status: ticketStatusEnum("status").default("active"),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  refundedAt: timestamp("refunded_at"),
  amount: currency("amount", { precision: 10, scale: 2 }).notNull(),
  status: refundStatusEnum("status").default("requested"),
});
