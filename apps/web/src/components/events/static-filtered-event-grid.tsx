import { EventCard } from "./event-grid";
import { EventSummary } from "@/lib/queries/events";

export default function StaticFilteredEventGrid({ events }: { events: EventSummary[] }) {
  if (!events?.length) {
    return <div>No events found</div>;
  }

  return (
    <div className="w-full grid gap-4 justify-items-center grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 mx-4">
      {events.map((event) => (
        <EventCard 
          key={event.id} 
          {...event}
        />
      ))}
    </div>
  );
}