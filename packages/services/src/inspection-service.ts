import { TicketInspectionStatus, User } from "@vieticket/db/pg/schema";
import * as inspectionRepo from "@vieticket/repos/inspection";
import * as ticketsRepo from "@vieticket/repos/tickets";

export class AppError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Inspects a ticket and returns its details without changing its status.
 * Logs the inspection event.
 * @param ticketId - The ID of the ticket to inspect.
 * @param inspector - The user performing the inspection.
 * @param activeOrganizationId - The active organization ID from the inspector's session (if any).
 * @returns The full ticket details.
 */
export async function inspectTicket(
  ticketId: string, 
  inspector: User,
  activeOrganizationId?: string | null
) {
  if (!ticketId || !uuidRegex.test(ticketId)) {
    throw new AppError("Invalid input: A valid ticketId is required.", "INVALID_INPUT");
  }

  // Check if user can access this ticket (either as direct owner or through organization)
  const hasAccess = await inspectionRepo.canUserAccessTicket(ticketId, inspector.id, activeOrganizationId);
  if (!hasAccess) {
    throw new AppError("Forbidden: Ticket does not belong to your events.", "FORBIDDEN");
  }

  const ticket = await ticketsRepo.findTicketByIdWithEventInfo(ticketId);
  if (!ticket) {
    throw new AppError("Ticket not found.", "TICKET_NOT_FOUND");
  }

  // Log the inspection
  await ticketsRepo.logTicketInspection(
    ticketId,
    inspector.id,
    ticket.status === "active" ? "valid" : "invalid"
  );

  return ticket;
}

/**
 * Checks in a ticket, marking its status as 'used'.
 * Prevents duplicate check-ins.
 * @param ticketId - The ID of the ticket to check in.
 * @param inspector - The user performing the check-in.
 * @param activeOrganizationId - The active organization ID from the inspector's session (if any).
 * @returns The updated ticket details.
 */
export async function checkInTicket(
  ticketId: string, 
  inspector: User,
  activeOrganizationId?: string | null
) {
  if (!ticketId || !uuidRegex.test(ticketId)) {
    throw new AppError("Invalid input: A valid ticketId is required.", "INVALID_INPUT");
  }

  // Check if user can access this ticket (either as direct owner or through organization)
  const hasAccess = await inspectionRepo.canUserAccessTicket(ticketId, inspector.id, activeOrganizationId);
  if (!hasAccess) {
    throw new AppError("Forbidden: Ticket does not belong to your events.", "FORBIDDEN");
  }

  // Atomic check-in and log
  const { ticket, status } = await inspectionRepo.atomicCheckInAndLog(ticketId, inspector.id);

  if (!ticket) {
    throw new AppError("Ticket not found.", "TICKET_NOT_FOUND");
  }
  if (status === "duplicate") {
    return ticket;
  }
  if (status === "not_active") {
    throw new AppError(`Bad Request: Ticket is not active (status: ${ticket.status}).`, "TICKET_NOT_ACTIVE");
  }

  ticket.status = "active";
  return ticket;
}

/**
 * Processes a batch of offline ticket inspections.
 * @param inspections - An array of offline inspection data.
 * @param inspector - The user who performed the inspections.
 * @param activeOrganizationId - The active organization ID from the inspector's session (if any).
 */
export async function processOfflineInspections(
  inspections: Array<{ ticketId: string; timestamp: number }>,
  inspector: User,
  activeOrganizationId?: string | null
) {
  // Check if user has access (organizer role OR organization member)
  if (inspector.role !== "organizer") {
    // If not organizer, must be an organization member
    if (!activeOrganizationId) {
      throw new AppError("Forbidden: You don't have permission to perform this action.", "FORBIDDEN");
    }
    
    const { isUserMemberOfOrganization } = await import("@vieticket/repos/organization");
    const isMember = await isUserMemberOfOrganization(inspector.id, activeOrganizationId);
    if (!isMember) {
      throw new AppError("Forbidden: You don't have permission to perform this action.", "FORBIDDEN");
    }
  }

  if (!Array.isArray(inspections)) {
    throw new AppError("Invalid input: Inspections must be an array.", "INVALID_INPUT");
  }

  for (const inspection of inspections) {
    if (!inspection.ticketId || !uuidRegex.test(inspection.ticketId) || typeof inspection.timestamp !== 'number') {
      throw new AppError("Invalid input: Each inspection must have a valid ticketId and timestamp.", "INVALID_INPUT");
    }
  }

  const inspectionDataToLog = inspections.map((inspection) => ({
    ticketId: inspection.ticketId,
    inspectorId: inspector.id,
    status: "offline" as TicketInspectionStatus,
    inspectedAt: new Date(inspection.timestamp),
  }));

  if (inspectionDataToLog.length > 0) {
    await ticketsRepo.batchLogTicketInspections(inspectionDataToLog);
  }

  return { message: `${inspections.length} offline inspections processed.` };
}

/**
 * Returns all active events for the given user.
 * "Active" means events that are approved and have not ended yet.
 * Access is granted if user has organizer role OR is a member of an organization.
 * @param user - The user object.
 * @param activeOrganizationId - The active organization ID from the user's session (if any).
 * @returns An array of active events.
 * @throws AppError if the user doesn't have access.
 */
export async function getActiveEvents(user: User, activeOrganizationId?: string | null) {
  // Import the new function
  const { findAccessibleActiveEvents } = await import("@vieticket/repos/events");
  
  // Organizers always have access
  if (user.role === "organizer") {
    return await findAccessibleActiveEvents(user.id, activeOrganizationId);
  }
  
  // If there's an active organization, check if user is a member
  if (activeOrganizationId) {
    const { isUserMemberOfOrganization } = await import("@vieticket/repos/organization");
    const isMember = await isUserMemberOfOrganization(user.id, activeOrganizationId);
    if (isMember) {
      return await findAccessibleActiveEvents(user.id, activeOrganizationId);
    }
  }
  
  throw new AppError("Forbidden: You don't have permission to access events.", "FORBIDDEN");
}
