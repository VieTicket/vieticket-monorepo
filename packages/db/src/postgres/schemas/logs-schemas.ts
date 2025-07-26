import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./users-schemas";
import { ticketInspectionStatusEnum } from "../enums";
import { tickets } from "./orders-schemas";

export const ticketInspectionHistory = pgTable("ticket_inspection_history", {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
        .references(() => tickets.id)
        .notNull(),
    inspectorId: text("inspector_id")
        .references(() => user.id)
        .notNull(),
    status: ticketInspectionStatusEnum().notNull(),
    inspectedAt: timestamp("inspected_at").notNull().defaultNow(),
    loggedAt: timestamp("logged_at").notNull().defaultNow(),
}, (table) => [
    index('idx_inspct_hstry_tickt_id').on(table.ticketId),
    index('idx_inspct_hstry_status').on(table.status)
])

export const ticketEmailLogs = pgTable("ticket_email_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
        .references(() => tickets.id)
        .notNull(),
    recipient_email: varchar({length: 255})
        .notNull(),
    sender_user_id: text("sender_user_id")
        .references(() => user.id)
        .notNull(),
    sentAt: timestamp()
        .defaultNow()
        .notNull(),
}, (table) => [
    index("idx_ticket_email_logs_ticket_recipient").on(table.ticketId, table.recipient_email),
    index("idx_ticket_email_logs_sent_at").on(table.sentAt),
    index("idx_ticket_email_logs_ticket_recent").on(table.ticketId, table.sentAt)
])