"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import EventFiltersSidebar from "@/components/events/eventfilters-sidebar";
import { EventSummary } from "@/lib/queries/events";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AITrackingProvider } from "@/components/ai/ai-tracking-provider";
import { SmartEventGrid } from "@/components/events/smart-event-grid";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useUserTracking } from "@/hooks/use-user-tracking";

interface EventResponse {
  events: EventSummary[];
  total: number;
}

export default function FilteredClientGrid() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userBehavior, trackFilterSelection, trackCurrentFilters } =
    useUserTracking(); // Extract functions we need

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const price = searchParams.get("price") || "all";
  const date = searchParams.get("date") || "all";
  const location = searchParams.get("location") || "all";
  const category = searchParams.get("category") || "all";
  const q = searchParams.get("q") || "";
  const t = useTranslations("event-sidebar");

  // Memoize filter values to ensure stable props for EventFiltersSidebar
  const memoizedFilterProps = useMemo(
    () => ({
      selectedPriceRange: price,
      selectedDate: date,
      selectedLocation: location,
      selectedCategory: category,
    }),
    [price, date, location, category]
  );

  // Check if user has significant behavior for AI prioritization
  const hasSignificantBehavior = useMemo(() => {
    return userBehavior
      ? userBehavior.searchQueries?.length > 0 ||
          userBehavior.viewedEvents?.length > 2 ||
          userBehavior.clickedEvents?.length > 1 ||
          userBehavior.eventEngagement?.length > 0
      : false;
  }, [userBehavior]);

  // Track current filters on component mount to learn from URL state
  // Use useRef to track which filters we've already processed to avoid infinite loops
  const trackedFiltersRef = useRef<string>("");

  useEffect(() => {
    const currentFilters = `${location}_${category}_${price}_${date}`;

    // Only track if filters changed and we have userBehavior loaded
    if (userBehavior && currentFilters !== trackedFiltersRef.current) {
      // Track all current active filters simultaneously
      // Pass actual filter values, including 'all', so trackCurrentFilters can decide what to clear
      trackCurrentFilters({
        location: location,
        category: category,
        price: price,
        date: date,
      });

      // Update ref to prevent re-tracking same filters
      trackedFiltersRef.current = currentFilters;
    }
  }, [location, category, price, date, userBehavior, trackCurrentFilters]); // Use trackCurrentFilters

  // Fetch ALL events at once (no server-side pagination)
  const { data, isLoading, error } = useQuery<EventResponse>({
    queryKey: ["all-events", { price, date, location, category, q }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "1000", // Fetch all events - high limit to get everything
        price,
        date,
        location,
        category,
        q,
      });

      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Events API error:", res.status, errorText);
        throw new Error(`Network response was not ok: ${res.status}`);
      }
      const data = await res.json();

      return {
        events: data.events || [],
        total: data.events?.length || 0,
      };
    },
  });

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      // Access searchParams fresh each time to avoid stale closure
      const currentSearchParams = new URLSearchParams(window.location.search);
      if (value === "all") {
        currentSearchParams.delete(key);
      } else {
        currentSearchParams.set(key, value);
      }
      router.replace(`/events?${currentSearchParams.toString()}`);
      // Reset to first page when filters change
      setCurrentPage(1);

      // Note: trackCurrentFilters in useEffect will handle tracking to avoid double-tracking
    },
    [router]
  ); // Removed trackFilterSelection to prevent double tracking

  // All events loaded from server
  const allEvents = useMemo(() => {
    return data?.events || [];
  }, [data?.events]);

  // Calculate pagination for client-side display
  const totalPages = Math.ceil(allEvents.length / itemsPerPage);
  const eventsToShow = currentPage * itemsPerPage; // Show cumulative events (like infinite scroll)
  const hasMore = currentPage < totalPages;

  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore]);

  return (
    <AITrackingProvider events={allEvents}>
      <div className="flex gap-8">
        <div className="w-64">
          <EventFiltersSidebar
            selectedPriceRange={memoizedFilterProps.selectedPriceRange}
            selectedDate={memoizedFilterProps.selectedDate}
            selectedLocation={memoizedFilterProps.selectedLocation}
            selectedCategory={memoizedFilterProps.selectedCategory}
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
              {/* SmartEventGrid now receives ALL events and handles AI prioritization */}
              {/* AI analyzes the complete dataset and shows prioritized events first */}
              <SmartEventGrid
                events={allEvents}
                aiPool={allEvents}
                renderLimit={eventsToShow}
                showAIRecommendations={false}
                waitForAI={hasSignificantBehavior}
              />

              {hasMore && (
                <div className="text-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={false}
                    variant="outline"
                    size="lg"
                  >
                    {t("seeMore")} ({currentPage * itemsPerPage} /{" "}
                    {allEvents.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AITrackingProvider>
  );
}
