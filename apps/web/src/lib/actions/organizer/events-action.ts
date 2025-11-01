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
import { revalidatePath } from "next/cache";
import { authorise } from "@/lib/auth/authorise";
import { slugify } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";
import { SeatMapGridData } from "@/types/event-types";

const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "ol",
      "ul",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "a",
    ],
    ALLOWED_ATTR: ["href", "title", "target"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
    ],
    FORBID_ATTR: [
      "onclick",
      "onload",
      "onerror",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  });
};

export async function handleCreateEvent(
  formData: FormData
): Promise<{ eventId?: string } | void> {
  const session = await authorise("organizer");
  const organizerId = session.user.id;

  const eventName = formData.get("name") as string;
  const slug = slugify(eventName, true);
  const ticketingMode = formData.get("ticketingMode") as string;
  const seatMapId = formData.get("seatMapId") as string;
  const seatMapData = formData.get("seatMapData") as string;

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
      seatMapId: ticketingMode === "seatmap" ? seatMapId : undefined,
    });

    showingIndex++;
  }

  if (showings.length === 0) {
    throw new Error("At least one showing is required");
  }

  const eventStartTime = showings[0].startTime;
  const eventEndTime = showings[showings.length - 1].endTime;

  const eventPayload = {
    name: eventName,
    slug,
    description: formData.get("description")
      ? sanitizeHTML(formData.get("description") as string)
      : null,
    startTime: eventStartTime,
    endTime: eventEndTime,
    location: (formData.get("location") as string) || null,
    type: (formData.get("type") as string) || null,
    maxTicketsByOrder: formData.get("maxTicketsByOrder")
      ? Number(formData.get("maxTicketsByOrder"))
      : null,
    ticketSaleStart: eventTicketSaleStart,
    ticketSaleEnd: eventTicketSaleEnd,
    posterUrl: (formData.get("posterUrl") as string) || null,
    bannerUrl: (formData.get("bannerUrl") as string) || null,
    seatMapId: seatMapId || null,
    organizerId,
    approvalStatus: "pending" as const,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let result;

  if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
    const parsedSeatMapData = JSON.parse(seatMapData);
    const grids: SeatMapGridData[] = parsedSeatMapData.grids || [];
    const defaultSeatSettings = parsedSeatMapData.defaultSeatSettings;

    if (grids.length === 0) {
      throw new Error("Seat map has no seating areas configured");
    }

    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      result = await createEventWithShowingsAndSeatMap(
        eventPayload,
        showings,
        grids,
        defaultSeatSettings
      );
    } else {
      const showingSeatMapConfigs: SeatMapGridData[][] = [];

      for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
        const showingConfigData = formData.get(
          `showingConfigs[${showingIdx}].seatMapData`
        );

        if (showingConfigData) {
          const config = JSON.parse(showingConfigData as string);
          showingSeatMapConfigs.push(config.grids || grids);
        } else {
          showingSeatMapConfigs.push(grids);
        }
      }

      result = await createEventWithShowingsAndSeatMapIndividual(
        eventPayload,
        showings,
        showingSeatMapConfigs,
        defaultSeatSettings
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
        const name = formData.get(`areas[${areaIndex}][name]`);
        const seatCount = formData.get(`areas[${areaIndex}][seatCount]`);
        const ticketPrice = formData.get(`areas[${areaIndex}][ticketPrice]`);

        if (!name || !seatCount || !ticketPrice) break;

        areas.push({
          name: name.toString(),
          seatCount: Number(seatCount),
          ticketPrice: Number(ticketPrice),
        });

        areaIndex++;
      }

      if (areas.length === 0) {
        throw new Error("At least one area is required for simple ticketing");
      }

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
  const session = await authorise("organizer");
  const organizerId = session.user.id;

  const eventId = formData.get("eventId") as string;
  const ticketingMode = formData.get("ticketingMode") as string;
  const seatMapId = formData.get("seatMapId") as string;
  const seatMapData = formData.get("seatMapData") as string;

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    throw new Error("Event not found");
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
      seatMapId: ticketingMode === "seatmap" ? seatMapId : undefined,
    });

    showingIndex++;
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
    description: formData.get("description")
      ? sanitizeHTML(formData.get("description") as string)
      : null,
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
    seatMapId: seatMapId || null,
    updatedAt: new Date(),
    organizerId,
    createdAt: existingEvent.createdAt
      ? new Date(existingEvent.createdAt)
      : new Date(),
    views: existingEvent.views,
    approvalStatus: existingEvent.approvalStatus,
  };

  let result;

  if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
    const parsedSeatMapData = JSON.parse(seatMapData);
    const grids: SeatMapGridData[] = parsedSeatMapData.grids || [];
    const defaultSeatSettings = parsedSeatMapData.defaultSeatSettings;

    if (grids.length === 0) {
      throw new Error("Seat map has no seating areas configured");
    }

    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      await updateEventWithShowingsAndSeatMap(
        eventPayload,
        showings,
        grids,
        defaultSeatSettings
      );
    } else {
      const showingSeatMapConfigs: SeatMapGridData[][] = [];

      for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
        const showingConfigData = formData.get(
          `showingConfigs[${showingIdx}].seatMapData`
        );

        if (showingConfigData) {
          const config = JSON.parse(showingConfigData as string);
          showingSeatMapConfigs.push(config.grids || grids);
        } else {
          showingSeatMapConfigs.push(grids);
        }
      }

      await updateEventWithShowingsAndSeatMapIndividual(
        eventPayload,
        showings,
        showingSeatMapConfigs,
        defaultSeatSettings
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
        const name = formData.get(`areas[${index}][name]`);
        const seatCount = formData.get(`areas[${index}][seatCount]`);
        const ticketPrice = formData.get(`areas[${index}][ticketPrice]`);

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
  return result;
}

export const fetchEventById = async (id: string) => {
  return await getEventById(id);
};
