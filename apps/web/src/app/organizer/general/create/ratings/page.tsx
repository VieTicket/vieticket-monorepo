import { EventRatingsList } from "./EventRatingsList";
import { fetchEventRatings } from "@/app/organizer/actions";

export default async function EventRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const eventId = (await searchParams).id;
  const ratings = await fetchEventRatings(eventId, 100);

  return (
    <div className="container mx-auto px-4 py-8">
      <EventRatingsList eventId={eventId} initialRatings={ratings} />
    </div>
  );
}

