"use server";

import { createEventWithStructure } from "@/lib/services/eventService";
import { revalidatePath } from "next/cache";
import { authorise } from "@/lib/auth/authorise";
import { slugify } from "@/lib/utils";

export async function handleCreateEvent(formData: FormData) {
  // Authorize the user as an organizer and get session data
  const session = await authorise("organizer");
  const organizerId = session.user.id;

  // Generate slug from event name
  const eventName = formData.get("name") as string;
  const slug = slugify(eventName, true); // randomize = true by default

  const seatCount = Number(formData.get("seatCount") || 0);
  const ticketPrice = Number(formData.get("ticketPrice") || 0);

  const eventPayload = {
    name: eventName,
    slug: slug, // Generated slug
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
    organizerId: organizerId, // Use authorized user's ID
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await createEventWithStructure(eventPayload, seatCount, ticketPrice);
  revalidatePath("/organizer/events");
}