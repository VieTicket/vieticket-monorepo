import CategoryList from "@/components/events/category-cards";
import { EventGridSection } from "@/components/events/event-grid";
import { getEventSummaries } from "@/lib/queries/events";
import HeroCarousel from "@/components/HeroCarousel";

export default async function Home() {
  const eventPromise = getEventSummaries({
    limit: 12,
    sortColumnKey: "startTime",
  });

  return (
    <>
      <HeroCarousel />
      <main className="max-w-7xl mx-auto px-safe-offset-0">
        <CategoryList />
        <EventGridSection
          title="Discover Best of Online Events"
          initialEvents={eventPromise}
          sortColumnKey="startTime"
          limit={12}
        />
      </main>
    </>
  );
}
