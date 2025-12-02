"use server";

import {
  getEventById,
  createEventWithShowingsAndAreas,
  createEventWithShowingsAndAreasIndividual,
  createEventWithShowingsAndSeatMap,
  createEventWithShowingsAndSeatMapIndividual,
  updateEventWithShowingsAndSeatMap,
  updateEventWithShowingsAndSeatMapIndividual,
  updateEventWithShowingsAndAreas,
  updateEventWithShowingsAndAreasIndividual,
} from "@/lib/services/eventService";
import {
  duplicateSeatMapForEvent,
  findSeatMapWithShapesById,
} from "@vieticket/repos/seat-map";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { authorise } from "@/lib/auth/authorise";
import { slugify } from "@/lib/utils";
import { GridShape, AreaModeContainer } from "@/components/seat-map/types";

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
  if (description && description.length > 2000) {
    throw new Error("Description must be 2000 characters or less");
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

  validateEventName(eventName);
  validateEventDescription(description);
  validateEventLocation(location);
  validateUrl(posterUrl, "Poster URL");
  validateUrl(bannerUrl, "Banner URL");

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

  if (showings.length === 0) {
    throw new Error("At least one showing is required");
  }

  let duplicatedSeatMapId: string | null = null;
  let duplicatedSeatMapGrids: GridShape[] = [];
  let duplicatedDefaultSeatSettings: any = null;

  if (ticketingMode === "seatmap" && originalSeatMapId && seatMapData) {
    const duplicationResult = await duplicateSeatMapForEvent(
      originalSeatMapId,
      eventName,
      eventId,
      organizerId
    );

    if (!duplicationResult.success) {
      throw new Error(
        `Seat map duplication failed: ${duplicationResult.error}`
      );
    }

    duplicatedSeatMapId = duplicationResult.seatMapId!;

    const duplicatedSeatMap =
      await findSeatMapWithShapesById(duplicatedSeatMapId);
    if (!duplicatedSeatMap) {
      throw new Error("Failed to load duplicated seat map data");
    }

    duplicatedSeatMapGrids = extractGridsFromSeatMap(duplicatedSeatMap.shapes);

    const areaModeContainer = duplicatedSeatMap.shapes.find(
      (shape: any) =>
        shape.id === "area-mode-container-id" && shape.type === "container"
    ) as AreaModeContainer | undefined;

    duplicatedDefaultSeatSettings =
      areaModeContainer?.defaultSeatSettings ||
      JSON.parse(seatMapData).defaultSeatSettings;

    showings.forEach((showing) => {
      showing.seatMapId = duplicatedSeatMapId!;
    });
  }

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
    seatMapId: duplicatedSeatMapId || null,
    organizerId,
    approvalStatus: "pending" as const,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
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

    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      result = await createEventWithShowingsAndSeatMap(
        eventPayload,
        showings,
        duplicatedSeatMapGrids,
        duplicatedDefaultSeatSettings
      );
    } else {
      const showingSeatMapConfigs: GridShape[][] = [];

      for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
        const showingConfigData = formData.get(
          `showingConfigs[${showingIdx}].seatMapData`
        );

        if (showingConfigData) {
          const config = JSON.parse(showingConfigData as string);
          showingSeatMapConfigs.push(config.grids || duplicatedSeatMapGrids);
        } else {
          showingSeatMapConfigs.push(duplicatedSeatMapGrids);
        }
      }

      result = await createEventWithShowingsAndSeatMapIndividual(
        eventPayload,
        showings,
        showingSeatMapConfigs,
        duplicatedDefaultSeatSettings
      );
    }
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

  revalidatePath("/organizer/events");
  revalidatePath("/organizer");
  return result ? { eventId: result.eventId } : undefined;
}

export async function handleUpdateEvent(formData: FormData) {
  try {
    const session = await authorise("organizer");
    const organizerId = session.user.id;

    const eventId = formData.get("eventId") as string;
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

    let finalSeatMapId: string | null = existingEvent.seatMapId;
    let finalSeatMapGrids: GridShape[] = [];
    let finalDefaultSeatSettings: any = null;

    if (ticketingMode === "seatmap" && originalSeatMapId && seatMapData) {
      if (originalSeatMapId !== existingEvent.seatMapId) {
        const duplicationResult = await duplicateSeatMapForEvent(
          originalSeatMapId,
          eventName,
          eventId,
          organizerId
        );

        if (!duplicationResult.success) {
          throw new Error(
            `Seat map duplication failed: ${duplicationResult.error}`
          );
        }

        finalSeatMapId = duplicationResult.seatMapId!;

        const duplicatedSeatMap =
          await findSeatMapWithShapesById(finalSeatMapId);
        if (!duplicatedSeatMap) {
          throw new Error("Failed to load duplicated seat map data");
        }

        finalSeatMapGrids = extractGridsFromSeatMap(duplicatedSeatMap.shapes);

        const areaModeContainer = duplicatedSeatMap.shapes.find(
          (shape: any) =>
            shape.id === "area-mode-container-id" && shape.type === "container"
        ) as AreaModeContainer | undefined;

        finalDefaultSeatSettings =
          areaModeContainer?.defaultSeatSettings ||
          JSON.parse(seatMapData).defaultSeatSettings;
      } else {
        const existingSeatMap = await findSeatMapWithShapesById(
          finalSeatMapId!
        );
        if (!existingSeatMap) {
          throw new Error("Failed to load existing seat map data");
        }

        finalSeatMapGrids = extractGridsFromSeatMap(existingSeatMap.shapes);

        const areaModeContainer = existingSeatMap.shapes.find(
          (shape: any) =>
            shape.id === "area-mode-container-id" && shape.type === "container"
        ) as AreaModeContainer | undefined;

        finalDefaultSeatSettings =
          areaModeContainer?.defaultSeatSettings ||
          JSON.parse(seatMapData).defaultSeatSettings;
      }

      showings.forEach((showing) => {
        showing.seatMapId = finalSeatMapId!;
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

    const eventPayload = {
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
      seatMapId: finalSeatMapId,
      updatedAt: new Date(),
      organizerId,
      createdAt: existingEvent.createdAt
        ? new Date(existingEvent.createdAt)
        : new Date(),
      views: existingEvent.views,
      approvalStatus: existingEvent.approvalStatus,
    };

    let result;

    if (
      ticketingMode === "seatmap" &&
      finalSeatMapId &&
      finalSeatMapGrids.length > 0
    ) {
      if (finalSeatMapGrids.length === 0) {
        throw new Error("Seat map has no seating areas configured");
      }

      const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

      if (copyMode) {
        await updateEventWithShowingsAndSeatMap(
          eventPayload,
          showings,
          finalSeatMapGrids,
          finalDefaultSeatSettings
        );
      } else {
        const showingSeatMapConfigs: GridShape[][] = [];

        for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
          const showingConfigData = formData.get(
            `showingConfigs[${showingIdx}].seatMapData`
          );

          if (showingConfigData) {
            const config = JSON.parse(showingConfigData as string);
            showingSeatMapConfigs.push(config.grids || finalSeatMapGrids);
          } else {
            showingSeatMapConfigs.push(finalSeatMapGrids);
          }
        }

        await updateEventWithShowingsAndSeatMapIndividual(
          eventPayload,
          showings,
          showingSeatMapConfigs,
          finalDefaultSeatSettings
        );
      }
    } else {
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
