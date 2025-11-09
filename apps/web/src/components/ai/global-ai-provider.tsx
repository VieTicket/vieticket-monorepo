"use client";

import { createContext, useContext, useEffect } from 'react';
import { useUserTracking } from '@/hooks/use-user-tracking';
import { usePathname, useSearchParams } from 'next/navigation';

interface AIContextType {
  // Add any global AI state if needed
}

const AIContext = createContext<AIContextType>({});

interface GlobalAIProviderProps {
  children: React.ReactNode;
}

/**
 * Global AI provider that persists across page navigation
 * Should be placed at the root layout level
 */
export function GlobalAIProvider({ children }: GlobalAIProviderProps) {
  const { trackSearch } = useUserTracking();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Global tracking for any search parameters across the app
  useEffect(() => {
    const query = searchParams.get('q');
    const location = searchParams.get('location');
    const category = searchParams.get('category');
    const price = searchParams.get('price');
    
    // Track search queries
    if (query && query.trim()) {
      trackSearch(query.trim());
    }
    
    // Track filter selections as implicit searches
    if (location && location !== 'all') {
      trackSearch(`tìm ở ${location}`);
    }
    
    if (category && category !== 'all') {
      trackSearch(`loại ${category}`);
    }

    if (price && price !== 'all') {
      // Convert price filter to search intent
      if (price.includes('under')) {
        trackSearch('sự kiện giá rẻ');
      } else if (price.includes('1000000')) {
        trackSearch('sự kiện cao cấp');
      } else {
        trackSearch(`giá ${price}`);
      }
    }
  }, [searchParams, trackSearch]);

  // Track page navigation patterns
  useEffect(() => {
    // Track specific page patterns that indicate user interest
    if (pathname.includes('/events/')) {
      const eventSlug = pathname.split('/events/')[1];
      if (eventSlug && !eventSlug.includes('/')) {
        // This could be enhanced to track specific event views
      }
    }
  }, [pathname]);

  return (
    <AIContext.Provider value={{}}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  return useContext(AIContext);
}