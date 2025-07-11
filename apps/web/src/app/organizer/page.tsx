import { authorise } from "@/lib/auth/authorise";
import EventList from "./components/EventList";
import { fetchEventsByOrganizer } from "./actions";

export default async function OrganizerDashboardPage() {
  const session = await authorise("organizer");
  const organizerId = session.user.id;

  const all = await fetchEventsByOrganizer(organizerId);

  return (
    <main className="p-6 space-y-10">
      <section className="space-y-10">
        <EventList title="All Events" events={all} />
      </section>
    </main>
  );
}
