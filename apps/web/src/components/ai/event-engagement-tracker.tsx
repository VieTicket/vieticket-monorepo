'use client';

import { useEventEngagement } from '@/hooks/use-event-engagement';
import { ReactNode } from 'react';

interface EventEngagementTrackerProps {
  eventId: string;
  eventTitle: string;
  category?: string;
  location?: string;
  price?: number;
  source?: 'list' | 'search' | 'recommendation';
  children: ReactNode;
  showDebugInfo?: boolean;
}

export function EventEngagementTracker({
  eventId,
  eventTitle,
  category,
  location,
  price,
  source = 'list',
  children,
  showDebugInfo = false
}: EventEngagementTrackerProps) {
  const engagement = useEventEngagement({
    eventId,
    eventTitle,
    category,
    location,
    price,
    source
  });

  return (
    <>
      {children}
      
      {/* Debug info overlay (only in development) */}
      {showDebugInfo && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50">
          <div className="font-bold mb-2">📊 Engagement Tracking</div>
          <div>Time: {engagement.timeSpent.toFixed(1)}s</div>
          <div>Scroll: {(engagement.scrollProgress * 100).toFixed(0)}%</div>
          <div>Max Scroll: {(engagement.maxScrollReached * 100).toFixed(0)}%</div>
          <div>Interactions: {engagement.interactionCount}</div>
          <div>Depth Score: {(engagement.engagementDepth * 100).toFixed(0)}%</div>
          <div className="text-gray-300 mt-1">Event: {eventTitle}</div>
        </div>
      )}
    </>
  );
}