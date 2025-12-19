"use server";

import {
  getEventById,
  createEventWithShowingsAndAreas,
  createEventWithShowingsAndAreasIndividual,
  createEventWithShowingsAndSeatMap,
  updateEventWithShowingsAndSeatMap,
  updateEventWithShowingsAndAreas,
  updateEventWithShowingsAndAreasIndividual,
} from "@/lib/services/eventService";
import {
  duplicateSeatMapForEvent,
  findSeatMapWithShapesById,
} from "@vieticket/repos/seat-map";
import { v4 as uuidv4 } from "uuid";
import { areas, Event, rows, seats } from "@vieticket/db/pg/schemas/events";
import { revalidatePath } from "next/cache";
import { authorise } from "@/lib/auth/authorise";
import { slugify } from "@/lib/utils";
import { GridShape, AreaModeContainer } from "@/components/seat-map/types";
import { getAuthSession } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { db } from "@vieticket/db/pg";

/**
 * Validation functions cho event creation/update
 */
function validateEventName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Event name is required");
  }
  if (name.trim().length > 255) {
    throw new Error("Event name must be 255 characters or less");
  }
}

function validateEventDescription(description: string | null): void {
  if (description && description.length > 10000) {
    throw new Error("Description must be 10000 characters or less");
  }
}

function validateEventLocation(location: string | null): void {
  if (location && location.length > 500) {
    throw new Error("Location must be 500 characters or less");
  }
}

function validateMaxTicketsByOrder(maxTickets: number | null): void {
  if (maxTickets !== null) {
    if (!Number.isInteger(maxTickets) || maxTickets <= 0) {
      throw new Error("Max tickets by order must be a positive integer");
    }
    if (maxTickets > 100) {
      throw new Error("Max tickets by order cannot exceed 100");
    }
  }
}

function validateUrl(url: string | null, fieldName: string): void {
  if (url && url.trim().length > 0) {
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error(`${fieldName} must use HTTP or HTTPS protocol`);
      }
    } catch {
      throw new Error(`${fieldName} must be a valid URL`);
    }
  }
}

function validateDateLogic(
  startTime: Date,
  endTime: Date,
  fieldContext: string = ""
): void {
  if (startTime >= endTime) {
    throw new Error(`${fieldContext} End time must be after start time`);
  }
}

function validateSeatMapData(seatMapData: string): void {
  try {
    const parsed = JSON.parse(seatMapData);
    if (!parsed.grids || !Array.isArray(parsed.grids)) {
      throw new Error("Invalid seat map data: missing grids array");
    }
    if (parsed.grids.length === 0) {
      throw new Error("Seat map must have at least one seating area");
    }

    parsed.grids.forEach((grid: any, index: number) => {
      if (
        !grid.children ||
        grid.children.length <= 0 ||
        grid.children.length > 1000
      ) {
        throw new Error(`Grid ${index + 1}: rows must be between 1 and 1000`);
      }
      if (grid.seatSettings.price !== undefined) {
        validateTicketPrice(grid.seatSettings.price, `Grid ${index + 1}`);
      }
    });
  } catch (error: any) {
    if (error.message.includes("Grid")) {
      throw error;
    }
    throw new Error("Invalid seat map data: malformed JSON");
  }
}

function validateAreaData(
  areas: Array<{ name: string; seatCount: number; ticketPrice: number }>
): void {
  if (!areas || areas.length === 0) {
    throw new Error("At least one area is required");
  }

  areas.forEach((area, index) => {
    if (!area.name || area.name.trim().length === 0) {
      throw new Error(`Area ${index + 1}: name is required`);
    }
    if (area.name.trim().length > 50) {
      throw new Error(`Area ${index + 1}: name must be 50 characters or less`);
    }

    if (!Number.isInteger(area.seatCount) || area.seatCount <= 0) {
      throw new Error(
        `Area ${index + 1}: seat count must be a positive integer`
      );
    }
    if (area.seatCount > 50000) {
      throw new Error(`Area ${index + 1}: seat count cannot exceed 50,000`);
    }

    validateTicketPrice(area.ticketPrice, `Area ${index + 1}`);
  });
}

