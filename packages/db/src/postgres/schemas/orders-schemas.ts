import { boolean, index, jsonb, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
import { events, seats } from "./events-schemas";
import { currency, type PaymentMetadata } from "../custom-types";
import { orderStatusEnum, refundStatusEnum, ticketStatusEnum } from "../enums";
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
],);

/**
 * Orders table schema for storing order information.
 * 
 * Represents orders created from pending status onwards (confirmed checkout).
 * 
 * @table orders
 * @property {string} id - Unique identifier for the order (UUID, auto-generated)
 * @property {string} userId - Reference to the user who created the order
 * @property {Date} orderDate - Timestamp when the order was created (defaults to current time)
 * @property {number} totalAmount - Total amount of the order with 2 decimal precision
 * @property {string} status - Current status of the order (defaults to "pending")
 * @property {PaymentMetadata} paymentMetadata - JSON metadata for payment information
 * @property {Date} updatedAt - Timestamp of last update (defaults to current time)
 */
export const orders = pgTable("orders", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
        .references(() => user.id)
        .notNull(),
    orderDate: timestamp("order_date").defaultNow(),
    totalAmount: currency("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum("status").default("pending"),
    paymentMetadata: jsonb("payment_metadata").$type<PaymentMetadata>(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    // Index for userId (foreign key)
    index("idx_orders_user_id").on(table.userId),

    // Index for status (if you filter by status)
    index("idx_orders_status").on(table.status),

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
    seatId: uuid("seat_id")
        .references(() => seats.id)
        .notNull(),
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