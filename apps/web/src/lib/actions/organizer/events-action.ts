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
import { SeatMapGridData } from "@/types/event-types";

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
  console.log(formData);
  console.log("📥 Creating event:", {
    eventName,
    ticketingMode,
    seatMapId: seatMapId || "none",
    hasSeatMapData: !!seatMapData,
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

    showings.push({
      name: name.toString(),
      startTime: new Date(startTime.toString()),
      endTime: new Date(endTime.toString()),
      seatMapId: ticketingMode === "seatmap" ? seatMapId : undefined,
    });

    showingIndex++;
  }

  console.log(`📋 Parsed ${showings.length} showings`);

  if (showings.length === 0) {
    throw new Error("At least one showing is required");
  }

  // For compatibility, use first showing's times as event start/end
  const eventStartTime = showings[0].startTime;
  const eventEndTime = showings[showings.length - 1].endTime;

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
    // ✅ Seat map ticketing mode - extract grids from seatMapData
    const parsedSeatMapData = JSON.parse(seatMapData);
    const grids: SeatMapGridData[] = parsedSeatMapData.grids || [];
    const defaultSeatSettings = parsedSeatMapData.defaultSeatSettings;

    console.log("🎯 Using seat map with grids:", {
      gridCount: grids.length,
      defaultPrice: defaultSeatSettings?.price,
    });

    if (grids.length === 0) {
      throw new Error("Seat map has no seating areas configured");
    }

    // Check if copy mode or individual configs
    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      console.log("📋 Copy mode: Using same seat map for all showings");
      result = await createEventWithShowingsAndSeatMap(
        eventPayload,
        showings,
        grids,
        defaultSeatSettings
      );
    } else {
      console.log("📋 Individual mode: Each showing has own configuration");
      // Parse individual seat map configs for each showing
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
    // ✅ Simple ticketing mode
    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      console.log("📋 Simple ticketing - Copy mode");
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

      if (areas.length === 0) {
        throw new Error("At least one area is required for simple ticketing");
      }

      console.log(`📊 Parsed ${areas.length} areas for all showings`);
      result = await createEventWithShowingsAndAreas(
        eventPayload,
        showings,
        areas
      );
    } else {
      console.log("📋 Simple ticketing - Individual mode");
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

        if (areas.length === 0) {
          throw new Error(
            `Showing ${showingIdx + 1} must have at least one area`
          );
        }

        showingAreaConfigs.push(areas);
        console.log(`📊 Showing ${showingIdx + 1}: ${areas.length} areas`);
      }

      result = await createEventWithShowingsAndAreasIndividual(
        eventPayload,
        showings,
        showingAreaConfigs
      );
    }
  }

  console.log("✅ Event created successfully:", result?.eventId);
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

  console.log("📝 Updating event:", {
    eventId,
    ticketingMode,
    seatMapId: seatMapId || "none",
    hasSeatMapData: !!seatMapData,
  });

  const existingEvent = await getEventById(eventId);
  if (!existingEvent) {
    console.error("❌ Event not found:", eventId);
    throw new Error("Event not found");
  }

  // ✅ Parse showings data
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

  console.log(`📋 Parsed ${showings.length} showings for update`);

  if (showings.length === 0) {
    throw new Error("At least one showing is required");
  }

  const eventStartTime = showings[0].startTime;
  const eventEndTime = showings[showings.length - 1].endTime;

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
    // ✅ Use seat map data with grids
    const parsedSeatMapData = JSON.parse(seatMapData);
    const grids: SeatMapGridData[] = parsedSeatMapData.grids || [];
    const defaultSeatSettings = parsedSeatMapData.defaultSeatSettings;

    console.log("🎯 Updating with seat map grids:", {
      gridCount: grids.length,
      defaultPrice: defaultSeatSettings?.price,
    });

    if (grids.length === 0) {
      throw new Error("Seat map has no seating areas configured");
    }

    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      console.log("📋 Update - Copy mode for seat map");
      await updateEventWithShowingsAndSeatMap(
        eventPayload,
        showings,
        grids,
        defaultSeatSettings
      );
    } else {
      console.log("📋 Update - Individual mode for seat map");
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
    // ✅ Use simple ticketing
    const copyMode = formData.get("showingConfigs[0].copyMode") === "true";

    if (copyMode) {
      console.log("📋 Update - Copy mode for simple ticketing");
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

      console.log(`📊 Parsed ${areas.length} areas for update`);
      await updateEventWithShowingsAndAreas(eventPayload, showings, areas);
    } else {
      console.log("📋 Update - Individual mode for simple ticketing");
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
        console.log(`📊 Showing ${showingIdx + 1}: ${areas.length} areas`);
      }

      await updateEventWithShowingsAndAreasIndividual(
        eventPayload,
        showings,
        showingAreaConfigs
      );
    }
  }

  console.log("✅ Event updated successfully:", eventId);
  revalidatePath("/organizer/events");
  revalidatePath("/organizer");
  revalidatePath(`/event/${existingEvent.slug}`);
}

export const fetchEventById = async (id: string) => {
  return await getEventById(id);
};
