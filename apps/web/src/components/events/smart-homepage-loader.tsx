"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SmartEventGrid } from "./smart-event-grid";
import { Button } from "@/components/ui/button";
import { useUserTracking } from "@/hooks/use-user-tracking";
import { EventSummary, getFilteredEvents } from "@/lib/queries/events";

interface SmartHomePageLoaderProps {
  initialEvents: {
    events: EventSummary[];
    hasMore: boolean;
  };
}

export function SmartHomePageLoader({ initialEvents }: SmartHomePageLoaderProps) {
  const [events, setEvents] = useState<EventSummary[]>(initialEvents.events);
  const [hasMore, setHasMore] = useState(initialEvents.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const t = useTranslations("home");
  const { userBehavior } = useUserTracking();

  // 🚫 DEBUG FUNCTIONS HIDDEN FOR PRODUCTION
  // Test functions are disabled for clean production experience
  // The AI system still works in background for smart event ordering

  // Smart loading effect - load more events if user has behavior data
  useEffect(() => {
    // Always log the check, regardless of frequency reduction
    console.log('🔍 [SmartHomePage] Checking conditions every render...');
    
    const hasBehavior = userBehavior.searchQueries.length > 0 || 
                       userBehavior.viewedEvents.length > 0 || 
                       userBehavior.clickedEvents.length > 0 ||
                       userBehavior.eventEngagement.length > 0;

    console.log('🔍 [SmartHomePage] Detailed check:', {
      hasBehavior,
      hasLoadedMore,
      hasMore,
      eventsLength: events.length,
      userBehavior: {
        searches: userBehavior.searchQueries.length,
        views: userBehavior.viewedEvents.length,
        clicks: userBehavior.clickedEvents.length,
        engagements: userBehavior.eventEngagement.length,
        searchQueriesData: userBehavior.searchQueries,
        viewedEventsData: userBehavior.viewedEvents,
      },
      shouldTrigger: hasBehavior && !hasLoadedMore && hasMore
    });

    if (hasBehavior && !hasLoadedMore && hasMore) {
      console.log('🧠 [SmartHomePage] TRIGGERING smart-loading! User has behavior data, loading more events for AI personalization');
      setHasLoadedMore(true);
      setIsLoading(true);
      
      // Load significantly more events for better AI personalization
      getFilteredEvents({
        page: 1,
        limit: 60, // Load 5x more events for personalization
        price: "all",
        date: "all",
        location: "all",
        category: "all", 
        q: "",
      })
      .then(result => {
        console.log(`🎯 [SmartHomePage] Smart-loaded ${result.events.length} total events for AI personalization`);
        setEvents(result.events);
        setHasMore(result.hasMore);
      })
      .catch(error => {
        console.error("[SmartHomePage] Failed to smart-load events for AI:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else {
      console.log('🚫 [SmartHomePage] Not triggering smart-loading:', {
        reason: !hasBehavior ? 'No behavior data' : 
                !hasMore ? 'No more events' :
                hasLoadedMore ? 'Already loaded more' : 'Unknown'
      });
    }
  }, [userBehavior, hasLoadedMore, hasMore]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;
    
    setIsLoading(true);
    try {
      const currentPage = Math.floor(events.length / 12) + 1;
      const result = await getFilteredEvents({
        page: currentPage,
        limit: 12,
        price: "all",
        date: "all",
        location: "all",
        category: "all",
        q: "",
      });

      const newEvents = result.events.filter(newEvent => 
        !events.some(existingEvent => existingEvent.id === newEvent.id)
      );

      console.log(`🔄 Manually loaded ${newEvents.length} more events. Total: ${events.length + newEvents.length}`);
      setEvents(prev => [...prev, ...newEvents]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Failed to load more events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {t("titlecategories")}
      </h2>

      {isLoading && events.length <= 12 && (
        <div className="mb-4 text-center text-blue-600">
          🧠 Loading personalized events for you...
        </div>
      )}

      <SmartEventGrid events={events} showAIRecommendations={true} />

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
            size="lg"
          >
            {isLoading ? "Loading..." : t("seeMore")}
          </Button>
        </div>
      )}
    </section>
  );
}