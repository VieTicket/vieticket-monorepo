import { z } from "zod";

export const PayoutRequestFormSchema = z.object({
  eventId: z.uuid(),
  amount: z.string().min(1, "Amount is required").regex(/^\d+$/, "Amount must be a number"),
});