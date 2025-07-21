import FilteredClientGrid from "./filtered-client-grid";
import SearchBar from "@/components/ui/search-bar";

export default async function EventsPage() {
  return (
    <>
      <div className="mt-12">
        <SearchBar />
      </div>
      <div className="max-w-7xl mx-auto px-safe-offset-0 py-8 flex gap-8">
        <FilteredClientGrid />
      </div>
    </>
  );
}
