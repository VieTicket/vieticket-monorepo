"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import EventFiltersSidebar from "@/components/events/eventfilters-sidebar";
import StaticFilteredEventGrid from "@/components/events/static-filtered-event-grid";
import { EventSummary } from "@/lib/queries/events";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

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
  const t = useTranslations("event-sidebar");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
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

      console.log("Fetching events with params:", params.toString());
      
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Events API error:", res.status, errorText);
        throw new Error(`Network response was not ok: ${res.status}`);
      }
      const data = await res.json();
      console.log("Events API response:", data);
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
        ) : error ? (
          <div className="text-red-500">
            Error loading events: {error.message}
          </div>
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
                <Button
            onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  size="lg"
                >
                  {isFetchingNextPage ? "Loading..." : t("seeMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
