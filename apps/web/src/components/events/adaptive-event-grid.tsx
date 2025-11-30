"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SmartEventGrid } from "./smart-event-grid";
import { useUserTracking } from "@/hooks/use-user-tracking";
import { EventSummary, getFilteredEvents } from "@/lib/queries/events";

interface AdaptiveEventGridProps {
  initialEvents: EventSummary[];
  initialHasMore: boolean;
}

// 🚫 DEBUG COMPONENT HIDDEN FOR PRODUCTION - Clean UI
function DebugInfo({
  events,
  hasSignificantBehavior,
  isExpanded,
  hasMore,
}: {
  events: EventSummary[];
  hasSignificantBehavior: boolean;
  isExpanded: boolean;
  hasMore: boolean;
}) {
  // Hidden for production
  return null;
}

interface AdaptiveEventGridProps {
  initialEvents: EventSummary[];
  initialHasMore: boolean;
}

export function AdaptiveEventGrid({
  initialEvents,
  initialHasMore,
}: AdaptiveEventGridProps) {
  const [events, setEvents] = useState<EventSummary[]>(initialEvents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations("home");
  const { userBehavior } = useUserTracking();

  console.log("[AdaptiveGrid] Component rendered with:", {
    initialEventsCount: initialEvents.length,
    userBehavior: userBehavior,
    isExpanded,
    hasMore,
  });

  // Check if user has significant behavior data
  const hasSignificantBehavior = userBehavior
    ? userBehavior.searchQueries?.length > 0 ||
      userBehavior.viewedEvents?.length > 2 ||
      userBehavior.clickedEvents?.length > 1 ||
      userBehavior.eventEngagement?.length > 0
    : false;

  console.log("🔍 [AdaptiveGrid] Behavior check:", {
    hasUserBehavior: !!userBehavior,
    hasSignificantBehavior,
    searchQueries: userBehavior?.searchQueries?.length || 0,
    viewedEvents: userBehavior?.viewedEvents?.length || 0,
    clickedEvents: userBehavior?.clickedEvents?.length || 0,
    eventEngagement: userBehavior?.eventEngagement?.length || 0,
  });

  // Auto-expand for users with behavior data
  useEffect(() => {
    console.log("[AdaptiveGrid] useEffect triggered with:", {
      hasSignificantBehavior,
      isExpanded,
      hasMore,
      eventsLength: events.length,
      userBehavior: !!userBehavior,
    });

    if (
      hasSignificantBehavior &&
      !isExpanded &&
      hasMore &&
      events.length <= 12
    ) {
      console.log(
        "✅ [AdaptiveGrid] Conditions met! Auto-expanding for user with behavior data"
      );
      handleExpand();
    } else {
      console.log("[AdaptiveGrid] Auto-expand conditions not met:", {
        hasSignificantBehavior,
        isExpanded,
        hasMore,
        eventsLength: events.length,
      });
    }
  }, [
    hasSignificantBehavior,
    isExpanded,
    hasMore,
    events.length,
    userBehavior,
  ]);

  const handleExpand = async () => {
    if (isLoading) return;

    console.log("[AdaptiveGrid] Expanding event list...");
    setIsLoading(true);
    setIsExpanded(true);

    try {
      const result = await getFilteredEvents({
        page: 1,
        limit: 60,
        price: "all",
        date: "all",
        location: "all",
        category: "all",
        q: "",
      });

      console.log(`[AdaptiveGrid] Loaded ${result.events.length} total events`);
      setEvents(result.events);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("[AdaptiveGrid] Failed to expand events:", error);
      setIsExpanded(false);
    } finally {
      setIsLoading(false);
    }
  };

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

      const newEvents = result.events.filter(
        (newEvent) =>
          !events.some((existingEvent) => existingEvent.id === newEvent.id)
      );

      console.log(`[AdaptiveGrid] Loaded ${newEvents.length} more events`);
      setEvents((prev) => [...prev, ...newEvents]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("[AdaptiveGrid] Failed to load more events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log("🔍 [AdaptiveGrid] State check:", {
      hasSignificantBehavior,
      isExpanded,
      hasMore,
      eventsLength: events.length,
      isLoading,
      userBehavior: {
        searches: userBehavior.searchQueries.length,
        views: userBehavior.viewedEvents.length,
        clicks: userBehavior.clickedEvents.length,
        engagements: userBehavior.eventEngagement.length,
      },
    });
  }, [
    hasSignificantBehavior,
    isExpanded,
    hasMore,
    events.length,
    isLoading,
    userBehavior,
  ]);

  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {t("titlecategories")}
      </h2>

      {isLoading && !isExpanded && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm">
            🧠 Loading personalized events for you...
          </div>
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

      <DebugInfo
        events={events}
        hasSignificantBehavior={hasSignificantBehavior}
        isExpanded={isExpanded}
        hasMore={hasMore}
      />
    </section>
  );
}

// 🚫 GLOBAL TEST FUNCTIONS HIDDEN FOR PRODUCTION
// Uncomment below for development/debugging:
/*
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).addTestBehavior = () => {
    const testBehavior = {
      searchQueries: ["concert", "music event", "festival"],
      viewedEvents: ["event1", "event2", "event3", "event4"],
      clickedEvents: ["event1", "event2"],
      eventEngagement: ["event1"]
    };
    localStorage.setItem('vieticket_user_behavior_anonymous', JSON.stringify(testBehavior));
    console.log('✅ Test behavior data added to anonymous user! Reload the page to see auto-expansion.');
    console.log('📊 Added data:', testBehavior);
    return testBehavior;
  };

  (window as any).clearBehavior = () => {
    localStorage.removeItem('vieticket_user_behavior_anonymous');
    console.log('🗑️ Behavior data cleared! Reload to see default view.');
  };

  (window as any).checkBehavior = () => {
    const data = localStorage.getItem('vieticket_user_behavior_anonymous');
    console.log('🔍 Current behavior data:', data ? JSON.parse(data) : 'No data');
    return data ? JSON.parse(data) : null;
  };

  (window as any).testAutoExpansion = () => {
    console.log('🧪 Testing auto-expansion logic...');
    const behavior = (window as any).checkBehavior();
    if (behavior) {
      const hasSignificant = 
        behavior.searchQueries?.length > 0 || 
        behavior.viewedEvents?.length > 2 || 
        behavior.clickedEvents?.length > 1 ||
        behavior.eventEngagement?.length > 0;
      
      console.log('📊 Behavior analysis:', {
        searchQueries: behavior.searchQueries?.length || 0,
        viewedEvents: behavior.viewedEvents?.length || 0,
        clickedEvents: behavior.clickedEvents?.length || 0,
        eventEngagement: behavior.eventEngagement?.length || 0,
        hasSignificantBehavior: hasSignificant
      });
      
      if (hasSignificant) {
        console.log('✅ Should trigger auto-expansion');
      } else {
        console.log('Will not trigger auto-expansion');
      }
    } else {
      console.log('No behavior data found');
    }
  };
}
*/
