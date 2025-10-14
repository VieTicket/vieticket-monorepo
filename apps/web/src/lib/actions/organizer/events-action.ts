"use server";

import {
  createEventWithMultipleAreas,
  createEventWithSeatMap,
  getEventById,
  updateEventWithMultipleAreas,
  updateEventWithSeatMap,
  createEventWithShowingsAndAreas,
  createEventWithShowingsAndAreasIndividual,
} from "@/lib/services/eventService";
import { revalidatePath } from "next/cache";
import { authorise } from "@/lib/auth/authorise";
import { slugify } from "@/lib/utils";

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

  // Parse showings data
  const showings: {
    name: string;
    startTime: Date;
    endTime: Date;
    seatMapId?: string;
  }[] = [];

  let showingIndex = 0;
  while (true) {
    const name = formData.get(`showings[${showingIndex}].name`);
    const startTime = formData.get(`showings[${showingIndex}].startTime`);
    const endTime = formData.get(`showings[${showingIndex}].endTime`);

    if (!name || !startTime || !endTime) break;

    showings.push({
      name: name.toString(),
      startTime: new Date(startTime.toString()),
      endTime: new Date(endTime.toString()),
      seatMapId: ticketingMode === "seatmap" ? seatMapId : undefined,
    });

    showingIndex++;
  }

  // For compatibility, use first showing's times as event start/end
  const eventStartTime =
    showings.length > 0 ? showings[0].startTime : new Date();
  const eventEndTime =
    showings.length > 0 ? showings[showings.length - 1].endTime : new Date();

  const eventPayload = {
    name: eventName,
    slug,
    description: formData.get("description") as string | null,
    startTime: eventStartTime,
    endTime: eventEndTime,
    location: (formData.get("location") as string) || null,
    type: (formData.get("type") as string) || null,
    ticketSaleStart: formData.get("ticketSaleStart")
      ? new Date(formData.get("ticketSaleStart") as string)
      : null,
    ticketSaleEnd: formData.get("ticketSaleEnd")
      ? new Date(formData.get("ticketSaleEnd") as string)
      : null,
    posterUrl: (formData.get("posterUrl") as string) || null,
    bannerUrl: (formData.get("bannerUrl") as string) || null,
    seatMapId: seatMapId || null,
    organizerId,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let result;

  if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
    // TODO: Implement seat map with showings - for now use old method
    const parsedSeatMapData = JSON.parse(seatMapData);
    result = await createEventWithSeatMap(eventPayload, parsedSeatMapData);
  } else {
    // Use simple ticketing with showings - check if using copy mode or individual configs
    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      // All showings use the same areas configuration
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

      result = await createEventWithShowingsAndAreas(
        eventPayload,
        showings,
        areas
      );
    } else {
      // Each showing has its own areas configuration
      const showingAreaConfigs: Array<
        {
          name: string;
          seatCount: number;
          ticketPrice: number;
        }[]
      > = [];

      // Parse areas for each showing
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
  if (!existingEvent) throw new Error("Event not found");

  const eventPayload = {
    id: eventId,
    name: formData.get("name") as string,
    slug: existingEvent.slug,
    description: formData.get("description") as string | null,
    startTime: new Date(formData.get("startTime") as string),
    endTime: new Date(formData.get("endTime") as string),
    location: (formData.get("location") as string) || null,
    type: (formData.get("type") as string) || null,
    ticketSaleStart: formData.get("ticketSaleStart")
      ? new Date(formData.get("ticketSaleStart") as string)
      : null,
    ticketSaleEnd: formData.get("ticketSaleEnd")
      ? new Date(formData.get("ticketSaleEnd") as string)
      : null,
    posterUrl: (formData.get("posterUrl") as string) || null,
    bannerUrl: (formData.get("bannerUrl") as string) || null,
    maxTicketsByOrder: 36,
    seatMapId: seatMapId || null,
    updatedAt: new Date(),
    organizerId,
    createdAt: existingEvent.createdAt,
    views: existingEvent.views,
    approvalStatus: existingEvent.approvalStatus,
  };

  if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
    // Use seat map data
    const parsedSeatMapData = JSON.parse(seatMapData);
    await updateEventWithSeatMap(eventPayload, parsedSeatMapData);
  } else {
    // Use simple ticketing
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

    await updateEventWithMultipleAreas(eventPayload, areas);
  }

  revalidatePath("/organizer/events");
}

export const fetchEventById = async (id: string) => {
  return await getEventById(id);
};
