import { pgEnum } from "drizzle-orm/pg-core";

export const ROLE_VALUES = [
  "customer",
  "organizer",
  "admin",
  "unassigned",
] as const;
export type Role = (typeof ROLE_VALUES)[number];
export type UserAssignableRole = Exclude<Role, "admin" | "unassigned">;
export const roleEnum = pgEnum("role", ROLE_VALUES);

export const UPLOAD_STATUS_VALUES = [
  "pending",
  "uploaded",
  "verified",
  "active",
  "destroyed",
] as const;
export type UploadStatus = (typeof UPLOAD_STATUS_VALUES)[number];
export const uploadStatusEnum = pgEnum("upload_status", UPLOAD_STATUS_VALUES);

export const GENDER_VALUES = ["Male", "Female", "Other"] as const;
export type Gender = (typeof GENDER_VALUES)[number];
export const genderEnum = pgEnum("gender", GENDER_VALUES);

export const TICKET_STATUS_VALUES = ["active", "used", "refunded"] as const;
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];
export const ticketStatusEnum = pgEnum("ticket_status", TICKET_STATUS_VALUES);

export const ORDER_STATUS_VALUES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUS_VALUES);

export const REFUND_STATUS_VALUES = [
  "requested",
  "approved",
  "declined",
  "completed",
] as const;
export type RefundStatus = (typeof REFUND_STATUS_VALUES)[number];
export const refundStatusEnum = pgEnum("refund_status", REFUND_STATUS_VALUES);

export const EVENT_APPROVAL_STATUS_VALUES = ["pending", "approved", "rejected"] as const;
export type EventApprovalStatus = typeof EVENT_APPROVAL_STATUS_VALUES[number];
export const eventApprovalStatusEnum = pgEnum("event_approval_status", EVENT_APPROVAL_STATUS_VALUES);

export const TICKET_INSPECTION_STATUS_VALUES = [
  "valid", 
  "invalid",
  "duplicate",
  "offline"
] as const;
export type TicketInspectionStatus = (typeof TICKET_INSPECTION_STATUS_VALUES)[number];
export const ticketInspectionStatusEnum = pgEnum("ticket_inspection_status", TICKET_INSPECTION_STATUS_VALUES);