"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrencyVND, formatTimeRange } from "@/lib/utils";
import {
  use,
  useState,
  useTransition,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  EventCursor,
  EventSummary,
  EventSummaryResponse,
  getEventSummaries,
  SortableEventColumnKey,
} from "@/lib/queries/events";
import { Button } from "../ui/button";
import { useUserTracking } from "@/hooks/use-user-tracking";
import { useTranslations } from "next-intl";
import { SmartEventGrid } from "./smart-event-grid";
import { MouseGlowEffect } from "../effects/mouse-glow";
import { EventCompareModal } from "../event/EventCompareModal";
import { EventFull } from "@vieticket/db/pg/schema";

// Mouse Glow Effect Component - Use shared component
// Removed local definition in favor of shared component

interface EventGridProps {
  events: EventSummary[];
}

export function EventCard({
  id,
  name,
  slug,
  location,
  startTime,
  endTime,
  typicalTicketPrice,
  bannerUrl,
  views,
  organizer,
}: Omit<EventSummary, "id"> & { id: string }) {
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [currentEventFull, setCurrentEventFull] = useState<EventFull | null>(
    null
  );
  const eventHref = `/events/${slug}`;

  // Fetch full event data when opening compare modal
  const handleOpenCompareModal = async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentEventFull(data.event);
        setIsCompareModalOpen(true);
      } else {
        console.error("Failed to fetch event details");
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
    }
  };

  const handleAddToCompare = (eventIds: string[]) => {
    console.log("Added events to compare:", eventIds);
    // You can implement your compare logic here
  };

  return (
    <>
      <Link
        href={eventHref}
        className="block h-full w-full group animate-fade-in-up hover-scale-105"
      >
        <Card className="professional-card flex flex-col h-full w-full overflow-hidden rounded-xl shadow-xl !pt-0 hover:shadow-2xl hover:border-violet-400/30 transition-all duration-300 transform hover:translateY-[-4px] hover:scale-[1.02] cursor-pointer professional-card-hover max-h-64">
          {/* Image */}
          <div className="relative w-full h-[140px] flex-shrink-0 bg-slate-800 overflow-hidden">
            {bannerUrl ? (
              <>
                <Image
                  src={bannerUrl}
                  alt={name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-all duration-300"></div>
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full text-slate-400 text-xl bg-slate-800 border border-slate-700/30">
                <span>No Image</span>
              </div>
            )}
            {/* Compare Event */}
            <div
              className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-violet-400/30 hover:bg-slate-800/90 hover:border-violet-400/50 transition-all duration-300 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenCompareModal();
              }}
            >
              <Star
                className="w-4 h-4 text-violet-400 hover:text-violet-300"
                strokeWidth={1.5}
              />
            </div>
            {/* Organizer - Only show if organizer exists */}
            {organizer?.name && (
              <div className="absolute bottom-2 left-2 bg-gradient-to-r from-violet-500/90 to-indigo-500/90 backdrop-blur-sm text-white font-medium text-xs px-2 py-1 rounded-full border border-violet-400/40 shadow-lg animate-shimmer">
                {organizer.name}
              </div>
            )}
          </div>

          <CardContent className="flex flex-col flex-grow p-3 pb-2">
            {/* Hidden location data for SEO/accessibility - not displayed */}
            <span className="sr-only">{location}</span>

            {/* Title - Full display */}
            <h3 className="text-sm font-semibold text-white leading-tight group-hover:text-violet-300 transition-colors duration-300 glow-text mb-1">
              {name}
            </h3>

            {/* Date + Time */}
            <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300 mb-auto">
              {formatTimeRange(new Date(startTime), new Date(endTime))}
            </p>

            {/* Price + Views - Absolutely fixed at bottom */}
            <div className="flex items-center justify-between mt-auto">
              <span className="text-lg font-bold text-yellow-400">
                {formatCurrencyVND(typicalTicketPrice)}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-violet-400 transition-colors duration-300">
                <Eye className="w-3 h-3" />
                <span>{views || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Compare Modal */}
      {currentEventFull && (
        <EventCompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          currentEvent={currentEventFull}
          onAddToCompare={handleAddToCompare}
        />
      )}
    </>
  );
}

function EventGridLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full grid gap-4 justify-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {children}
    </div>
  );
}

