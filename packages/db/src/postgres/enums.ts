import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "customer",
  "organizer",
  "admin",
  "unassigned",
]);

export const uploadStatusEnum = pgEnum("upload_status", [
  "pending",
  "uploaded",
  "verified",
  "active",
  "destroyed",
]);

export const genderEnum = pgEnum("gender", ["Male", "Female", "Other"]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "active",
  "used",
  "refunded",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "cancelled",
  "refunded",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "requested",
  "approved",
  "declined",
  "completed",
]);
