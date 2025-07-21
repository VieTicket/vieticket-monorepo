import * as ticketsRepo from "@vieticket/repos/tickets";
import * as inspectionRepo from "@vieticket/repos/inspection";
import { TicketInspectionStatus, User } from "@vieticket/db/pg/schema";
import { findActiveEventsByOrganizerId } from "@vieticket/repos/events";

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
 * @returns The full ticket details.
 */
export async function inspectTicket(ticketId: string, inspector: User) {
  if (inspector.role !== "organizer") {
    throw new AppError("Forbidden: Only organizers can perform this action.", "FORBIDDEN");
  }
  if (!ticketId || !uuidRegex.test(ticketId)) {
    throw new AppError("Invalid input: A valid ticketId is required.", "INVALID_INPUT");
  }

  // Check if ticket belongs to this organizer
  const isOwned = await inspectionRepo.isTicketOwnedByOrganizer(ticketId, inspector.id);
  if (!isOwned) {
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
 * @returns The updated ticket details.
 */
export async function checkInTicket(ticketId: string, inspector: User) {
  if (inspector.role !== "organizer") {
    throw new AppError("Forbidden: Only organizers can perform this action.", "FORBIDDEN");
  }
  if (!ticketId || !uuidRegex.test(ticketId)) {
    throw new AppError("Invalid input: A valid ticketId is required.", "INVALID_INPUT");
  }

  // Check if ticket belongs to this organizer
  const isOwned = await inspectionRepo.isTicketOwnedByOrganizer(ticketId, inspector.id);
  if (!isOwned) {
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
 */
export async function processOfflineInspections(
  inspections: Array<{ ticketId: string; timestamp: number }>,
  inspector: User
) {
  if (inspector.role !== "organizer") {
    throw new AppError("Forbidden: Only organizers can perform this action.", "FORBIDDEN");
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
 * Returns all active events for the given organizer.
 * "Active" means events that are approved and have not ended yet.
 * @param organizer - The organizer user object.
 * @returns An array of active events.
 * @throws AppError if the user is not an organizer.
 */
export async function getActiveEvents(organizer: User) {
  if (organizer.role !== "organizer") {
    throw new AppError("Forbidden: Only organizers can access their events.", "FORBIDDEN");
  }
  return await findActiveEventsByOrganizerId(organizer.id);
}