function validateTicketPrice(price: number, context: string = "Ticket"): void {
  if (!Number.isInteger(price) || price < 0) {
    throw new Error(`${context}: price must be a non-negative integer`);
  }
  if (price > 100000000) {
    throw new Error(`${context}: price cannot exceed 100,000,000 VND`);
  }
}

function validateShowings(
  showings: Array<{ name: string; startTime: Date; endTime: Date }>
): void {
  if (!showings || showings.length === 0) {
    throw new Error("At least one showing is required");
  }

  showings.forEach((showing, index) => {
    if (!showing.name || showing.name.trim().length === 0) {
      throw new Error(`Showing ${index + 1}: name is required`);
    }
    if (showing.name.trim().length > 100) {
      throw new Error(
        `Showing ${index + 1}: name must be 100 characters or less`
      );
    }

    if (
      !(showing.startTime instanceof Date) ||
      isNaN(showing.startTime.getTime())
    ) {
      throw new Error(`Showing ${index + 1}: invalid start time`);
    }
    if (
      !(showing.endTime instanceof Date) ||
      isNaN(showing.endTime.getTime())
    ) {
      throw new Error(`Showing ${index + 1}: invalid end time`);
    }

    validateDateLogic(
      showing.startTime,
      showing.endTime,
      `Showing ${index + 1}: `
    );
  });
}

function extractGridsFromSeatMap(seatMapShapes: any[]): GridShape[] {
  const areaModeContainer = seatMapShapes.find(
    (shape) =>
      shape.id === "area-mode-container-id" && shape.type === "container"
  ) as AreaModeContainer | undefined;

  if (!areaModeContainer || !areaModeContainer.children) {
    throw new Error("No area mode container found in duplicated seat map");
  }

  return areaModeContainer.children as GridShape[];
}

