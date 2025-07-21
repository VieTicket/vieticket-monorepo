"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Eye, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrencyVND, formatTimeRange } from "@/lib/utils";
import { use, useState, useTransition } from "react";
import {
  EventCursor,
  EventSummary,
  EventSummaryResponse,
  getEventSummaries,
  SortableEventColumnKey,
} from "@/lib/queries/events";
import { Button } from "../ui/button";

interface EventGridProps {
  events: EventSummary[];
}

export function EventCard({
  name,
  slug,
  location,
  startTime,
  endTime,
  typicalTicketPrice,
  bannerUrl,
  views,
  organizer,
}: Omit<EventSummary, "id">) {
  const eventHref = `/events/${slug}`;

  return (
    <Link href={eventHref} className="block h-full w-full">
      <Card className="flex flex-col h-full w-full overflow-hidden rounded-xl shadow-md bg-white !pt-0 hover:shadow-lg transition-shadow cursor-pointer">
        {/* Image */}
        <div className="relative w-full h-[180px] flex-shrink-0 bg-gray-100">
          {bannerUrl ? (
            <Image src={bannerUrl} alt={name} fill className="object-cover" />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400 text-4xl bg-gray-200">
              <span>No Image</span>
            </div>
          )}
          {/* Favorite */}
          <div className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md">
            <Star className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          </div>
          {/* Organizer - Only show if organizer exists */}
          {organizer?.name && (
            <div className="absolute bottom-3 left-3 bg-yellow-400 text-black font-semibold text-sm px-3 py-1 rounded">
              {organizer.name}
            </div>
          )}
        </div>

        <CardContent className="flex flex-col flex-grow p-4 space-y-3">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-800 leading-tight line-clamp-2">
            {name}
          </h3>

          {/* Location */}
          <p className="text-sm text-gray-600 font-medium">
            {location || "Location TBA"}
          </p>

          {/* Date + Time */}
          <p className="text-sm text-gray-600">
            {formatTimeRange(new Date(startTime), new Date(endTime))}
          </p>

          {/* Price + Views */}
          <div className="flex items-center justify-between pt-2 mt-auto">
            <span className="text-gray-800 font-semibold">
              {formatCurrencyVND(typicalTicketPrice)}
            </span>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>{views || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EventGridLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full grid gap-4 justify-items-center grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mx-4">
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
  title?: string;
  initialEvents: EventSummaryResponse;
  sortColumnKey?: SortableEventColumnKey;
  limit?: number;
}

export function EventGridSection({
  title = "Discover Best of Online Events",
  initialEvents,
  sortColumnKey = "startTime",
  limit = 12,
}: EventGridSectionProps) {
  const awaitedResult = use(initialEvents);
  const [events, setEvents] = useState<EventSummary[]>(awaitedResult.events);
  const [hasMore, setHasMore] = useState(awaitedResult.hasMore);
  const [isPending, startTransition] = useTransition();

  const handleClickSeeMore = () => {
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

        // Append new events
        setEvents((prev) => [...prev, ...result.events]);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Failed to load more events:", error);
      }
    });
  };

  return (
    <section className="px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {title}
      </h2>

      <StaticEventGrid events={events} />

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleClickSeeMore}
            disabled={isPending}
            variant="outline"
            size="lg"
          >
            See More
          </Button>
        </div>
      )}
    </section>
  );
}
