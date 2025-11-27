"use client";

import { useEffect, useState, useMemo } from "react";
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

  // Check if user has significant behavior data - memoized to prevent re-computation
  const hasSignificantBehavior = useMemo(() => {
    if (!userBehavior) return false;
    return userBehavior.searchQueries?.length > 0 || 
           userBehavior.viewedEvents?.length > 2 || 
           userBehavior.clickedEvents?.length > 1 ||
           userBehavior.eventEngagement?.length > 0;
  }, [userBehavior?.searchQueries?.length, userBehavior?.viewedEvents?.length, userBehavior?.clickedEvents?.length, userBehavior?.eventEngagement?.length]);

  // Smart display logic - simplified with minimal dependencies
  useEffect(() => {
    if (hasSignificantBehavior && !smartDisplayEnabled && allEvents.length >= 24) {
      setDisplayedEvents(prev => allEvents.slice(0, 24)); 
      setSmartDisplayEnabled(true);
    }
  }, [hasSignificantBehavior, allEvents.length]); // Remove smartDisplayEnabled from deps to prevent loops

  const handleLoadMore = async () => {
    if (isLoading) return;
    
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
      
    } catch (error) {
      console.error('[SmartHomePage] Failed to load more events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="my-5">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center glow-text">
        <div className="bg-gradient-to-r from-violet-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
          {t("titlecategories")}
        </div>
      </h2>

      {isLoading && smartDisplayEnabled && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-900/20 backdrop-blur-sm border border-violet-400/30 text-violet-300 rounded-full text-sm">
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
            className="professional-button text-white font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-violet-400/30 hover:border-violet-400/50"
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