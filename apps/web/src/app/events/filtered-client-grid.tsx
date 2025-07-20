"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import EventFiltersSidebar from "@/components/events/eventfilters-sidebar";
import StaticFilteredEventGrid from "@/components/events/static-filtered-event-grid";
import { EventSummary } from "@/lib/queries/events";

interface EventPage {
  events: EventSummary[];
  page: number;
  hasMore: boolean;
}

export default function FilteredClientGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const price = searchParams.get("price") || "all";
  const date = searchParams.get("date") || "all";
  const location = searchParams.get("location") || "all";
  const category = searchParams.get("category") || "all";
  const q = searchParams.get("q") || "";

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<EventPage>({
    queryKey: ['events', { price, date, location, category, q }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "6",
        price,
        date,
        location,
        category,
        q,
      });

      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.events?.length || lastPage.events.length < 6) return undefined;
      return lastPage.page + 1;
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`/events?${params.toString()}`);
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
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            {data?.pages.map((page, pageIndex) => (
              <StaticFilteredEventGrid 
                key={pageIndex} 
                events={page.events || []} 
              />
            ))}
            
            {hasNextPage && (
              <div className="text-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {isFetchingNextPage ? "Loading..." : "See more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}