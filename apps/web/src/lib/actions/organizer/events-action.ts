"use server";

import {
  createEventWithMultipleAreas,
  createEventWithSeatMap,
  getEventById,
  updateEventWithMultipleAreas,
  updateEventWithSeatMap,
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

  const eventPayload = {
    name: eventName,
    slug,
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
    seatMapId: seatMapId || null,
    organizerId,
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let result;

  if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
    // Use seat map data
    const parsedSeatMapData = JSON.parse(seatMapData);
    result = await createEventWithSeatMap(eventPayload, parsedSeatMapData);
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

    result = await createEventWithMultipleAreas(eventPayload, areas);
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
