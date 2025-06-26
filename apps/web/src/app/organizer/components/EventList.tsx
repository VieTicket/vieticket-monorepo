"use client";

import EventCard from "./EventCard";
import { type Event } from "@vieticket/db/postgres/schema"; // hoặc đường dẫn tương ứng

interface EventListProps {
  title: string;
  events: Event[];
}

export default function EventList({ title, events }: EventListProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
