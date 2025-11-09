"use client";

import { use, useState, useTransition, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SmartEventGrid } from "./smart-event-grid";
import { useUserTracking } from "@/hooks/use-user-tracking";
import {
  EventSummary,
  EventSummaryResponse,
  SortableEventColumnKey,
  getFilteredEvents,
} from "@/lib/queries/events";

interface SmartEventGridSectionProps {
  initialEvents: EventSummaryResponse;
  sortColumnKey?: SortableEventColumnKey;
  limit?: number;
}

export function SmartEventGridSection({
  initialEvents,
  sortColumnKey = "startTime",
  limit = 12,
}: SmartEventGridSectionProps) {
  const awaitedResult = use(initialEvents);
  const [events, setEvents] = useState<EventSummary[]>(awaitedResult.events);
  const [hasMore, setHasMore] = useState(awaitedResult.hasMore);
  const [isPending, startTransition] = useTransition();
  const [hasSmartLoaded, setHasSmartLoaded] = useState(false);
  const t = useTranslations("home");
  const { userBehavior } = useUserTracking();

  const handleClickSeeMore = useCallback(async () => {
    if (!hasMore || isPending) return;

    startTransition(async () => {
      try {
        // Calculate next page 
        const currentPage = Math.floor(events.length / limit) + 1;
        
        const result = await getFilteredEvents({
          page: currentPage,
          limit,
          price: "all",
          date: "all",
          location: "all", 
          category: "all",
          q: "",
        });

        const newEvents = result.events.filter(newEvent => 
          !events.some(existingEvent => existingEvent.id === newEvent.id)
        );

        console.log(`🔄 Loaded ${newEvents.length} more events. Total: ${events.length + newEvents.length}`);
        setEvents((prev) => [...prev, ...newEvents]);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to load more events:", error);
      }
    });
  }, [hasMore, isPending, events, limit]);

  // Smart initial loading - load more events if user has behavior data
  useEffect(() => {
    // Add a small delay to ensure userBehavior is fully loaded
    const checkAndLoad = () => {
      const hasBehavior = userBehavior.searchQueries.length > 0 || 
                         userBehavior.viewedEvents.length > 0 || 
                         userBehavior.clickedEvents.length > 0 ||
                         userBehavior.eventEngagement.length > 0;

      // Enhanced debug logging
      console.log('🔍 Smart-loading condition check:', {
        hasBehavior,
        hasSmartLoaded,
        hasMore,
        eventsLength: events.length,
        userBehavior: {
          searches: userBehavior.searchQueries.length,
          views: userBehavior.viewedEvents.length,
          clicks: userBehavior.clickedEvents.length,
          engagements: userBehavior.eventEngagement.length
        }
      });

      if (hasBehavior && !hasSmartLoaded && hasMore && events.length <= 12) {
        console.log('🧠 TRIGGERING smart-loading more events for better AI personalization');
        setHasSmartLoaded(true);
        
        // Load significantly more events for better AI personalization
        startTransition(async () => {
          try {
            // Load multiple pages at once for better AI personalization
            const result = await getFilteredEvents({
              page: 1,
              limit: 60, // Load 5x more events for personalization
              price: "all",
              date: "all",
              location: "all",
              category: "all", 
              q: "",
            });

            // Replace current events with larger dataset
            const newEvents = result.events.filter((newEvent, index) => 
              index >= events.length // Only take events beyond current set
            );

            console.log(`🎯 Smart-loaded ${newEvents.length} events for AI personalization. Total: ${result.events.length}`);
            setEvents(result.events); // Replace with full dataset
            setHasMore(result.hasMore);
          } catch (error) {
            console.error("Failed to smart-load events for AI:", error);
          }
        });
      }
    };

    // Run immediately and also with a slight delay to catch late-loading userBehavior
    checkAndLoad();
    const timer = setTimeout(checkAndLoad, 500);
    
    return () => clearTimeout(timer);
  }, [userBehavior, hasSmartLoaded, hasMore, events.length, startTransition]);

  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {t("titlecategories")}
      </h2>

      <SmartEventGrid events={events} showAIRecommendations={true} />

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleClickSeeMore}
            disabled={isPending}
            variant="outline"
            size="lg"
          >
            {t("seeMore")}
          </Button>
        </div>
      )}
    </section>
  );
}