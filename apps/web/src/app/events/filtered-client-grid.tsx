"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EventFiltersSidebar from "@/components/events/eventfilters-sidebar";
import StaticFilteredEventGrid from "@/components/events/static-filtered-event-grid";
import { EventSummary } from "@/lib/queries/events";

export default function FilteredClientGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const price = searchParams.get("price") || "all";
  const date = searchParams.get("date") || "all";
  const location = searchParams.get("location") || "all";
  const category = searchParams.get("category") || "all";
  const q = searchParams.get("q") || "";

  const fetchEvents = async (page: number) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "6",
      price,
      date,
      location,
      category,
      q,
    });

    setIsLoading(true);
    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();

    setEvents((prev) => [...prev, ...data]);
    setHasMore(data.length > 0);
    setIsLoading(false);
  };

  useEffect(() => {
    setEvents([]);
    setPage(1);
    fetchEvents(1);
  }, [price, date, location, category, q]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage);
  };

  return (
    <div className="flex gap-8">
      <div className="w-64">
        <EventFiltersSidebar
          selectedPriceRange={price}
          selectedDate={date}
          selectedLocation={location}
          selectedCategory={category}
          onChange={handleFilterChange}
        />
      </div>

      <div className="flex-1 space-y-6">
        <StaticFilteredEventGrid events={events} />

        {hasMore && (
          <div className="text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isLoading ? "Loading..." : "See more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
