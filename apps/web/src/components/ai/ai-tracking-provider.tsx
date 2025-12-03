"use client";

import { useEffect, Suspense } from 'react';
import { useUserTracking, useAIRecommendations, type EventForRecommendation } from '@/hooks/use-user-tracking';
import { useSearchParams, usePathname } from 'next/navigation';
import { EventSummary } from "@/lib/queries/events";
import { safeToISOString } from './ai-utils';

interface AITrackingProviderProps {
  children: React.ReactNode;
  events?: EventSummary[];
}

/**
 * Internal component that handles search params tracking
 */
function SearchParamsTracker() {
  const { trackSearch } = useUserTracking();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.get('q');
    if (query && query.trim()) {
      trackSearch(query.trim());
    }
  }, [searchParams, trackSearch]);

  return null;
}

/**
 * Component wrapper to track user behavior for AI personalization
 */
export function AITrackingProvider({ children, events = [] }: AITrackingProviderProps) {
  const { trackEventView } = useUserTracking();
  const { getRecommendations } = useAIRecommendations();
  const pathname = usePathname();

  // Track filter selections as implicit search behavior
  // DISABLED: to avoid conflict with direct trackFilterSelection calls in FilteredClientGrid
  /*
  useEffect(() => {
    const location = searchParams.get('location');
    const category = searchParams.get('category');
    const price = searchParams.get('price');
    const date = searchParams.get('date');
    
    if (location && location !== 'all') {
      trackSearch(`location:${location}`);
    }
    
    if (category && category !== 'all') {
      trackSearch(`category:${category}`);
    }
    
    if (price && price !== 'all') {
      trackSearch(`price:${price}`);
    }
    
    if (date && date !== 'all') {
      trackSearch(`date:${date}`);
    }
  }, [searchParams, trackSearch]);
  */

  // Auto-trigger AI recommendations when events change
  useEffect(() => {
    if (events.length > 0) {
      const aiEvents: EventForRecommendation[] = events.map(event => {
        try {
          return {
            id: event.id,
            title: event.name,
            description: '', // EventSummary doesn't have description
            category: event.type || '', // Use event type as category
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
      });

      // Small delay to ensure tracking has been processed
      const timeoutId = setTimeout(() => {
        getRecommendations(aiEvents);
      }, 1000); // Increased delay to 1 second
      
      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [events]); // Removed getRecommendations from dependencies

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsTracker />
      </Suspense>
      {children}
    </>
  );
}

/**
 * Hook to track event interactions
 */
export function useEventTracking() {
  const { trackEventView, trackEventClick } = useUserTracking();

  const handleEventView = (event: EventSummary) => {
    trackEventView({
      id: event.id,
      title: event.name,
      description: '', // EventSummary doesn't have description
      category: event.type || '', // Use event type as category
      location: event.location || '',
      price: event.typicalTicketPrice || 0
    });
  };

  const handleEventClick = (event: EventSummary) => {
    trackEventClick({
      id: event.id,
      title: event.name,
      description: '', // EventSummary doesn't have description
      category: event.type || '' // Use event type as category
    });
  };

  return {
    handleEventView,
    handleEventClick
  };
}