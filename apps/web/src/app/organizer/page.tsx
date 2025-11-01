"use client";

import { useEffect, useState } from "react";
import EventList from "./components/EventList";
import { fetchCurrentOrganizerEvents } from "@/lib/actions/organizer/fetch-organizer-events";
import { Event } from "@vieticket/db/pg/schema";

export default function OrganizerDashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await fetchCurrentOrganizerEvents();
      setEvents(allEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleEventDeleted = () => {
    loadEvents(); // Refresh the event list after deletion
  };

  if (loading) {
    return (
      <main className="p-6 space-y-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-10">
      <section className="space-y-10">
        <EventList
          title="All Events"
          events={events}
          onEventDeleted={handleEventDeleted}
        />
      </section>
    </main>
  );
}
