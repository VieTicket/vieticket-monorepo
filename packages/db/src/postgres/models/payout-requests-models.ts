import { InferSelectModel } from "drizzle-orm";
import { payoutRequests } from "../schema";

export type PayoutRequest = InferSelectModel<typeof payoutRequests>;

export interface PayoutRequestWithEvent extends PayoutRequest {
  event?: {
    name: string;
  };
}