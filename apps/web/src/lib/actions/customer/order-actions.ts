"use server";

import { getAuthSession } from "@/lib/auth/auth";
import {
  getAllUserTickets,
  getOrderDetails,
  getTicketDetailsForUser,
  getUserOrders,
} from "@vieticket/services/order";
import { headers as headersFn } from "next/headers";

/**
 * Server action to get a paginated list of the current user's orders.
 * @param page - The page number.
 * @param limit - The number of orders per page.
 */
export async function getUserOrdersAction(page: number = 1, limit: number = 10) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;
    if (!user) {
      throw new Error("Unauthenticated.");
    }

    const result = await getUserOrders(user, page, limit);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

/**
 * Server action to get the details of a specific order.
 * @param orderId - The ID of the order.
 */
export async function getOrderDetailsAction(orderId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;
    if (!user) {
      throw new Error("Unauthenticated.");
    }

    const result = await getOrderDetails(user, orderId);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

/**
 * Server action to get the details of a single ticket.
 * @param ticketId - The ID of the ticket.
 */
export async function getTicketDetailsAction(ticketId: string) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;
    if (!user) {
      throw new Error("Unauthenticated.");
    }

    const result = await getTicketDetailsForUser(user, ticketId);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

/**
 * Server action to get a paginated list of all tickets for the current user.
 * @param page - The page number.
 * @param limit - The number of tickets per page.
 */
export async function getAllUserTicketsAction(page: number = 1, limit: number = 10) {
  try {
    const session = await getAuthSession(await headersFn());
    const user = session?.user;
    if (!user) {
      throw new Error("Unauthenticated.");
    }

    const result = await getAllUserTickets(user, page, limit);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
