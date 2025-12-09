import {
    boolean,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import { events, seats, showings } from "./events-schemas";
import { currency, type PaymentMetadata } from "../custom-types";
import {
    orderStatusEnum,
    refundReasonEnum,
    refundStatusEnum,
    ticketStatusEnum,
} from "../enums";
import { user } from "./users-schemas";
import { sql } from "drizzle-orm";

/**
 * Table for managing temporary seat reservations during the booking process.
 * 
 * Currently used for pending orders when `isConfirmed` is false. In future iterations,
 * this will support interactive seat selection with real-time updates.
 * 
 * @remarks
 * - Seats are held temporarily with an expiration time to prevent indefinite locks
 * - Confirmed holds represent completed bookings
 * - Unconfirmed holds are used for checkout flows
 * - ~~Future versions will enable real-time seat selection updates~~
 * - Real-time database should be better for this case (real-time seat selection)
 */
export const seatHolds = pgTable("seat_holds", {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
        .references(() => events.id)
        .notNull(),
    showingId: uuid("showing_id")
        .references(() => showings.id)
        .notNull(),
    userId: text("user_id")
        .references(() => user.id)
        .notNull(),
    orderId: uuid("order_id")
        .references(() => orders.id)
        .notNull(),
    seatId: uuid("seat_id")
        .references(() => seats.id)
        .notNull(),
    isConfirmed: boolean().default(false).notNull(),
    isPaid: boolean().default(false).notNull(),
    expiresAt: timestamp("hold_expires").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    // Index for querying holds by event
    index("idx_seat_holds_event_id").on(table.eventId),
    // Index for querying holds by showing
    index("idx_seat_holds_showing_id").on(table.showingId),
    // Index for querying holds by user
    index("idx_seat_holds_user_id").on(table.userId),
    // Index for querying holds by order
    index("idx_seat_holds_order_id").on(table.orderId),
    // Index for finding expired holds. B-tree indexes are efficient for range queries (e.g., less than/greater than).
    index("idx_seat_holds_expires_at").on(table.expiresAt),
    // Composite index to quickly find unconfirmed, expired holds for cleanup tasks.
    index("idx_seat_holds_unconfirmed_expired").on(
        table.isConfirmed,
        table.expiresAt,
    ),
]);

/**
 * Orders table schema for storing order information.
 * 
 * Represents orders created from pending status onwards (confirmed checkout).
 * 
 * @table orders
 * @property {string} id - Unique identifier for the order (UUID, auto-generated)
 * @property {string} userId - Reference to the user who created the order
 * @property {string} eventId - Reference to the event
 * @property {string} showingId - Reference to the showing (capacity context)
 * @property {Date} orderDate - Timestamp when the order was created (defaults to current time)
 * @property {number} totalAmount - Total amount of the order with 2 decimal precision
 * @property {string} status - Current status of the order (defaults to "pending")
 * @property {Date | null} expiresAt - Cutoff time for payment/holds; late payments are rejected
 * @property {PaymentMetadata} paymentMetadata - JSON metadata for payment information
 * @property {Date} updatedAt - Timestamp of last update (defaults to current time)
 */
export const orders = pgTable("orders", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .references(() => user.id)
        .notNull(),
    eventId: uuid("event_id")
        .references(() => events.id)
        .notNull(),
    showingId: uuid("showing_id")
        .references(() => showings.id)
        .notNull(),
    orderDate: timestamp("order_date").defaultNow(),
    totalAmount: currency("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum("status").default("pending"),
    expiresAt: timestamp("expires_at"),
    paymentMetadata: jsonb("payment_metadata").$type<PaymentMetadata>(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    // Index for userId (foreign key)
    index("idx_orders_user_id").on(table.userId),

    // Index for status (if you filter by status)
    index("idx_orders_status").on(table.status),

    // Index for showing and event lookup
    index("idx_orders_event_id").on(table.eventId),
    index("idx_orders_showing_id").on(table.showingId),

    // Index for expiration sweeps
    index("idx_orders_expires_at").on(table.expiresAt),

    // Index for orderDate (if you query by date)
    index("idx_orders_order_date").on(table.orderDate),

    // Expression index for VNPay transaction reference
    index("idx_orders_vnpay_txnref").on(
        sql`(${table.paymentMetadata} ->> 'provider')`,
        sql`(${table.paymentMetadata} -> 'data' ->> 'vnp_TxnRef')`
    ),
]);

/**
 * Table schema for storing ticket information for completed orders.
 * 
 * This table contains tickets that have been successfully purchased and are in various states
 * including active tickets, used tickets, and returned tickets. Only tickets from orders
 * with "success" status onward are stored here.
 */
export const tickets = pgTable("tickets", {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
        .references(() => orders.id)
        .notNull(),
    eventId: uuid("event_id").references(() => events.id, {
        onDelete: "set null",
    }),
    showingId: uuid("showing_id").references(() => showings.id, {
        onDelete: "set null",
    }),
    seatId: uuid("seat_id")
        .references(() => seats.id)
        .notNull(),
    price: currency("price", { precision: 10, scale: 2 }).default(0).notNull(),
    status: ticketStatusEnum("status").default("active"),
    purchasedAt: timestamp("purchased_at").defaultNow(),
}, (table) => [
    index("tickets_order_id_idx").on(table.orderId),
    index("tickets_event_id_idx").on(table.eventId),
    index("tickets_showing_id_idx").on(table.showingId),
    // Ensure a seat cannot be sold twice
    uniqueIndex("tickets_seat_id_unq").on(table.seatId),
]);

export const refunds = pgTable("refunds", {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
        .references(() => orders.id)
        .notNull(),
    reason: refundReasonEnum("reason").default("personal").notNull(),
    requestedAt: timestamp("requested_at").defaultNow(),
    approvedAt: timestamp("approved_at"),
    refundedAt: timestamp("refunded_at"),
    amount: currency("amount", { precision: 10, scale: 2 }).notNull(),
    baseAmount: currency("base_amount", { precision: 10, scale: 2 })
        .default(0)
        .notNull(),
    percentageApplied: integer("percentage_applied").default(0).notNull(),
    status: refundStatusEnum("status").default("requested"),
    createdBy: text("created_by").references(() => user.id, {
        onDelete: "set null",
    }),
    approvedBy: text("approved_by").references(() => user.id, {
        onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    adminOverride: boolean("admin_override").default(false).notNull(),
    adminOverrideBy: text("admin_override_by").references(() => user.id, {
        onDelete: "set null",
    }),
    adminOverrideAt: timestamp("admin_override_at"),
    adminOverrideReason: text("admin_override_reason"),
    overridePreviousPercentage: integer("override_previous_percentage"),
    overridePreviousAmount: currency("override_previous_amount", {
        precision: 10,
        scale: 2,
    }),
}, (table) => [
    index("refunds_order_id_idx").on(table.orderId),
    index("refunds_status_idx").on(table.status),
    index("refunds_reason_idx").on(table.reason),
    index("refunds_created_by_idx").on(table.createdBy),
]);

export const refundTickets = pgTable("refund_tickets", {
    id: uuid("id").defaultRandom().primaryKey(),
    refundId: uuid("refund_id")
        .references(() => refunds.id, { onDelete: "cascade" })
        .notNull(),
    ticketId: uuid("ticket_id")
        .references(() => tickets.id, { onDelete: "cascade" })
        .notNull(),
    ticketPrice: currency("ticket_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    uniqueIndex("refund_tickets_refund_ticket_unq").on(
        table.refundId,
        table.ticketId,
    ),
    index("refund_tickets_refund_id_idx").on(table.refundId),
    index("refund_tickets_ticket_id_idx").on(table.ticketId),
]);

/**
 * @todo Create a booking sessions table to manage temporary seat selection sessions
 * 
 * This table will track user sessions when customers navigate to the seat selection page,
 * ensuring users have limited time to complete their selection and preventing cheating.
 * Essential for implementing the "live selection" feature where users can see real-time
 * seat selections from other customers.
 * 
 * Proposed schema considerations:
 * - Session ID (UUID, primary key)
 * - User ID reference
 * - Event ID reference
 * - Session start timestamp
 * - Session expiration timestamp (e.g., 15-30 minutes)
 * - Current selected seats (JSON array) ~ Already in SeatHolds?
 * - Session status (active, expired, converted_to_hold) ~ Convert WHAT?
 * - Last activity timestamp for heartbeat tracking
 * 
 * Research needed:
 * - Optimal session duration
 * - Real-time synchronization strategy (WebSockets, Server-Sent Events, polling)
 * - Conflict resolution when multiple users select same seats
 * - Performance implications for high-traffic events
 * - Database cleanup strategy for expired sessions
 */
