"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EventList from "./components/EventList";
import { fetchCurrentOrganizerEvents } from "@/lib/actions/organizer/fetch-organizer-events";
import { Event } from "@vieticket/db/pg/schema";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/auth-client";

export default function OrganizerDashboardPage() {
  const [events, setEvents] = useState<Omit<Event, "organizationId">[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("organizer-dashboard.ListEvent");
  const router = useRouter();

  const { data: session } = authClient.useSession();

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

  // Redirect non-owner members to a page they can access, then load events
  useEffect(() => {
    if (session) {
      const isOrganizerRole = session.user?.role === "organizer";

      // If user is a regular member (not organizer role, not owner, not admin), redirect to seat map
      if (!isOrganizerRole) {
        router.replace("/organizer/seat-map");
        return;
      }

      // Only load events if user has access (organizer role or owner/admin)
      loadEvents();
    } else if (session) {
      // User is not in an organization but has organizer role
      loadEvents();
    }
  }, [session, router]);

  const handleEventDeleted = () => {
    loadEvents(); // Refresh the event list after deletion
  };

  if (loading) {
    return (
      <main className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
        <div className="flex flex-col justify-center items-center h-32 sm:h-40 md:h-48 lg:h-64 space-y-3 sm:space-y-4">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 border-2 sm:border-3 border-gray-300 border-t-blue-600"></div>
          <div className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-medium">Loading events...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-full overflow-x-hidden p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 min-h-screen">
      <div className="max-w-full mx-auto">
        <section className="space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10">
          <EventList
            title={t("allEvents")}
            events={events}
            onEventDeleted={handleEventDeleted}
          />
        </section>
      </div>
    </main>
  );
}
