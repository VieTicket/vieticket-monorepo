"use server";

import {
  createEventWithMultipleAreas,
  createEventWithSeatMap,
  getEventById,
  updateEventWithMultipleAreas,
  updateEventWithSeatMap,
  createEventWithShowingsAndAreas,
  createEventWithShowingsAndAreasIndividual,
  updateEventWithShowingsAndAreas,
  updateEventWithShowingsAndAreasIndividual,
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

    // Safe date parsing with validation
    const startDate = new Date(startTime.toString());
    const endDate = new Date(endTime.toString());

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`Invalid date format in showing: ${name}`);
    }

    showings.push({
      name: name.toString(),
      startTime: startDate,
      endTime: endDate,
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
      ? (() => {
          const ticketSaleStartValue = formData.get("ticketSaleStart") as string;
          if (!ticketSaleStartValue || ticketSaleStartValue.trim() === "") return null;
          const date = new Date(ticketSaleStartValue);
          return isNaN(date.getTime()) ? null : date;
        })()
      : null,
    ticketSaleEnd: formData.get("ticketSaleEnd")
      ? (() => {
          const ticketSaleEndValue = formData.get("ticketSaleEnd") as string;
          if (!ticketSaleEndValue || ticketSaleEndValue.trim() === "") return null;
          const date = new Date(ticketSaleEndValue);
          return isNaN(date.getTime()) ? null : date;
        })()
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

  console.log("HandleUpdateEvent - FormData contents:", {
    eventId,
    ticketingMode,
    ticketSaleStart: formData.get("ticketSaleStart"),
    ticketSaleEnd: formData.get("ticketSaleEnd"),
  });

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) throw new Error("Event not found");

  console.log("Existing event dates:", {
    startTime: existingEvent.startTime,
    endTime: existingEvent.endTime,
    createdAt: existingEvent.createdAt,
  });

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

    // Skip if startTime or endTime is empty string
    if (startTime.toString().trim() === "" || endTime.toString().trim() === "") {
      console.log(`Skipping showing ${name} due to empty time fields`);
      showingIndex++;
      continue;
    }

    // Safe date parsing with validation
    const startDate = new Date(startTime.toString());
    const endDate = new Date(endTime.toString());

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error(`Invalid date format in showing: ${name}`);
    }

    showings.push({
      name: name.toString(),
      startTime: startDate,
      endTime: endDate,
      seatMapId: ticketingMode === "seatmap" ? seatMapId : undefined,
    });

    showingIndex++;
  }

  // For compatibility, use showings to calculate event start/end times
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
      : existingEvent.startTime ? new Date(existingEvent.startTime) : new Date();
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
      : existingEvent.endTime ? new Date(existingEvent.endTime) : new Date();

  const eventPayload = {
    id: eventId,
    name: formData.get("name") as string,
    slug: existingEvent.slug,
    description: formData.get("description") as string | null,
    startTime: eventStartTime,
    endTime: eventEndTime,
    location: (formData.get("location") as string) || null,
    type: (formData.get("type") as string) || null,
    ticketSaleStart: formData.get("ticketSaleStart")
      ? (() => {
          const ticketSaleStartValue = formData.get("ticketSaleStart") as string;
          if (!ticketSaleStartValue || ticketSaleStartValue.trim() === "") return null;
          const date = new Date(ticketSaleStartValue);
          return isNaN(date.getTime()) ? null : date;
        })()
      : null,
    ticketSaleEnd: formData.get("ticketSaleEnd")
      ? (() => {
          const ticketSaleEndValue = formData.get("ticketSaleEnd") as string;
          if (!ticketSaleEndValue || ticketSaleEndValue.trim() === "") return null;
          const date = new Date(ticketSaleEndValue);
          return isNaN(date.getTime()) ? null : date;
        })()
      : null,
    posterUrl: (formData.get("posterUrl") as string) || null,
    bannerUrl: (formData.get("bannerUrl") as string) || null,
    seatMapId: seatMapId || null,
    updatedAt: new Date(),
    organizerId,
    createdAt: existingEvent.createdAt ? new Date(existingEvent.createdAt) : new Date(),
    views: existingEvent.views,
    approvalStatus: existingEvent.approvalStatus,
  };

  let result;

  if (ticketingMode === "seatmap" && seatMapId && seatMapData) {
    // TODO: Implement optimized seat map update with showings
    const parsedSeatMapData = JSON.parse(seatMapData);
    result = await updateEventWithSeatMap(eventPayload, parsedSeatMapData);
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

      result = await updateEventWithShowingsAndAreas(
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

      result = await updateEventWithShowingsAndAreasIndividual(
        eventPayload,
        showings,
        showingAreaConfigs
      );
    }
  }

  revalidatePath("/organizer/events");
  return result;
}

export const fetchEventById = async (id: string) => {
  return await getEventById(id);
};
