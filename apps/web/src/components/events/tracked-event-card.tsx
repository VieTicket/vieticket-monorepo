"use client";

import { EventCard as OriginalEventCard } from "./event-grid";
import { useEventTracking } from "@/components/ai/ai-tracking-provider";
import { EventSummary } from "@/lib/queries/events";
import { useEffect, useRef } from "react";

interface TrackedEventCardProps extends Omit<EventSummary, "id"> {
  event: EventSummary;
}

export function TrackedEventCard({ event, ...props }: TrackedEventCardProps) {
  const { handleEventView, handleEventClick } = useEventTracking();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  // Track view when card comes into viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            handleEventView(event);
            hasTrackedView.current = true;
          }
        });
      },
      { threshold: 0.5 } // Track when 50% of card is visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [event, handleEventView]);

  return (
    <div 
      ref={cardRef}
      onClick={() => handleEventClick(event)}
      className="w-full h-full"
    >
      <OriginalEventCard {...props} />
    </div>
  );
}