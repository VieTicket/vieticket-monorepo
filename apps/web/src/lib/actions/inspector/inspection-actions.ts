"use server";

import { auth, getAuthSession } from "@/lib/auth/auth";
import { User } from "@vieticket/db/pg/models/users";
import { AppError, checkInTicket, getActiveEvents, inspectTicket, processOfflineInspections } from "@vieticket/services/inspection";
import { headers } from "next/headers";

/**
 * Extracts the active organization ID from the user's session.
 */
async function getActiveOrganizationId(): Promise<string | null> {
    const organization = await auth.api.getFullOrganization({ 
        headers: await headers() 
    });
    return organization?.id ?? null;
}

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

        const activeOrganizationId = await getActiveOrganizationId();
        const ticketDetails = await inspectTicket(ticketId, user, activeOrganizationId);
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

        const activeOrganizationId = await getActiveOrganizationId();
        const updatedTicket = await checkInTicket(ticketId, user, activeOrganizationId);
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

        // Get active organization context (if any)
        const activeOrganizationId = await getActiveOrganizationId();

        const result = await processOfflineInspections(inspections, user, activeOrganizationId);
        return { success: true, data: result };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: { code: error.code, message: error.message } };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: { message: errorMessage } };
    }
}

/**
 * Server action to get all active events for the current user.
 * Supports both organizers and organization members.
 * @returns {Promise<{ success: boolean; data?: any; error?: any }>}
 */
export async function getActiveEventsAction() {
    try {
        const session = await getAuthSession(await headers());
        const user = session?.user as User;
        if (!user) {
            throw new Error("Unauthenticated.");
        }

        // Get active organization context (if any)
        const activeOrganizationId = await getActiveOrganizationId();

        const events = await getActiveEvents(user, activeOrganizationId);
        return { success: true, data: events };
    } catch (error) {
        if (error instanceof AppError) {
            return { success: false, error: { code: error.code, message: error.message } };
        }
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { success: false, error: { message: errorMessage } };
    }
}