// apps/web/src/app/organizer/event/create/actions.ts
"use server";
import { createEventWithStructure } from "@/lib/services/eventService"; // Bước 2 bạn sẽ viết hàm này
import { revalidatePath } from "next/cache";

export async function handleCreateEvent(formData: FormData) {
  const seatCount = Number(formData.get("seatCount") || 0);
  const ticketPrice = Number(formData.get("ticketPrice") || 0);

  const eventPayload = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
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
    organizerId: formData.get("organizerId") as string,
    views: 0,
    isApproved: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await createEventWithStructure(eventPayload, seatCount, ticketPrice); // thay thế
  revalidatePath("/organizer/events");
}
