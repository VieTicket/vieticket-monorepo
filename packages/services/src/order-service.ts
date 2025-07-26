import { User } from "@vieticket/db/pg/schema";
import {
    findOrderByIdForUser,
    findOrdersByUserIdWithPagination,
    findTicketByIdForUser,
    findUserTicketsWithPagination,
    getEventByTicketId,
    getTicketDetails,
    checkTicketEmailLimits,
    logTicketEmail,
    getTicketEmailLogs,
} from "@vieticket/repos/orders";
import { generateTicketQRData } from "@vieticket/utils/ticket-validation/server";
import { sendMail } from "@vieticket/utils/mailer";
import { generateQRCodeBuffer } from "@vieticket/utils/ticket-validation/client";

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

export async function sendTicketEmail(
    user: Pick<User, "id" | "email" | "name">,
    ticketId: string,
    recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Check if the user owns the ticket
        const ticket = await findTicketByIdForUser(ticketId, user.id);
        if (!ticket) {
            throw new Error("Ticket not found or you do not have permission to send it.");
        }

        if (ticket.status !== "active") {
            throw new Error("Ticket is not active.");
        }

        // 2. Check email limits
        const maxEmailsPerTicket = parseInt(process.env.MAX_EMAILS_PER_TICKET || "3", 10);
        const emailCooldownMinutes = parseInt(process.env.EMAIL_COOLDOWN_MINUTES || "60", 10);
        const limits = await checkTicketEmailLimits(ticketId, maxEmailsPerTicket, emailCooldownMinutes);
        if (!limits.canSend) {
            if (limits.totalSends >= maxEmailsPerTicket) {
                throw new Error(`Email limit exceeded. You can send at most ${maxEmailsPerTicket} emails per ticket.`);
            } else {
                throw new Error(`Please wait before sending another email. There is a ${emailCooldownMinutes} minute cooldown after each send.`);
            }
        }

        // 3. Generate QR code and email content
        const eventInfo = await getEventByTicketId(ticketId);
        if (!eventInfo) {
            throw new Error("Could not retrieve event information for the ticket.");
        }

        const qrData = generateTicketQRData(
            ticketId,
            user.name,
            eventInfo.eventId,
            ticket.seatNumber,
            ticket.rowName,
            ticket.areaName
        );
        const qrCodeBuffer = await generateQRCodeBuffer(qrData);
        const filename = "ticket-qr.png";
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ticket for ${eventInfo.eventName}</title>
            </head>
            <body>
                <h1>Ticket for ${eventInfo.eventName}</h1>
                <p>Seat: ${ticket.areaName}, Row ${ticket.rowName}, Seat ${ticket.seatNumber}</p>
                <p>Event starts at: ${new Date(ticket.startTime).toLocaleString()}</p>
                <img src="cid:${filename}" alt="QR Code" />
                <p>Scan this QR code at the event entrance.</p>
            </body>
            </html>
        `;

        const textContent = `
            Ticket for ${eventInfo.eventName}
            Seat: ${ticket.areaName}, Row ${ticket.rowName}, Seat ${ticket.seatNumber}
            Event starts at: ${new Date(ticket.startTime).toLocaleString()}
            Use the QR code in the HTML version for entry.
        `;

        // 5. Send email
        await sendMail({
            to: recipientEmail,
            subject: `Your ticket for ${eventInfo.eventName}`,
            text: textContent,
            html: htmlContent,
            inline: {
                data: qrCodeBuffer,
                filename: filename,
                contentType: "image/png",
                contentId: filename,
            },
        });

        // 6. Log the email send
        await logTicketEmail(ticketId, user.id, recipientEmail);

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send ticket email";
        return { success: false, error: errorMessage };
    }
}

/**
 * Gets the email sending status for a specific ticket, including logs and limits.
 * @param user - The authenticated user object.
 * @param ticketId - The ID of the ticket.
 * @returns An object with email logs, send counts, and limits.
 */
export async function getTicketEmailStatus(
    user: Pick<User, "id" | "role">,
    ticketId: string
) {
    if (user.role !== "customer") {
        throw new Error("Unauthorized: Only customers can view ticket details.");
    }

    // Ensure the user owns the ticket before showing sensitive log data
    const ticket = await findTicketByIdForUser(ticketId, user.id);
    if (!ticket) {
        throw new Error("Ticket not found or you do not have permission to view it.");
    }

    const maxEmailsPerTicket = parseInt(process.env.MAX_EMAILS_PER_TICKET || "3", 10);
    const emailCooldownMinutes = parseInt(process.env.EMAIL_COOLDOWN_MINUTES || "60", 10);

    const logs = await getTicketEmailLogs(ticketId);
    const limits = await checkTicketEmailLimits(ticketId, maxEmailsPerTicket, emailCooldownMinutes);

    // Find the most recent log entry for lastSentAt
    const lastLog = logs.length > 0
        ? logs.reduce((latest, log) => log.sentAt > latest.sentAt ? log : latest)
        : null;

    return {
        logs,
        sentCount: limits.totalSends,
        maxSends: maxEmailsPerTicket,
        cooldownMinutes: emailCooldownMinutes,
        lastSentAt: lastLog ? lastLog.sentAt : undefined,
    };
}

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
