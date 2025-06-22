import {
  pgTable,
  uuid,
  timestamp,
  jsonb,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { events, seats } from "./events-schemas";
import { currency } from "../custom-types";
import { orderStatusEnum, refundStatusEnum, ticketStatusEnum } from "../enums";
import { user } from "./users-schemas";

export const seatHolds = pgTable("seat_holds", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  userId: text("user_id")
    .references(() => user.id)
    .notNull(),
  seatId: uuid("seat_id")
    .references(() => seats.id)
    .notNull(),
  holdExpires: timestamp("hold_expires").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => user.id)
    .notNull(),
  orderDate: timestamp("order_date").defaultNow(),
  totalAmount: currency("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending"),
  vnpayData: jsonb("vnpay_data"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  seatId: uuid("seat_id")
    .references(() => seats.id)
    .notNull(),
  qrCode: varchar("qr_code", { length: 128 }).unique().notNull(),
  status: ticketStatusEnum("status").default("active"),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  refundedAt: timestamp("refunded_at"),
  amount: currency("amount", { precision: 10, scale: 2 }).notNull(),
  status: refundStatusEnum("status").default("requested"),
});
