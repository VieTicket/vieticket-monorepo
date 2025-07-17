import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { orders, seatHolds, tickets } from "../schema";

export type Ticket = InferSelectModel<typeof tickets>

export type NewOrder = InferInsertModel<typeof orders>;
export type NewSeatHold = InferInsertModel<typeof seatHolds>;
export type NewTicket = InferInsertModel<typeof tickets>;