export function StaticEventGrid({ events }: EventGridProps) {
  return (
    <EventGridLayout>
      {events.map((event) => (
        <EventCard key={event.id} {...event} />
      ))}
    </EventGridLayout>
  );
}

interface EventGridSectionProps {
  initialEvents: EventSummaryResponse;
  sortColumnKey?: SortableEventColumnKey;
  limit?: number;
}

export function EventGridSection({
  initialEvents,
  sortColumnKey = "startTime",
  limit = 12,
}: EventGridSectionProps) {
  const awaitedResult = use(initialEvents);
  const [events, setEvents] = useState<EventSummary[]>(awaitedResult.events);
  // aiPool will hold a larger pool of events for AI to analyze (helps on initial ordering)
  const [aiPool, setAiPool] = useState<EventSummary[]>(awaitedResult.events);
  const [hasMore, setHasMore] = useState(awaitedResult.hasMore);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("home");

  const handleClickSeeMore = useCallback(() => {
    if (!hasMore || isPending) return;

    startTransition(async () => {
      try {
        // Get the last event to create cursor
        const lastEvent: EventSummary | undefined = events[events.length - 1];
        if (!lastEvent) return;

        // Create cursor based on sort column
        const cursor: EventCursor = {
          sortValue: lastEvent[sortColumnKey] as number | Date,
          id: lastEvent.id,
        };

        // Fetch more events
        const result = await getEventSummaries({
          limit,
          cursor,
          sortColumnKey,
        });

        // Filter out duplicate events to prevent key conflicts
        const newEvents = result.events.filter(
          (newEvent) =>
            !events.some((existingEvent) => existingEvent.id === newEvent.id)
        );

        // Append new events
        console.log(
          `Loaded ${newEvents.length} new events (${result.events.length} total fetched). Total: ${events.length + newEvents.length}`
        );
        setEvents((prev) => [...prev, ...newEvents]);
        setAiPool((prev) => {
          // Merge without duplicates
          const merged = [...prev];
          newEvents.forEach((e) => {
            if (!merged.some((m) => m.id === e.id)) merged.push(e);
          });
          return merged;
        });
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to load more events:", error);
      }
    });
  }, [hasMore, isPending, events, limit, sortColumnKey]);

  // If user has significant behavior, prefetch a larger pool for AI to analyze so
  // events page can surface prioritized items immediately.
  const { userBehavior } = useUserTracking();
  useEffect(() => {
    const hasSignificantBehavior = userBehavior
      ? userBehavior.searchQueries?.length > 0 ||
        userBehavior.viewedEvents?.length > 2 ||
        userBehavior.clickedEvents?.length > 1 ||
        userBehavior.eventEngagement?.length > 0
      : false;

    if (!hasSignificantBehavior) return;

    const desiredPoolSize = 36;
    if (aiPool.length >= desiredPoolSize) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await getEventSummaries({
          limit: desiredPoolSize,
          sortColumnKey,
        });
        if (cancelled) return;
        // Merge and dedupe
        const merged = [...aiPool];
        result.events.forEach((e) => {
          if (!merged.some((m) => m.id === e.id)) merged.push(e);
        });
        setAiPool(merged);
        console.log(
          "🔎 Prefetched aiPool for EventGridSection, size:",
          merged.length
        );
      } catch (err) {
        console.error("Failed to prefetch aiPool for events page:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userBehavior, aiPool.length, sortColumnKey]);

  return (
    <>
      <MouseGlowEffect />
      <section className="px-4 py-12 professional-card rounded-lg mx-4 mb-6 shadow-xl border border-slate-700/30 hover:border-violet-400/30 transition-all duration-500 animate-fade-in">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center glow-text-intense animate-glow">
          <div className="bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-300 bg-clip-text text-transparent animate-gradient-text">
            {t("titlecategories")}
          </div>
        </h2>

        <SmartEventGrid
          events={events}
          aiPool={aiPool}
          renderLimit={events.length}
          showAIRecommendations={true}
        />

        {hasMore && (
          <div className="mt-8 flex justify-center animate-fade-in-up">
            <Button
              onClick={handleClickSeeMore}
              disabled={isPending}
              className="professional-button text-white font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-violet-400/30 hover:border-violet-400/50 bg-gradient-to-r from-violet-400/10 to-indigo-400/10 hover:from-violet-400/20 hover:to-indigo-400/20"
              size="lg"
            >
              {isPending ? "Loading..." : t("seeMore")}
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
