import { z } from "zod";

export const baseEventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().max(1000).nullable().default(null)
  ),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  location: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(255).nullable().default(null)
  ),
  type: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(64).nullable().default(null)
  ),
  ticketSaleStart: z.coerce.date().nullable().default(null),
  ticketSaleEnd: z.coerce.date().nullable().default(null),
  posterUrl: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().max(255).nullable().default(null)
  ),
  bannerUrl: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().url().max(255).nullable().default(null)
  ),
  organizerId: z.string(),
  views: z.number().int().nonnegative().default(0),
  isApproved: z.boolean().default(false),
  createdAt: z.coerce.date().default(new Date()),
  updatedAt: z.coerce.date().default(new Date()),
});
export const eventSchema = baseEventSchema
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (data) =>
      !data.ticketSaleStart ||
      !data.ticketSaleEnd ||
      data.ticketSaleEnd > data.ticketSaleStart,
    {
      message: "Ticket sale end must be after start",
      path: ["ticketSaleEnd"],
    }
  );

export const createEventInputSchema = baseEventSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    createdAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
  });
