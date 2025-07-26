import { pgTable, uuid, timestamp, text, index } from "drizzle-orm/pg-core";
import { events } from "./events-schemas";
import { organizers } from "./users-schemas";
import { payoutStatusEnum } from "../enums";
import { currency } from "../custom-types";
import { relations } from "drizzle-orm";

export const payoutRequests = pgTable("payout_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }).notNull(),
  organizerId: text("organizer_id").references(() => organizers.id, { onDelete: "cascade" }).notNull(),
  status: payoutStatusEnum("status").default("pending").notNull(),
  requestedAmount: currency("requested_amount").notNull(),
  agreedAmount: currency("agreed_amount"),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  completionDate: timestamp("completion_date"),
  proofDocumentUrl: text("proof_document_url"),
}, (table) => [
  index().on(table.eventId),
  index().on(table.organizerId),
  index().on(table.requestDate)
]);

export const payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  event: one(events, {
    fields: [payoutRequests.eventId],
    references: [events.id],
  }),
  organizer: one(organizers, {
    fields: [payoutRequests.organizerId],
    references: [organizers.id],
  }),
}));