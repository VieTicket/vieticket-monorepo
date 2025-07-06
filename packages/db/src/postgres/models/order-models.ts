import { InferInsertModel } from "drizzle-orm";
import { orders, seatHolds, tickets } from "../schema";

export type NewOrder = InferInsertModel<typeof orders>;
export type NewSeatHold = InferInsertModel<typeof seatHolds>;
export type NewTicket = InferInsertModel<typeof tickets>;