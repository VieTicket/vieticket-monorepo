"use server"

import {
  createPayoutRequestService,
  updatePayoutRequestService,
  getPayoutRequestsService,
  getPayoutRequestById,
  cancelPayoutRequestService,
  getPayoutRequestsForAdmin
} from "@vieticket/services/payout-request";
import { getEventRevenueService } from "@vieticket/services/event-revenue";
import { getAuthSession } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { PayoutStatus } from "@vieticket/db/pg/schema";
import { revalidatePath } from "next/cache";
import { PayoutRequestFormSchema } from "@/lib/validations/payout-request";
import { z } from "zod";
import { APIResponse } from "@/types";
import { PayoutRequestWithEvent } from "@vieticket/db/pg/models/payout-requests";

export async function createPayoutRequestAction(
  data: z.infer<typeof PayoutRequestFormSchema>
): Promise<APIResponse<{ id: string }>> {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    return { success: false, message: "Unauthorized: Please log in" };
  }

  try {
    const payoutRequest = await createPayoutRequestService(
      data.eventId,
      session.user,
      Number(data.amount)
    );
    revalidatePath("/organizer/payouts");
    return { success: true, data: { id: payoutRequest.id } };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create payout request" };
  }
}

export async function uploadPayoutProofAction(
  requestId: string,
  proofUrl: string
) {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    throw new Error("Unauthorized: Please log in");
  }

  const updatedRequest = await updatePayoutRequestService(
    requestId,
    session.user,
    { proofDocumentUrl: proofUrl }
  );
  revalidatePath("/admin/payouts");
  return updatedRequest;
}

export async function getPayoutRequests(page: number = 1, limit: number = 10) {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    throw new Error("Unauthorized: Please log in");
  }

  const offset = (page - 1) * limit;
  return getPayoutRequestsService(session.user.id, { offset, limit });
}

export async function getEventRevenueAction(eventId: string): Promise<APIResponse<{ revenue: number }>> {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    return { success: false, message: "Unauthorized: Please log in" };
  }

  try {
    const revenue = await getEventRevenueService(eventId, session.user);
    return { success: true, data: { revenue } };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch event revenue" };
  }
}

export async function fetchPayoutRequestById(id: string) {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    return { success: false, message: "Unauthorized: Please log in" };
  }

  try {
    const payoutRequest = getPayoutRequestById(session.user, id);
    return { success: true, data: { payoutRequest } }
  }
  catch (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch payout request." };
  }
}

export async function cancelPayoutRequestAction(
  requestId: string
): Promise<APIResponse<null>> {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    return { success: false, message: "Unauthorized: Please log in" };
  }

  try {
    await cancelPayoutRequestService(requestId, session.user);
    revalidatePath("/organizer/payouts");
    revalidatePath(`/organizer/payouts/${requestId}`);
    return { success: true, message: "Payout request cancelled successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to cancel payout request" };
  }
}

export async function getAdminPayoutRequestsAction(
  page: number = 1,
  limit: number = 10,
  status?: PayoutStatus
): Promise<APIResponse<{
  data: PayoutRequestWithEvent[];
  totalCount: number;
  totalPages: number;
}>> {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    return { success: false, message: "Unauthorized: Please log in" };
  }

  try {
    const offset = (page - 1) * limit;
    const result = await getPayoutRequestsForAdmin(session.user, { offset, limit, status });
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch payout requests" };
  }
}

export async function updatePayoutStatusAction(
  requestId: string,
  status: PayoutStatus,
  agreedAmount?: number,
  completionDate?: Date
) {
  const session = await getAuthSession(await headers());
  if (!session?.user) {
    throw new Error("Unauthorized: Please log in");
  }

  const updatedRequest = await updatePayoutRequestService(
    requestId,
    session.user,
    { status, agreedAmount }
  );
  revalidatePath("/admin/payouts");
  return updatedRequest;
}