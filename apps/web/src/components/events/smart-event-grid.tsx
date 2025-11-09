"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAIRecommendations, useUserTracking, type EventForRecommendation, type RecommendationResult } from '@/hooks/use-user-tracking';
import { EventSummary } from "@/lib/queries/events";
import { StaticEventGrid } from './event-grid';
import { safeToISOString } from '@/components/ai/ai-utils';

interface SmartEventGridProps {
  events: EventSummary[]; // events to render by default
  aiPool?: EventSummary[]; // optional pool of events AI should analyze
  renderLimit?: number; // optional: limit how many events to render (homepage uses this)
  showAIRecommendations?: boolean;
  enableSmartOrdering?: boolean; // New prop to control AI ordering
}

/**
 * Enhanced event grid that reorders events based on AI recommendations
 */
export function SmartEventGrid({ 
  events, 
  aiPool,
  renderLimit,
  showAIRecommendations = true, 
  enableSmartOrdering = true 
}: SmartEventGridProps) {
  const { recommendations, getRecommendations, isLoading } = useAIRecommendations();
  const { userBehavior } = useUserTracking();
  // smartOrderedEvents represents the ordering produced by AI over the aiPool (or events)
  const [smartOrderedEvents, setSmartOrderedEvents] = useState<EventSummary[]>(events);

  // Check if user has significant behavior data
  const hasSignificantBehavior = useMemo(() => {
    return userBehavior ? (
      userBehavior.searchQueries?.length > 0 || 
      userBehavior.viewedEvents?.length > 2 || 
      userBehavior.clickedEvents?.length > 1 ||
      userBehavior.eventEngagement?.length > 0
    ) : false;
  }, [userBehavior]);

  // Memoize behavior check to prevent excessive logging
  const behaviorCheck = useMemo(() => ({
    hasSignificantBehavior,
    enableSmartOrdering,
    shouldUseAI: enableSmartOrdering && hasSignificantBehavior,
    eventsCount: events.length,
    aiPoolSize: aiPool?.length || 0,
    renderLimit
  }), [hasSignificantBehavior, enableSmartOrdering, events.length, aiPool?.length, renderLimit]);

  // Only log occasionally to reduce noise
  if (Math.random() < 0.1) {
    console.log('🧠 [SmartEventGrid] Behavior check:', behaviorCheck);
  }

  // AI should analyze the larger pool when provided (aiPool) otherwise analyze the events prop
  const aiPoolToUse = aiPool && aiPool.length > 0 ? aiPool : events;

  // Convert EventSummary to EventForRecommendation format
  const aiEvents: EventForRecommendation[] = useMemo(() => 
    aiPoolToUse.map(event => {
      try {
        return {
          id: event.id,
          title: event.name,
          description: '',
          category: event.type || '',
          location: event.location || '',
          price: event.typicalTicketPrice || 0,
          poster_url: event.bannerUrl || '',
          created_at: safeToISOString(event.startTime)
        };
      } catch (error) {
        console.error('Error converting event to AI format:', error, event);
        return {
          id: event.id,
          title: event.name,
          description: '',
          category: event.type || '',
          location: event.location || '',
          price: event.typicalTicketPrice || 0,
          poster_url: event.bannerUrl || '',
          created_at: new Date().toISOString() // Fallback to current date
        };
      }
    }), [aiPoolToUse]
  );

  // Memoize stable identifiers for aiEvents to prevent useEffect dependency issues
  const aiEventsLength = aiEvents.length;
  const aiEventsIds = useMemo(() => aiEvents.map(e => e.id).join(','), [aiEvents]);
  
  // Use ref to access latest aiEvents in useEffect without adding to dependencies
  const aiEventsRef = useRef(aiEvents);
  aiEventsRef.current = aiEvents;

  // Trigger AI recommendations only when user has significant behavior data
  useEffect(() => {
    if (behaviorCheck.shouldUseAI && aiEventsLength > 0) {
      console.log('🚀 [SmartEventGrid] Triggering AI recommendations for user with behavior data (pool size:', aiEventsLength, ')');
      getRecommendations(aiEventsRef.current);
    } else {
      console.log('🔄 [SmartEventGrid] Skipping AI recommendations:', {
        enableSmartOrdering: behaviorCheck.enableSmartOrdering,
        hasSignificantBehavior: behaviorCheck.hasSignificantBehavior,
        aiPoolSize: aiEventsLength
      });
    }
  }, [aiEventsLength, aiEventsIds, getRecommendations, behaviorCheck.shouldUseAI]); // Remove aiEvents from dependencies

  // Reorder events based on AI recommendations
  useEffect(() => {
    // When recommendations are available we sort the aiPoolToUse; then we derive what to render
    if (recommendations.length > 0 && aiPoolToUse.length > 0) {
      // Create a map of event ID to AI score
      const scoreMap = new Map<string, number>();
      recommendations.forEach(rec => {
        scoreMap.set(rec.event.id, rec.score);
      });

      // Sort the aiPoolToUse by score
      const reorderedPool = [...aiPoolToUse].sort((a, b) => {
        const scoreA = scoreMap.get(a.id) || 0;
        const scoreB = scoreMap.get(b.id) || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return aiPoolToUse.indexOf(a) - aiPoolToUse.indexOf(b);
      });

      // If a renderLimit is specified, we want the grid to render the top renderLimit
      if (typeof renderLimit === 'number' && renderLimit > 0) {
        // Take top N from reordered pool to render
        const topForRender = reorderedPool.slice(0, renderLimit);
        setSmartOrderedEvents(topForRender);
      } else {
        // No render limit: expose full ordered pool (falls back to existing behavior)
        setSmartOrderedEvents(reorderedPool);
      }
    } else {
      // No recommendations yet, use original events order (or limited view)
      if (typeof renderLimit === 'number' && renderLimit > 0) {
        setSmartOrderedEvents(events.slice(0, renderLimit));
      } else {
        setSmartOrderedEvents(events);
      }
    }
  }, [recommendations, aiPoolToUse, events, renderLimit]);

  return (
    <div className="space-y-6">
      {/* AI Recommendations Section */}
      {showAIRecommendations}
      
      {/* Personalized Event Grid */}
      <div className="relative">
        {isLoading && recommendations.length === 0 && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-full text-xs z-10">
            🧠 Analyzing your preferences...
          </div>
        )}
        
        <StaticEventGrid events={smartOrderedEvents} />
      </div>
    </div>
  );
}