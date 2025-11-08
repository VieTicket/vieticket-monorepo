"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  createPendingOrder,
  getTicketData,
  getShowingTicketData,
} from "@vieticket/services/checkout";
import { headers as headersFn } from "next/headers";

export async function getShowingTicketsAction(showingId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;
    if (!user) {
      throw new Error("Unauthenticated.");
    }

    const ticketData = await getShowingTicketData(showingId, user);

    return { success: true, data: ticketData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function getTicketsAction(eventId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;
    if (!user) {
      throw new Error("Unauthenticated.");
    }

    const ticketData = await getTicketData(eventId, user);

    return { success: true, data: ticketData };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export async function createOrderAction(
  eventId: string,
  selectedSeatIds: string[],
  showingId?: string
) {
  try {
    const headers = await headersFn();

    const session = await getAuthSession(headers);
    if (!session?.user) {
      throw new Error("Unauthenticated: Please sign in to create an order.");
    }

    // Extract client IP from headers for VNPay
    const ip = headers.get("x-forwarded-for") ?? "127.0.0.1";

    const orderDetails = await createPendingOrder(
      eventId,
      selectedSeatIds,
      session.user,
      ip,
      showingId
    );

    return { success: true, data: orderDetails };
  } catch (error) {
    const isKnownError = error instanceof Error && "code" in error;
    if (isKnownError) {
      return {
        success: false,
        error: {
          code: (error as any).code,
          message: error.message,
          unavailableSeats: (error as any).unavailableSeats,
        },
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: { message: errorMessage } };
  }
}
