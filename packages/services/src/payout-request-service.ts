import {
  createPayoutRequest,
  updatePayoutRequest,
  findPayoutRequestsByOrganizerId,
  countPayoutRequestsByOrganizerId,
  findPayoutRequestById,
  hasActivePayoutRequestForEvent,
  getPayoutRequestsForAdmin as getPayoutRequestsForAdminRepo
} from "@vieticket/repos/payout-request";
import { findEventById } from "@vieticket/repos/events";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { User } from "@vieticket/db/pg/models/users";
import { PaginationParams } from "@vieticket/repos/types";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";
import { getEventRevenueForAdminService, getEventRevenueService } from "./event-revenue-service";

export async function createPayoutRequestService(
  eventId: string,
  user: Pick<User, 'id' | 'role'>,
  requestedAmount: number
) {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can create payout requests");
  }

  // Verify event has ended
  const event = await findEventById(eventId);
  if (!event || new Date() < new Date(event.endTime)) {
    throw new Error("Event has not ended yet");
  }

  // Validate requested amount is less than event revenue
  const revenue = await getEventRevenueService(eventId, user);
  if (requestedAmount > revenue) {
    throw new Error("Requested amount exceeds event revenue");
  }

  // Enforce one active payout request per event
  const hasActiveRequest = await hasActivePayoutRequestForEvent(eventId);
  if (hasActiveRequest) {
    throw new Error("An active payout request already exists for this event");
  }

  // Create payout request
  return createPayoutRequest({
    eventId,
    organizerId: user.id,
    requestedAmount
  });
}

export async function updatePayoutRequestService(
  requestId: string,
  user: Pick<User, 'id' | 'role'>,
  data: {
    status?: PayoutStatus;
    agreedAmount?: number;
    proofDocumentUrl?: string;
  }
) {
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can update payout requests");
  }

  const existing = await findPayoutRequestById(requestId);
  if (!existing) {
    throw new Error("Payout request not found");
  }

  if (data.agreedAmount !== undefined) {
    if (!["pending", "in_discussion"].includes(existing.status)) {
      throw new Error("Agreed amount can only be updated when status is pending or in discussion");
    }
    const revenue = await getEventRevenueForAdminService(existing.eventId);
    if (data.agreedAmount > revenue) {
      throw new Error("Agreed amount cannot exceed event revenue");
    }
  }

const updateData = { ...data } as typeof data & { completionDate?: Date };
  if (data.status === "approved" || data.status === "rejected") {
    updateData.completionDate = new Date();
  }

  return updatePayoutRequest(requestId, updateData);
}

export async function getPayoutRequestsService(
  organizerId: string,
  pagination: PaginationParams & { status?: PayoutStatus; search?: string } = { offset: 0, limit: 10 }
) {
  const { status, search } = pagination;
  const [requests, totalCount] = await Promise.all([
    findPayoutRequestsByOrganizerId(organizerId, pagination),
    countPayoutRequestsByOrganizerId(organizerId, { ...pagination, status, search })
  ]);

  return {
    data: requests,
    totalCount,
    totalPages: Math.ceil(totalCount / pagination.limit)
  };
}

export async function getPayoutRequestById(
  user: Pick<User, 'id' | 'role'>,
  id: string
): Promise<PayoutRequestWithEvent> {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can view payout request detail");
  }

  const payoutRequest = await findPayoutRequestById(id);
  if (!payoutRequest || payoutRequest.organizerId != user.id) {
    throw new Error("Payout request not found or not belongs to you.");
  }

  return payoutRequest;
}

export async function getAdminPayoutRequestByIdService(
  user: Pick<User, "id" | "role">,
  id: string
): Promise<PayoutRequestWithEvent> {
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can view payout request detail");
  }

  const payoutRequest = await findPayoutRequestById(id);
  if (!payoutRequest) {
    throw new Error("Payout request not found");
  }

  return payoutRequest;
}

// New function: cancelPayoutRequestService
export async function cancelPayoutRequestService(
  requestId: string,
  user: Pick<User, 'id' | 'role'>
): Promise<PayoutRequestWithEvent> {
  if (user.role !== "organizer") {
    throw new Error("Unauthorized: Only organizers can cancel payout requests");
  }

  const request = await findPayoutRequestById(requestId);
  if (!request || request.organizerId !== user.id) {
    throw new Error("Payout request not found or not authorized");
  }

  if (request.status !== "pending") {
    throw new Error("Only pending requests can be cancelled");
  }

  return updatePayoutRequest(requestId, { status: "cancelled" });
}

export async function getPayoutRequestsForAdmin(
  user: Pick<User, "id" | "role">,
  pagination: PaginationParams & { status?: PayoutStatus; search?: string } = { offset: 0, limit: 10 }
): Promise<{
  data: PayoutRequestWithEvent[];
  totalCount: number;
  totalPages: number;
}> {
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can view payout requests");
  }
  return getPayoutRequestsForAdminRepo(pagination);
}
