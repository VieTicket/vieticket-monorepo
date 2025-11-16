"use server";

import {
  getEventById,
  updateEventWithShowingsAndSeatMap,
  updateEventWithShowingsAndSeatMapIndividual,
  updateEventWithShowingsAndAreas,
  updateEventWithShowingsAndAreasIndividual,
} from "@/lib/services/eventService";
import { revalidatePath } from "next/cache";
import { authorise } from "@/lib/auth/authorise";
import { slugify } from "@/lib/utils";
import { SeatMapGridData } from "@/types/event-types";
import type { Event } from "@vieticket/db/pg/schema";

export async function fetchEventByIdForAdmin(eventId: string) {
  await authorise("admin");
  return await getEventById(eventId);
}

export async function handleAdminUpdateEvent(formData: FormData) {
  const session = await authorise("admin");

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

  const eventName = formData.get("name") as string;
  const slug = slugify(eventName, true);

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

  const areas: { name: string; seatCount: number; ticketPrice: number }[] = [];
  let areaIndex = 0;
  while (true) {
    const areaName = formData.get(`areas[${areaIndex}].name`);
    const seatCount = formData.get(`areas[${areaIndex}].seatCount`);
    const ticketPrice = formData.get(`areas[${areaIndex}].ticketPrice`);

    if (!areaName) break;

    const seatCountNum = seatCount
      ? parseInt(seatCount.toString(), 10)
      : undefined;
    const ticketPriceNum = ticketPrice
      ? parseFloat(ticketPrice.toString())
      : undefined;

    if (seatCountNum !== undefined && ticketPriceNum !== undefined) {
      areas.push({
        name: areaName.toString(),
        seatCount: seatCountNum,
        ticketPrice: ticketPriceNum,
      });
    }

    areaIndex++;
  }

  // Create eventPayload object matching the Event schema
  const eventPayload = {
    id: eventId,
    name: eventName,
    slug,
    description: (formData.get("description") as string) || null,
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
    updatedAt: new Date(),
    organizerId: existingEvent.organizerId, // Keep original organizer
    createdAt: existingEvent.createdAt
      ? new Date(existingEvent.createdAt)
      : new Date(),
    views: existingEvent.views || 0,
    approvalStatus: existingEvent.approvalStatus,
  };

  try {
    if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
      const parsedSeatMapData = JSON.parse(seatMapData);
      const grids: SeatMapGridData[] = parsedSeatMapData.grids || [];
      const defaultSeatSettings = parsedSeatMapData.defaultSeatSettings;

      if (grids.length === 0) {
        throw new Error("Seat map has no seating areas configured");
      }

      // Check if using copy mode (all showings use same seat map config)
      const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

      if (copyMode) {
        await updateEventWithShowingsAndSeatMap(
          eventPayload,
          showings,
          grids,
          defaultSeatSettings
        );
      } else {
        // Individual seat map configs per showing
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
      // Simple ticketing mode
      const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

      if (copyMode) {
        // All showings use the same areas configuration
        if (areas.length === 0) {
          throw new Error("At least one area is required for simple ticketing");
        }

        await updateEventWithShowingsAndAreas(eventPayload, showings, areas);
      } else {
        // Individual area configs per showing
        const showingAreaConfigs: Array<
          {
            name: string;
            seatCount: number;
            ticketPrice: number;
          }[]
        > = [];

        for (let showingIdx = 0; showingIdx < showings.length; showingIdx++) {
          const showingAreas: {
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

            showingAreas.push({
              name: name.toString(),
              seatCount: Number(seatCount),
              ticketPrice: Number(ticketPrice),
            });

            areaIndex++;
          }

          if (showingAreas.length === 0) {
            throw new Error(
              `Showing ${showingIdx + 1} must have at least one area`
            );
          }

          showingAreaConfigs.push(showingAreas);
        }

        await updateEventWithShowingsAndAreasIndividual(
          eventPayload,
          showings,
          showingAreaConfigs
        );
      }
    }

    revalidatePath("/admin/events-pending");
    revalidatePath(`/admin/events/edit?id=${eventId}`);
    revalidatePath(`/events/${slug}`);

    return { success: true, eventId };
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

