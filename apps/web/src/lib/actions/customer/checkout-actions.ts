"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  createPendingOrder,
  getTicketData,
  getShowingTicketData,
  createPendingGAOrder,
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
    console.error("getShowingTicketsAction error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while loading tickets.",
    };
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
    console.error("getTicketsAction error:", error);
    return {
      success: false,
      error: "An unexpected error occurred while loading tickets.",
    };
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
    console.error("createOrderAction error:", error);
    const isKnownError = error instanceof Error && "code" in error;
    if (isKnownError) {
      return {
        success: false,
        error: {
          code: (error as any).code,
          message: "Unable to create order with selected seats.",
          unavailableSeats: (error as any).unavailableSeats,
        },
      };
    }

    return {
      success: false,
      error: { message: "An unexpected error occurred while creating order." },
    };
  }
}

export async function createGAOrderAction(
  eventId: string,
  showingId: string,
  areas: Array<{ areaId: string; quantity: number }>
) {
  try {
    const headers = await headersFn();
    const session = await getAuthSession(headers);
    if (!session?.user) {
      throw new Error("Unauthenticated: Please sign in to create an order.");
    }

    const ip = headers.get("x-forwarded-for") ?? "127.0.0.1";

    const orderDetails = await createPendingGAOrder(
      eventId,
      showingId,
      areas,
      session.user,
      ip
    );

    return { success: true, data: orderDetails };
  } catch (error) {
    console.error("createGAOrderAction error:", error);
    return {
      success: false,
      error: { message: "An unexpected error occurred while creating order." },
    };
  }
}
