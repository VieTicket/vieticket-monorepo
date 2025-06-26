import { getEventSummaries } from "@/lib/queries/events";
import FilteredClientGrid from "./filtered-client-grid";
import SearchBar from "@/components/ui/search-bar";

export default async function EventsPage() {
  const { events } = await getEventSummaries({ limit: 100 });

  const allLocations = Array.from(
    new Set(
      events
        .map((e) => e.location?.trim())
        .filter(Boolean)
        .map((loc) => loc!) // loc đã được filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "vi"));

  return (
    <>
      <div className="mt-12">
        <SearchBar  />
      </div>
      <div className="max-w-7xl mx-auto px-safe-offset-0 py-8 flex gap-8">
        <FilteredClientGrid events={events} />
      </div>
    </>
  );
}