export async function handleCreateEvent(
  formData: FormData
): Promise<{ eventId?: string } | void> {
  const session = await authorise("organizer");
  const organizerId = session.user.id;

  const eventId = uuidv4();
  const eventName = formData.get("name") as string;
  const description = formData.get("description") as string;
  const location = formData.get("location") as string;
  const posterUrl = formData.get("posterUrl") as string;
  const bannerUrl = formData.get("bannerUrl") as string;
  const maxTicketsByOrderStr = formData.get("maxTicketsByOrder") as string;
  console.log("Creating event with data:", {
    eventName,
    description,
    location,
  });
  validateEventName(eventName);
  validateEventDescription(description);
  validateEventLocation(location);
  validateUrl(posterUrl, "Poster URL");
  validateUrl(bannerUrl, "Banner URL");
  console.log("Poster URL:", posterUrl);

  const maxTicketsByOrder = maxTicketsByOrderStr
    ? Number(maxTicketsByOrderStr)
    : null;
  validateMaxTicketsByOrder(maxTicketsByOrder);

  const slug = slugify(eventName, true);
  const ticketingMode = formData.get("ticketingMode") as string;
  const originalSeatMapId = formData.get("seatMapId") as string;
  const seatMapData = formData.get("seatMapData") as string;

  if (ticketingMode === "seatmap" && seatMapData) {
    validateSeatMapData(seatMapData);
  }

  console.log("Banner URL:", bannerUrl);

  let showingIndex = 0;
  const showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    ticketSaleStart?: Date | null;
    ticketSaleEnd?: Date | null;
    seatMapId?: string;
  }[] = [];
  while (true) {
    const name = formData.get(`showings[${showingIndex}].name`);
    const startTime = formData.get(`showings[${showingIndex}].startTime`);
    const endTime = formData.get(`showings[${showingIndex}].endTime`);

    if (!name || !startTime || !endTime) break;

    showings.push({
      name: name.toString(),
      startTime: new Date(startTime.toString()),
      endTime: new Date(endTime.toString()),
    });

    showingIndex++;
  }

  validateShowings(showings);

  const eventStartTime = showings[0].startTime;
  const eventEndTime = showings[showings.length - 1].endTime;

  const eventTicketSaleStart = formData.get("ticketSaleStart")
    ? (() => {
        const ticketSaleStartValue = formData.get("ticketSaleStart") as string;
        if (!ticketSaleStartValue || ticketSaleStartValue.trim() === "")
          return null;
        const date = new Date(ticketSaleStartValue);
        return isNaN(date.getTime()) ? null : date;
      })()
    : null;

  const eventTicketSaleEnd = formData.get("ticketSaleEnd")
    ? (() => {
        const ticketSaleEndValue = formData.get("ticketSaleEnd") as string;
        if (!ticketSaleEndValue || ticketSaleEndValue.trim() === "")
          return null;
        const date = new Date(ticketSaleEndValue);
        return isNaN(date.getTime()) ? null : date;
      })()
    : null;

  while (true) {
    const name = formData.get(`showings[${showingIndex}].name`);
    const startTime = formData.get(`showings[${showingIndex}].startTime`);
    const endTime = formData.get(`showings[${showingIndex}].endTime`);
    const ticketSaleStart = formData.get(
      `showings[${showingIndex}].ticketSaleStart`
    );
    const ticketSaleEnd = formData.get(
      `showings[${showingIndex}].ticketSaleEnd`
    );

    if (!name || !startTime || !endTime) break;

    const startDate = new Date(startTime.toString());
    const endDate = new Date(endTime.toString());

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`Invalid date format in showing: ${name}`);
    }

    const ticketSaleStartDate =
      ticketSaleStart && ticketSaleStart.toString().trim() !== ""
        ? (() => {
            const date = new Date(ticketSaleStart.toString());
            return isNaN(date.getTime()) ? null : date;
          })()
        : (() => {
            const date = new Date(startDate);
            date.setDate(date.getDate() - 7);
            return date;
          })();

    const ticketSaleEndDate =
      ticketSaleEnd && ticketSaleEnd.toString().trim() !== ""
        ? (() => {
            const date = new Date(ticketSaleEnd.toString());
            return isNaN(date.getTime()) ? null : date;
          })()
        : (() => {
            const date = new Date(startDate);
            date.setHours(date.getHours() - 1);
            return date;
          })();

    showings.push({
      name: name.toString(),
      startTime: startDate,
      endTime: endDate,
      ticketSaleStart: ticketSaleStartDate,
      ticketSaleEnd: ticketSaleEndDate,
    });

    showingIndex++;
  }

  console.log("Showings:", showings);

  if (showings.length === 0) {
    throw new Error("At least one showing is required");
  }

  let duplicatedSeatMapId: string[] | null = null;
  let duplicatedSeatMapGrids: GridShape[][] = [];
  let duplicatedDefaultSeatSettings: any = null;

  if (ticketingMode === "seatmap" && originalSeatMapId && seatMapData) {
    for (let i = 0; i < showings.length; i++) {
      const duplicationResult = await duplicateSeatMapForEvent(
        originalSeatMapId,
        showings[i].name,
        eventId,
        organizerId
      );

      if (!duplicationResult.success) {
        throw new Error(
          `Seat map duplication failed: ${duplicationResult.error}`
        );
      }

      if (!duplicationResult) {
        throw new Error("Failed to load duplicated seat map data");
      }
      if (duplicatedSeatMapId === null) {
        duplicatedSeatMapId = [];
        duplicatedSeatMapId.push(duplicationResult.seatMap!.id!);
      } else {
        duplicatedSeatMapId.push(duplicationResult.seatMap!.id!);
      }
      const grids = extractGridsFromSeatMap(duplicationResult.seatMap!.shapes);
      duplicatedSeatMapGrids.push(grids);

      const areaModeContainer = duplicationResult.seatMap!.shapes.find(
        (shape: any) =>
          shape.id === "area-mode-container-id" && shape.type === "container"
      ) as AreaModeContainer | undefined;

      duplicatedDefaultSeatSettings =
        areaModeContainer?.defaultSeatSettings ||
        JSON.parse(seatMapData).defaultSeatSettings;
    }
    showings.forEach((showing, i) => {
      showing.seatMapId = duplicatedSeatMapId![i];
    });
  }

  console.log("Showings after seat map assignment:", showings);

  // For normal event creation, always start with "NotYet" status and null metadata
  // Evidence will be submitted separately via EventCard button
  const eventMetadata = null;
  const approvalStatus: "NotYet" = "NotYet";

  const eventPayload = {
    id: eventId,
    name: eventName,
    slug,
    description: description || null,
    startTime: eventStartTime,
    endTime: eventEndTime,
    location: location || null,
    type: (formData.get("type") as string) || null,
    maxTicketsByOrder: maxTicketsByOrder,
    ticketSaleStart: eventTicketSaleStart,
    ticketSaleEnd: eventTicketSaleEnd,
    posterUrl: posterUrl || null,
    bannerUrl: bannerUrl || null,
    seatMapId: duplicatedSeatMapId ? duplicatedSeatMapId[0] : null,
    organizerId,
    organizationId: null,
    approvalStatus,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lifecycleStatus: "scheduled" as const,
    autoApproveRefund: false as const,
    eventMetadata,
  };

  let result;

  if (
    ticketingMode === "seatmap" &&
    duplicatedSeatMapId &&
    duplicatedSeatMapGrids.length > 0
  ) {
    if (duplicatedSeatMapGrids.length === 0) {
      throw new Error("Duplicated seat map has no seating areas configured");
    }

    console.log("Duplicated seat map grids:", duplicatedSeatMapGrids);

    result = await createEventWithShowingsAndSeatMap(
      eventPayload,
      showings,
      duplicatedSeatMapGrids,
      duplicatedDefaultSeatSettings
    );
    console.log("Event created with seat map (copy mode):", result);
  } else {
    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      const areas: {
        name: string;
        seatCount: number;
        ticketPrice: number;
      }[] = [];

      let areaIndex = 0;
      while (true) {
        const name = formData.get(`showingConfigs[0].areas[${areaIndex}].name`);
        const seatCount = formData.get(
          `showingConfigs[0].areas[${areaIndex}].seatCount`
        );
        const ticketPrice = formData.get(
          `showingConfigs[0].areas[${areaIndex}].ticketPrice`
        );

        if (!name || !seatCount || !ticketPrice) {
          break;
        }

        areas.push({
          name: name.toString(),
          seatCount: Number(seatCount),
          ticketPrice: Number(ticketPrice),
        });

        areaIndex++;
      }

      validateAreaData(areas);

      result = await createEventWithShowingsAndAreas(
        eventPayload,
        showings,
        areas
      );
    } else {
      const showingAreaConfigs: Array<
        {
          name: string;
          seatCount: number;
          ticketPrice: number;
        }[]
      > = [];

      for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
        const areas: {
          name: string;
          seatCount: number;
          ticketPrice: number;
        }[] = [];

        let areaIndex = 0;
        while (true) {
          const name = formData.get(
            `showingConfigs[${showingIdx}].areas[${areaIndex}].name`
          );
          const seatCount = formData.get(
            `showingConfigs[${showingIdx}].areas[${areaIndex}].seatCount`
          );
          const ticketPrice = formData.get(
            `showingConfigs[${showingIdx}].areas[${areaIndex}].ticketPrice`
          );

          if (!name || !seatCount || !ticketPrice) break;

          areas.push({
            name: name.toString(),
            seatCount: Number(seatCount),
            ticketPrice: Number(ticketPrice),
          });

          areaIndex++;
        }

        if (areas.length === 0) {
          throw new Error(
            `Showing ${showingIdx + 1} must have at least one area`
          );
        }

        validateAreaData(areas);
        showingAreaConfigs.push(areas);
      }

      result = await createEventWithShowingsAndAreasIndividual(
        eventPayload,
        showings,
        showingAreaConfigs
      );
    }
  }

  console.log("Event creation result:", result);
  revalidatePath("/organizer/events");
  revalidatePath("/organizer");
  return result ? { eventId: result.eventId } : undefined;
}

