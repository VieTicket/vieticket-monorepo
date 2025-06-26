import EventList from "./components/EventList";
import { getEventsByStatus } from "@/lib/services/eventService";

export default async function OrganizerDashboardPage() {
  const organizerId = "SrGWhzN0YIszsytoCeKUWWsW1e6cTHHS"; // TODO: Lấy từ session/user
  const { pending, approved, rejected, passed } =
    await getEventsByStatus(organizerId);

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">🎟️ Organizer Dashboard</h1>
      <EventList title="⏳ Pending Events" events={pending} />
      <EventList title="✅ Approved Events" events={approved} />
      <EventList title="❌ Rejected Events" events={rejected} />
      <EventList title="📁 Passed Events" events={passed} />
    </main>
  );
}
