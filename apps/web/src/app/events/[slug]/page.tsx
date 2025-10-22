import { fetchEventDetail } from "@/lib/services/eventService";
import {
  PreviewEvent,
  EventPreviewData,
} from "@/components/create-event/preview";
import ViewCounter from "@/components/ViewCounter";
import RatingWidget from "@/components/event/RatingWidget";
import RatingList from "@/components/event/RatingList";
import { CompareEventButton } from "@/components/event/CompareEventButton";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { getOrganizerAverageRating } from "@vieticket/repos/ratings";


export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const raw = await fetchEventDetail(slug);

  // Check authentication on server side
  let isAuthenticated = false;
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    isAuthenticated = !!session?.user;
  } catch (error) {
    console.error('Error checking auth:', error);
    isAuthenticated = false;
  }

  // Get organizer rating if organizer exists
  let organizerRating = null;
  if (raw.organizer) {
    try {
      organizerRating = await getOrganizerAverageRating(raw.organizer.id);
    } catch (error) {
      console.error("Error fetching organizer rating:", error);
    }
  }

  const event: EventPreviewData = {
    eventId: raw.id,
    name: raw.name,
    slug: raw.slug,
    bannerUrl: raw.bannerUrl ?? "",
    posterUrl: raw.posterUrl ?? "",
    description: raw.description ?? "",
    location: raw.location ?? "",
    type: raw.type ?? "",
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
          rating: organizerRating || undefined,
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
      <div className="relative">
        {/* Compare button positioned at top right */}
        <div className="absolute top-4 right-4 z-10">
          <CompareEventButton 
            event={raw} 
            isAuthenticated={isAuthenticated}
          />
        </div>
        
        <div className="bg-white shadow-none rounded-none w-2/3 px-4 md:px-8 lg:px-20 py-12 mx-auto">
          <PreviewEvent
            data={{
              ...event,
              isPreview: false,
            }}
          />
          <div className="mt-8 space-y-6">
            <RatingWidget eventId={raw.id} />
            <RatingList eventId={raw.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