export async function handleUpdateEvent(formData: FormData) {
  try {
    const session = await authorise("organizer");
    const organizerId = session.user.id;

    const eventId = formData.get("eventId") as string;
    const evidenceDataStr = formData.get("evidenceData") as string;

    // Check if this is an evidence-only submission
    const isEvidenceOnlySubmission = evidenceDataStr && !formData.get("name");

    if (isEvidenceOnlySubmission) {
      // Handle evidence-only submission - just update metadata and approval status
      const existingEvent = await getEventById(eventId);
      if (!existingEvent) {
        return { success: false, error: "Event not found" };
      }

      // Parse evidence data
      let eventMetadata = existingEvent.eventMetadata;
      let approvalStatus = existingEvent.approvalStatus;

      if (evidenceDataStr) {
        try {
          const evidenceData = JSON.parse(evidenceDataStr);
          eventMetadata = {
            eventProofDocuments: evidenceData.evidenceDocuments,
            contractScreenshotUrl: evidenceData.contractScreenshotUrl || null,
          };
          if (existingEvent.approvalStatus === "NotYet") {
            approvalStatus = "pending";
          }
        } catch (error) {
          console.error("Failed to parse evidence data:", error);
          return { success: false, error: "Invalid evidence data format" };
        }
      }

      // Use direct database update to avoid area validation
      try {
        const { db } = await import("@/lib/db");
        const { events } = await import("@vieticket/db/pg/schema");
        const { eq } = await import("drizzle-orm");

        await db
          .update(events)
          .set({
            approvalStatus: approvalStatus as any,
            eventMetadata,
            updatedAt: new Date(),
          })
          .where(eq(events.id, eventId));

        revalidatePath("/organizer/events");
        revalidatePath("/organizer");
        revalidatePath(`/event/${existingEvent.slug}`);
        return { success: true, data: { eventId } };
      } catch (error) {
        console.error("Failed to update event metadata:", error);
        return { success: false, error: "Failed to update event" };
      }
    }

    // Continue with full event update logic
    const eventName = formData.get("name") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const posterUrl = formData.get("posterUrl") as string;
    const bannerUrl = formData.get("bannerUrl") as string;
    const maxTicketsByOrderStr = formData.get("maxTicketsByOrder") as string;

    validateEventName(eventName);
    validateEventDescription(description);
    validateEventLocation(location);
    validateUrl(posterUrl, "Poster URL");
    validateUrl(bannerUrl, "Banner URL");

    const maxTicketsByOrder = maxTicketsByOrderStr
      ? Number(maxTicketsByOrderStr)
      : null;
    validateMaxTicketsByOrder(maxTicketsByOrder);

    const ticketingMode = formData.get("ticketingMode") as string;
    const originalSeatMapId = formData.get("seatMapId") as string;
    const seatMapData = formData.get("seatMapData") as string;

    if (ticketingMode === "seatmap" && seatMapData) {
      validateSeatMapData(seatMapData);
    }

    const existingEvent = await getEventById(eventId);
    console.log("Existing Event:", existingEvent);
    if (!existingEvent) {
      return { success: false, error: "Event not found" };
    }

    const showings: {
      name: string;
      startTime: Date;
      endTime: Date;
      ticketSaleStart?: Date | null;
      ticketSaleEnd?: Date | null;
      seatMapId?: string;
    }[] = [];

    let showingIndex = 0;
    while (true) {
      const name = formData.get(`showings[${showingIndex}].name`);
      const startTime = formData.get(`showings[${showingIndex}].startTime`);
      const endTime = formData.get(`showings[${showingIndex}].endTime`);
      const ticketSaleStart = formData.get(
        `showings[${showingIndex}].ticketSaleStart`
      );
      const ticketSaleEnd = formData.get(
        `showings[${showingIndex}].ticketSaleEnd`
      );

      if (!name || !startTime || !endTime) break;

      if (
        startTime.toString().trim() === "" ||
        endTime.toString().trim() === ""
      ) {
        showingIndex++;
        continue;
      }

      const startDate = new Date(startTime.toString());
      const endDate = new Date(endTime.toString());

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(`Invalid date format in showing: ${name}`);
      }

      const ticketSaleStartDate =
        ticketSaleStart && ticketSaleStart.toString().trim() !== ""
          ? (() => {
              const date = new Date(ticketSaleStart.toString());
              return isNaN(date.getTime()) ? null : date;
            })()
          : null;

      const ticketSaleEndDate =
        ticketSaleEnd && ticketSaleEnd.toString().trim() !== ""
          ? (() => {
              const date = new Date(ticketSaleEnd.toString());
              return isNaN(date.getTime()) ? null : date;
            })()
          : null;

      showings.push({
        name: name.toString(),
        startTime: startDate,
        endTime: endDate,
        ticketSaleStart: ticketSaleStartDate,
        ticketSaleEnd: ticketSaleEndDate,
      });

      showingIndex++;
    }

    let finalSeatMapIds: string[] = [];
    let finalSeatMapGrids: GridShape[][] = [];
    let finalDefaultSeatSettings: any = null;
    let seatMapChanged = false;

    if (ticketingMode === "seatmap" && originalSeatMapId && seatMapData) {
      // ✅ Check if seat map changed by comparing with any existing showing's seatMapId
      const existingSeatMapId =
        existingEvent.showings?.[0]?.seatMapId || existingEvent.seatMapId;

      if (originalSeatMapId !== existingSeatMapId) {
        // ✅ Seat map changed - create new duplicated seat maps for each showing
        seatMapChanged = true;

        for (let i = 0; i < showings.length; i++) {
          const duplicationResult = await duplicateSeatMapForEvent(
            originalSeatMapId,
            `${eventName}_${showings[i].name}`,
            eventId,
            organizerId
          );

          if (!duplicationResult.success) {
            throw new Error(
              `Seat map duplication failed for showing ${i + 1}: ${duplicationResult.error}`
            );
          }

          finalSeatMapIds.push(duplicationResult.seatMap!.id!);
          const grids = extractGridsFromSeatMap(
            duplicationResult.seatMap!.shapes
          );
          finalSeatMapGrids.push(grids);

          // Get default settings from the first seat map
          if (i === 0) {
            const areaModeContainer = duplicationResult.seatMap!.shapes.find(
              (shape: any) =>
                shape.id === "area-mode-container-id" &&
                shape.type === "container"
            ) as AreaModeContainer | undefined;

            finalDefaultSeatSettings =
              areaModeContainer?.defaultSeatSettings ||
              JSON.parse(seatMapData).defaultSeatSettings;
          }
        }
      } else {
        // ✅ Seat map unchanged - use existing seat maps for each showing
        seatMapChanged = false;

        for (let i = 0; i < showings.length; i++) {
          // Get the existing seat map for this showing
          const existingShowingSeatMapId =
            existingEvent.showings?.[i]?.seatMapId || existingSeatMapId;

          const existingSeatMap = await findSeatMapWithShapesById(
            existingShowingSeatMapId
          );
          if (!existingSeatMap) {
            throw new Error(
              `Failed to load existing seat map data for showing ${i + 1}`
            );
          }

          finalSeatMapIds.push(existingShowingSeatMapId);
          const grids = extractGridsFromSeatMap(existingSeatMap.shapes);
          finalSeatMapGrids.push(grids);

          // Get default settings from the first seat map
          if (i === 0) {
            const areaModeContainer = existingSeatMap.shapes.find(
              (shape: any) =>
                shape.id === "area-mode-container-id" &&
                shape.type === "container"
            ) as AreaModeContainer | undefined;

            finalDefaultSeatSettings =
              areaModeContainer?.defaultSeatSettings ||
              JSON.parse(seatMapData).defaultSeatSettings;
          }
        }
      }

      // Assign seat map IDs to each showing
      showings.forEach((showing, i) => {
        showing.seatMapId = finalSeatMapIds[i];
      });
    }

    const eventStartTime =
      showings.length > 0
        ? new Date(
            Math.min(
              ...showings.map((s) => {
                const time = s.startTime.getTime();
                return isNaN(time) ? Date.now() : time;
              })
            )
          )
        : existingEvent.startTime
          ? new Date(existingEvent.startTime)
          : new Date();

    const eventEndTime =
      showings.length > 0
        ? new Date(
            Math.max(
              ...showings.map((s) => {
                const time = s.endTime.getTime();
                return isNaN(time) ? Date.now() : time;
              })
            )
          )
        : existingEvent.endTime
          ? new Date(existingEvent.endTime)
          : new Date();

    const eventPayload: Event = {
      id: eventId,
      name: formData.get("name") as string,
      slug: existingEvent.slug,
      description: (formData.get("description") as string) || null,
      startTime: eventStartTime,
      endTime: eventEndTime,
      location: (formData.get("location") as string) || null,
      type: (formData.get("type") as string) || null,
      maxTicketsByOrder: formData.get("maxTicketsByOrder")
        ? Number(formData.get("maxTicketsByOrder"))
        : null,
      ticketSaleStart: formData.get("ticketSaleStart")
        ? (() => {
            const ticketSaleStartValue = formData.get(
              "ticketSaleStart"
            ) as string;
            if (!ticketSaleStartValue || ticketSaleStartValue.trim() === "")
              return null;
            const date = new Date(ticketSaleStartValue);
            return isNaN(date.getTime()) ? null : date;
          })()
        : null,
      ticketSaleEnd: formData.get("ticketSaleEnd")
        ? (() => {
            const ticketSaleEndValue = formData.get("ticketSaleEnd") as string;
            if (!ticketSaleEndValue || ticketSaleEndValue.trim() === "")
              return null;
            const date = new Date(ticketSaleEndValue);
            return isNaN(date.getTime()) ? null : date;
          })()
        : null,
      posterUrl: (formData.get("posterUrl") as string) || null,
      bannerUrl: (formData.get("bannerUrl") as string) || null,
      seatMapId: finalSeatMapIds[0] || existingEvent.seatMapId,
      updatedAt: new Date(),
      organizerId,
      organizationId: null,
      createdAt: existingEvent.createdAt
        ? new Date(existingEvent.createdAt)
        : new Date(),
      views: existingEvent.views,
      approvalStatus: existingEvent.approvalStatus, // Don't change status in normal updates
      lifecycleStatus: existingEvent.lifecycleStatus ?? "scheduled",
      autoApproveRefund: existingEvent.autoApproveRefund ?? false,
      eventMetadata: existingEvent.eventMetadata, // Keep existing metadata
    };

    let result;

    if (
      ticketingMode === "seatmap" &&
      finalSeatMapIds.length > 0 &&
      finalSeatMapGrids.length > 0
    ) {
      if (finalSeatMapGrids.some((grids) => grids.length === 0)) {
        throw new Error(
          "One or more seat maps have no seating areas configured"
        );
      }

      const seatMapChanged = originalSeatMapId !== existingEvent.seatMapId;
      await updateEventWithShowingsAndSeatMap(
        eventPayload,
        showings,
        finalSeatMapGrids,
        finalDefaultSeatSettings,
        seatMapChanged // ✅ Pass the flag to indicate if seat map changed
      );
    } else {
      // Handle simple ticketing mode
      const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

      if (copyMode) {
        const areas: {
          name: string;
          seatCount: number;
          ticketPrice: number;
        }[] = [];

        let index = 0;
        while (true) {
          const name = formData.get(`showingConfigs[0].areas[${index}].name`);
          const seatCount = formData.get(
            `showingConfigs[0].areas[${index}].seatCount`
          );
          const ticketPrice = formData.get(
            `showingConfigs[0].areas[${index}].ticketPrice`
          );

          if (!name || !seatCount || !ticketPrice) break;

          areas.push({
            name: name.toString(),
            seatCount: Number(seatCount),
            ticketPrice: Number(ticketPrice),
          });

          index++;
        }

        if (areas.length === 0) {
          throw new Error("At least one area is required for simple ticketing");
        }

        await updateEventWithShowingsAndAreas(eventPayload, showings, areas);
      } else {
        const showingAreaConfigs: Array<
          {
            name: string;
            seatCount: number;
            ticketPrice: number;
          }[]
        > = [];

        for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
          const areas: {
            name: string;
            seatCount: number;
            ticketPrice: number;
          }[] = [];

          let areaIndex = 0;
          while (true) {
            const name = formData.get(
              `showingConfigs[${showingIdx}].areas[${areaIndex}].name`
            );
            const seatCount = formData.get(
              `showingConfigs[${showingIdx}].areas[${areaIndex}].seatCount`
            );
            const ticketPrice = formData.get(
              `showingConfigs[${showingIdx}].areas[${areaIndex}].ticketPrice`
            );

            if (!name || !seatCount || !ticketPrice) break;

            areas.push({
              name: name.toString(),
              seatCount: Number(seatCount),
              ticketPrice: Number(ticketPrice),
            });

            areaIndex++;
          }

          if (areas.length === 0) {
            throw new Error(
              `Showing ${showingIdx + 1} must have at least one area`
            );
          }

          showingAreaConfigs.push(areas);
        }

        await updateEventWithShowingsAndAreasIndividual(
          eventPayload,
          showings,
          showingAreaConfigs
        );
      }
    }

    revalidatePath("/organizer/events");
    revalidatePath("/organizer");
    revalidatePath(`/event/${existingEvent.slug}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating event:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}

export const fetchEventById = async (id: string) => {
  try {
    const event = await getEventById(id);

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    return { success: true, data: event };
  } catch (error) {
    console.error("Error in fetchEventById:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
};

interface SyncSeatMapToEventParams {
  eventId: string;
  seatMapId: string;
  grids: GridShape[];
  createdEntityIds: {
    grids: string[];
    rows: Array<{ id: string; gridId: string }>;
    seats: Array<{ id: string; rowId: string; gridId: string }>;
  };
}

export async function syncSeatMapToEventAction(
  params: SyncSeatMapToEventParams
) {
  try {
    const session = await getAuthSession(await headers());
    const user = session?.user;

    if (!user) {
      throw new Error("Unauthenticated: Please sign in to sync seat maps.");
    }

    const { eventId, seatMapId, grids, createdEntityIds } = params;

    // 1. Get the event
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // 2. Find the showing that uses this seat map
    const showing = event.showings?.find((s) => s.seatMapId === seatMapId);
    if (!showing) {
      throw new Error(`No showing found using seat map ${seatMapId}`);
    }

    console.log(`🔄 Syncing seat map ${seatMapId} to showing ${showing.id}`);

    // 3. Filter grids to only include those created in this session
    const newGrids = grids.filter((grid) =>
      createdEntityIds.grids.includes(grid.id)
    );

    if (newGrids.length === 0) {
      console.log("ℹ️ No new grids to sync");
      return { success: true, message: "No new changes to sync" };
    }

    // 4. Process each new grid
    const processedAreas = [];

    for (const grid of newGrids) {
      // Get rows created in this session for this grid
      const newRowIds = createdEntityIds.rows
        .filter((row) => row.gridId === grid.id)
        .map((row) => row.id);

      const newRows = grid.children.filter((row) => newRowIds.includes(row.id));

      if (newRows.length === 0) continue;

      // Create area for this grid
      const [createdArea] = await db
        .insert(areas)
        .values({
          id: grid.id,
          eventId: eventId,
          showingId: showing.id,
          name: grid.gridName || grid.name,
          price: grid.seatSettings?.price || 0,
        })
        .returning();

      console.log(
        `✅ Created area ${createdArea.id} for showing ${showing.id}`
      );

      // Process rows
      const processedRows = [];

      for (const row of newRows) {
        // Get seats created in this session for this row
        const newSeatIds = createdEntityIds.seats
          .filter((seat) => seat.rowId === row.id && seat.gridId === grid.id)
          .map((seat) => seat.id);

        const newSeats = row.children.filter((seat) =>
          newSeatIds.includes(seat.id)
        );

        if (newSeats.length === 0) continue;

        // Create row
        const [createdRow] = await db
          .insert(rows)
          .values({
            id: row.id,
            areaId: createdArea.id,
            rowName: row.rowName || row.name,
          })
          .returning();

        console.log(
          `✅ Created row ${createdRow.id} in area ${createdArea.id}`
        );

        // Create seats
        const seatValues = newSeats.map((seat, index) => ({
          id: seat.id,
          rowId: createdRow.id,
          seatNumber: (index + 1).toString(),
        }));

        if (seatValues.length > 0) {
          await db.insert(seats).values(seatValues);
          console.log(
            `✅ Created ${seatValues.length} seats in row ${createdRow.id}`
          );
        }

        processedRows.push({
          rowId: createdRow.id,
          seatCount: seatValues.length,
        });
      }

      processedAreas.push({
        areaId: createdArea.id,
        rowCount: processedRows.length,
        totalSeats: processedRows.reduce((sum, r) => sum + r.seatCount, 0),
      });
    }

    return {
      success: true,
      data: {
        showingId: showing.id,
        areasCreated: processedAreas.length,
        totalSeats: processedAreas.reduce((sum, a) => sum + a.totalSeats, 0),
        processedAreas,
      },
    };
  } catch (error) {
    console.error("Error syncing seat map to event:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
