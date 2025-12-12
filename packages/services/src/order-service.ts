import { User } from "@vieticket/db/pg/schema";
import {
    findOrderByIdForUser,
    findOrdersByUserIdWithPagination,
    findTicketByIdForUser,
    findUserTicketsWithPagination,
    getEventByTicketId,
    getTicketDetails,
} from "@vieticket/repos/orders";
import { generateTicketQRData } from "@vieticket/utils/ticket-validation/server";

/**
 * Gets a paginated list of orders for a given user.
 * @param user - The authenticated user object.
 * @param page - The page number to fetch.
 * @param limit - The number of items per page.
 * @returns A paginated list of the user's orders.
 */
export async function getUserOrders(
    user: Pick<User, "id" | "role">,
    page: number,
    limit: number
) {
    if (user.role !== "customer") {
        throw new Error("Unauthorized: Only customers can view their orders.");
    }
    return findOrdersByUserIdWithPagination(user.id, page, limit);
}

// Removed server-side email sending and status retrieval functions

/**
 * Gets the details of a specific order, including all associated tickets.
 * @param user - The authenticated user object.
 * @param orderId - The ID of the order to retrieve.
 * @returns The order details with a list of tickets.
 */
export async function getOrderDetails(
    user: Pick<User, "id" | "role" | "name">,
    orderId: string
) {
    if (user.role !== "customer") {
        throw new Error("Unauthorized: Only customers can view order details.");
    }

    const order = await findOrderByIdForUser(orderId, user.id);
    if (!order) {
        throw new Error("Order not found or you do not have permission to view it.");
    }

    const ticketsRaw = await getTicketDetails(orderId);

    if (ticketsRaw.length === 0) {
        return {
            ...order,
            tickets: [],
        };
    }

    // All tickets in an order belong to the same event.
    const eventInfo = await getEventByTicketId(ticketsRaw[0].ticketId);
    if (!eventInfo) {
        // This should ideally not happen if tickets exist.
        throw new Error("Could not retrieve event information for the order.");
    }

    const tickets = ticketsRaw.map((ticket) => {
        const qrData = ticket.status === "active"
            ? generateTicketQRData(
                ticket.ticketId,
                user.name,
                eventInfo.eventId,
                ticket.seatNumber,
                ticket.rowName,
                ticket.areaName
            )
            : null;
        return { ...ticket, qrData };
    });

    return {
        ...order,
        event: eventInfo,
        tickets,
    };
}

/**
 * Gets the details for a single ticket, verifying user ownership.
 * @param user - The authenticated user object.
 * @param ticketId - The ID of the ticket to retrieve.
 * @returns The detailed ticket information.
 */
export async function getTicketDetailsForUser(
    user: Pick<User, "id" | "role" | "name">,
    ticketId: string
) {
    if (user.role !== "customer") {
        throw new Error("Unauthorized: Only customers can view ticket details.");
    }

    const ticket = await findTicketByIdForUser(ticketId, user.id);
    if (!ticket) {
        throw new Error("Ticket not found or you do not have permission to view it.");
    }

    const qrData = ticket.status === "active"
        ? generateTicketQRData(
            ticket.ticketId,
            user.name,
            ticket.eventId,
            ticket.seatNumber,
            ticket.rowName,
            ticket.areaName
        )
        : null;


    return { ...ticket, qrData };
}

/**
 * Gets a paginated list of all tickets owned by a user, regardless of the order.
 * @param user - The authenticated user object.
 * @param page - The page number to fetch.
 * @param limit - The number of items per page.
 * @returns A paginated list of the user's tickets.
 */
export async function getAllUserTickets(
    user: Pick<User, "id" | "role" | "name">,
    page: number,
    limit: number
) {
    if (user.role !== "customer") {
        throw new Error("Unauthorized: Only customers can view their tickets.");
    }
    return findUserTicketsWithPagination(user.id, page, limit);
}
