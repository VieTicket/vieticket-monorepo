import { pgEnum } from "drizzle-orm/pg-core";

// Role type
export const ROLE_VALUES = [
  "customer",
  "organizer",
  "admin",
  "unassigned",
] as const;
export type Role = (typeof ROLE_VALUES)[number];
export type UserAssignableRole = Exclude<Role, "admin" | "unassigned">;
export const roleEnum = pgEnum("role", ROLE_VALUES);

// Upload status type
export const UPLOAD_STATUS_VALUES = [
  "pending",
  "uploaded",
  "verified",
  "active",
  "destroyed",
] as const;
export type UploadStatus = (typeof UPLOAD_STATUS_VALUES)[number];
export const uploadStatusEnum = pgEnum("upload_status", UPLOAD_STATUS_VALUES);

// Gender type
export const GENDER_VALUES = ["Male", "Female", "Other"] as const;
export type Gender = (typeof GENDER_VALUES)[number];
export const genderEnum = pgEnum("gender", GENDER_VALUES);

// Ticket status type
export const TICKET_STATUS_VALUES = ["active", "used", "refunded"] as const;
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];
export const ticketStatusEnum = pgEnum("ticket_status", TICKET_STATUS_VALUES);

// Order status type
export const ORDER_STATUS_VALUES = [
  "pending",
  "paid",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUS_VALUES);

// Refund status type
export const REFUND_STATUS_VALUES = [
  "requested",
  "approved",
  "declined",
  "completed",
] as const;
export type RefundStatus = (typeof REFUND_STATUS_VALUES)[number];
export const refundStatusEnum = pgEnum("refund_status", REFUND_STATUS_VALUES);

// Approval status type
export const APPROVAL_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS_VALUES)[number];
export const approvalStatusEnum = pgEnum(
  "approval_status",
  APPROVAL_STATUS_VALUES
);
