"use server";

import { getAuthSession } from "@/lib/auth/auth";
import { User } from "@vieticket/db/pg/models/users";
import { inspectTicket, checkInTicket, processOfflineInspections, AppError } from "@vieticket/services/inspection";
import { headers } from "next/headers";

/**
 * Server action to inspect a ticket.
 * @param {string} ticketId - The UUID of the ticket to inspect.
 */
export async function inspectTicketAction(ticketId: string) {
    try {
        const session = await getAuthSession(await headers());
        const user = session?.user as User;
        if (!user) {
            throw new Error("Unauthenticated.");
        }

        const ticketDetails = await inspectTicket(ticketId, user);
        return { success: true, data: ticketDetails };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: { code: error.code, message: error.message } };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: { message: errorMessage } };
    }
}

/**
 * Server action to check in a ticket.
 * @param {string} ticketId - The UUID of the ticket to check in.
 */
export async function checkInTicketAction(ticketId: string) {
    try {
        const session = await getAuthSession(await headers());
        const user = session?.user as User;
        if (!user) {
            throw new Error("Unauthenticated.");
        }

        const updatedTicket = await checkInTicket(ticketId, user);
        return { success: true, data: updatedTicket };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: { code: error.code, message: error.message } };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: { message: errorMessage } };
    }
}

/**
 * Server action to process a batch of offline inspections.
 * @param {Array<object>} inspections - Array of { ticketId: string, timestamp: number }.
 */
export async function processOfflineInspectionsAction(inspections: Array<{ ticketId: string; timestamp: number }>) {
    try {
        const session = await getAuthSession(await headers());
        const user = session?.user as User;
        if (!user) {
            throw new Error("Unauthenticated.");
        }

        const result = await processOfflineInspections(inspections, user);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: { code: error.code, message: error.message } };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: { message: errorMessage } };
    }
}
