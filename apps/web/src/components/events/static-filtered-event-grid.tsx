import { SmartEventGrid } from "./smart-event-grid";
import { EventSummary } from "@/lib/queries/events";

export default function StaticFilteredEventGrid({
  events,
  aiPool,
  renderLimit
}: {
  events: EventSummary[];
  aiPool?: EventSummary[];
  renderLimit?: number;
}) {
  if (!events?.length) {
    return <div>No events found</div>;
  }

  return <SmartEventGrid events={events} aiPool={aiPool} renderLimit={renderLimit} showAIRecommendations={false} />;
}