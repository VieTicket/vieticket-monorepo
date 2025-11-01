import { fetchEventDetail } from "@/lib/services/eventService";
import {
  PreviewEvent,
  EventPreviewData,
} from "@/components/create-event/preview";
import ViewCounter from "@/components/ViewCounter";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = await fetchEventDetail(slug);

  const event: EventPreviewData = {
    eventId: raw.id,
    name: raw.name,
    slug: raw.slug,
    bannerUrl: raw.bannerUrl ?? "",
    posterUrl: raw.posterUrl ?? "",
    description: raw.description ?? "",
    location: raw.location ?? "",
    type: raw.type ?? "",
    // Use first showing times for legacy fields
    // @ts-ignore
    startTime: raw.showings[0]?.startTime.toISOString() ?? "",
    endTime: raw.showings[0]?.endTime.toISOString() ?? "",
    ticketSaleStart: raw.ticketSaleStart?.toISOString() ?? "",
    ticketSaleEnd: raw.ticketSaleEnd?.toISOString() ?? "",
    seatMapId: raw.seatMapId ?? null,
    organizer: raw.organizer
      ? {
          id: raw.organizer.id,
          name: raw.organizer.name,
          website: raw.organizer.website,
          address: raw.organizer.address,
          avatar: raw.organizer.avatar,
          organizerType: raw.organizer.organizerType,
        }
      : null,
    areas: raw.areas.map((a) => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
    })),
    showings: raw.showings.map((s) => ({
      id: s.id,
      name: s.name || "Unnamed Showing",
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    })),
  };

  return (
    <div className="bg-white min-h-screen w-full">
      <ViewCounter eventId={raw.id} />
      <div className="bg-white shadow-none rounded-none w-2/3 px-4 md:px-8 lg:px-20 py-12 mx-auto">
        <PreviewEvent
          data={{
            ...event,
            isPreview: false,
          }}
        />
      </div>
    </div>
  );
}
