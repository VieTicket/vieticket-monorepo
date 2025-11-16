'use client';

import { useEffect, useRef, useState } from 'react';
import { useUserTracking } from './use-user-tracking';

interface UseEventEngagementProps {
  eventId: string;
  eventTitle: string;
  category?: string;
  location?: string;
  price?: number;
  source?: 'list' | 'search' | 'recommendation';
}

export function useEventEngagement({
  eventId,
  eventTitle,
  category,
  location,
  price,
  source = 'list'
}: UseEventEngagementProps) {
  const { trackEventEngagement } = useUserTracking();
  const startTimeRef = useRef<number>(Date.now());
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [maxScrollReached, setMaxScrollReached] = useState<number>(0);
  const [interactionCount, setInteractionCount] = useState<number>(0);
  const hasTrackedRef = useRef<boolean>(false);

  // Track scroll progress để measure engagement depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.min(scrollTop / docHeight, 1);
      
      setScrollProgress(scrollPercent);
      setMaxScrollReached(prev => Math.max(prev, scrollPercent));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track user interactions (clicks, etc.)
  useEffect(() => {
    const handleInteraction = () => {
      setInteractionCount(prev => prev + 1);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Track engagement when user leaves page or after minimum time
  useEffect(() => {
    const trackEngagement = () => {
      if (hasTrackedRef.current) return;
      
      const timeSpent = (Date.now() - startTimeRef.current) / 1000; // Convert to seconds
      
      // Only track if user spent meaningful time (at least 5 seconds)
      if (timeSpent >= 5) {
        const engagementDepth = calculateEngagementDepth(maxScrollReached, interactionCount, timeSpent);

        trackEventEngagement({
          eventId,
          eventTitle,
          category,
          location,
          price,
          timeSpent,
          engagementDepth,
          source
        });

        hasTrackedRef.current = true;
      }
    };

    // Track on page visibility change (user switches tabs/minimizes)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEngagement();
      }
    };

    // Track on beforeunload (user navigates away)
    const handleBeforeUnload = () => {
      trackEngagement();
    };

    // Track after 30 seconds minimum (if still on page)
    const timer = setTimeout(() => {
      trackEngagement();
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      trackEngagement(); // Final tracking on cleanup
    };
  }, [eventId, eventTitle, category, location, price, source, maxScrollReached, interactionCount, trackEventEngagement]);

  return {
    timeSpent: (Date.now() - startTimeRef.current) / 1000,
    scrollProgress,
    maxScrollReached,
    interactionCount,
    engagementDepth: calculateEngagementDepth(maxScrollReached, interactionCount, (Date.now() - startTimeRef.current) / 1000)
  };
}

// Calculate engagement depth score (0-1)
function calculateEngagementDepth(scrollProgress: number, interactions: number, timeSpent: number): number {
  // Scroll component (0-0.4): How much of page they viewed
  const scrollScore = Math.min(scrollProgress * 0.4, 0.4);
  
  // Interaction component (0-0.3): How actively they engaged
  const interactionScore = Math.min(interactions / 10 * 0.3, 0.3);
  
  // Time component (0-0.3): How long they stayed (diminishing returns after 120s)
  const timeScore = Math.min(timeSpent / 120 * 0.3, 0.3);
  
  return scrollScore + interactionScore + timeScore;
}

// Hook to manually track specific engagement events
export function useEventInteractionTracking() {
  const { trackEventEngagement } = useUserTracking();

  const trackSpecificEngagement = (
    eventData: UseEventEngagementProps,
    interactionType: 'ticket_purchase_click' | 'share_click' | 'favorite_toggle' | 'contact_organizer',
    customDepth?: number
  ) => {
    trackEventEngagement({
      ...eventData,
      timeSpent: 0, // For specific actions, time isn't the main metric
      engagementDepth: customDepth || 0.8, // High engagement for specific actions
      source: eventData.source || 'list'
    });
  };

  return { trackSpecificEngagement };
}