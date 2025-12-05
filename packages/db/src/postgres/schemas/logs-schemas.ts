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