import { fetchEventDetail } from "@/lib/services/eventService";
import {
  PreviewEvent,
  EventPreviewData,
} from "@/components/CreateEvent/preview";

export default async function EventPage({
  params,
}: {
  params: { slug: string };
}) {
  const raw = await fetchEventDetail(params.slug);

  const event: EventPreviewData = {
    name: raw.name,
    slug: raw.slug,
    bannerUrl: raw.bannerUrl ?? "",
    posterUrl: raw.posterUrl ?? "",
    description: raw.description ?? "",
    location: raw.location ?? "",
    type: raw.type ?? "",
    startTime: raw.startTime.toISOString(),
    endTime: raw.endTime.toISOString(),
    ticketSaleStart: raw.ticketSaleStart?.toISOString() ?? "",
    ticketSaleEnd: raw.ticketSaleEnd?.toISOString() ?? "",
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
  };

  return (
    <div className="bg-white min-h-screen w-full">
      <div className="bg-white shadow-none rounded-none w-2/3 px-4 md:px-8 lg:px-20 py-12 mx-auto">
        <PreviewEvent data={event} />
      </div>
    </div>
  );
}
