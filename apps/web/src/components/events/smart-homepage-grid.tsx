"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SmartEventGrid } from "./smart-event-grid";
import { useUserTracking } from "@/hooks/use-user-tracking";
import { EventSummary, getFilteredEvents } from "@/lib/queries/events";

interface SmartHomePageGridProps {
  initialEvents: EventSummary[];
  initialHasMore: boolean;
}

// 🚫 DEBUG COMPONENT HIDDEN FOR PRODUCTION - Clean UI
function DebugInfo({ events, displayedEvents, hasSignificantBehavior, smartDisplayEnabled }: {
  events: EventSummary[];
  displayedEvents: EventSummary[];
  hasSignificantBehavior: boolean;
  smartDisplayEnabled: boolean;
}) {
  // Hidden for production
  return null;
}

export function SmartHomePageGrid({ initialEvents, initialHasMore }: SmartHomePageGridProps) {
  const [allEvents, setAllEvents] = useState<EventSummary[]>(initialEvents);
  const [displayedEvents, setDisplayedEvents] = useState<EventSummary[]>(initialEvents.slice(0, 12));
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [smartDisplayEnabled, setSmartDisplayEnabled] = useState(false);
  const t = useTranslations("home");
  const { userBehavior } = useUserTracking();

  // Check if user has significant behavior data
  const hasSignificantBehavior = userBehavior ? (
    userBehavior.searchQueries?.length > 0 || 
    userBehavior.viewedEvents?.length > 2 || 
    userBehavior.clickedEvents?.length > 1 ||
    userBehavior.eventEngagement?.length > 0
  ) : false;

  console.log('🏠 [SmartHomePage] Component state:', {
    totalEvents: allEvents.length,
    displayedEvents: displayedEvents.length,
    hasSignificantBehavior,
    smartDisplayEnabled,
    userBehavior: !!userBehavior
  });

  // Smart display logic - show more events if user has behavior data
  useEffect(() => {
    if (hasSignificantBehavior && !smartDisplayEnabled && allEvents.length >= 24) {
      console.log('🧠 [SmartHomePage] Enabling smart display for user with behavior data');
      setDisplayedEvents(allEvents.slice(0, 24)); // Show 24 instead of 12
      setSmartDisplayEnabled(true);
    } else if (!hasSignificantBehavior && smartDisplayEnabled) {
      console.log('🔄 [SmartHomePage] Disabling smart display - no significant behavior');
      setDisplayedEvents(allEvents.slice(0, 12)); // Back to 12
      setSmartDisplayEnabled(false);
    }
  }, [hasSignificantBehavior, smartDisplayEnabled, allEvents.length]);

  const handleLoadMore = async () => {
    if (isLoading) return;
    
    console.log('🔄 [SmartHomePage] Loading more events...');
    setIsLoading(true);
    
    try {
      const currentPage = Math.ceil(allEvents.length / 12) + 1;
      const result = await getFilteredEvents({
        page: currentPage,
        limit: 12,
        price: "all",
        date: "all",
        location: "all", 
        category: "all",
        q: "",
      });

      const newEvents = [...allEvents, ...result.events];
      setAllEvents(newEvents);
      setDisplayedEvents(newEvents.slice(0, displayedEvents.length + 12));
      setHasMore(result.hasMore);
      
      console.log(`🎯 [SmartHomePage] Loaded ${result.events.length} more events. Total: ${newEvents.length}`);
    } catch (error) {
      console.error('[SmartHomePage] Failed to load more events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 [SmartHomePage] State check:', {
      hasSignificantBehavior,
      smartDisplayEnabled,
      totalEvents: allEvents.length,
      displayedEvents: displayedEvents.length,
      isLoading,
      hasMore
    });
  }, [hasSignificantBehavior, smartDisplayEnabled, allEvents.length, displayedEvents.length, isLoading, hasMore]);

  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {t("titlecategories")}
      </h2>

      {isLoading && smartDisplayEnabled && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm">
            🧠 Loading personalized events for you...
          </div>
        </div>
      )}

      <SmartEventGrid
        events={displayedEvents}
        aiPool={allEvents}
        renderLimit={smartDisplayEnabled ? 24 : displayedEvents.length}
        showAIRecommendations={true}
        enableSmartOrdering={smartDisplayEnabled}
      />

      {(hasMore || displayedEvents.length < allEvents.length) && (
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
        events={allEvents}
        displayedEvents={displayedEvents}
        hasSignificantBehavior={hasSignificantBehavior}
        smartDisplayEnabled={smartDisplayEnabled}
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
    console.log('✅ Test behavior data added to anonymous user! Reload the page to see smart display.');
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
}
*/