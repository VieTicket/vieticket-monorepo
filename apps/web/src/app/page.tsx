import CategoryList from "@/components/events/category-cards";
import { getFilteredEvents } from "@/lib/queries/events";
import HeroCarousel from "@/components/HeroCarousel";
import { AITrackingProvider } from "@/components/ai/ai-tracking-provider";
import { SmartHomePageGrid } from "@/components/events/smart-homepage-grid";

export default async function Home() {
  // Load more events initially to provide better AI personalization
  // This reduces the need for client-side expansion and reordering
  const eventResult = await getFilteredEvents({
    page: 1,
    limit: 36, // Increased from 12 to reduce client-side loading
    price: "all",
    date: "all", 
    location: "all",
    category: "all",
    q: "",
  });

  return (
    <AITrackingProvider events={eventResult.events}>
      <HeroCarousel />
      <main className="max-w-7xl mx-auto px-safe-offset-0">
        <CategoryList />
        <SmartHomePageGrid 
          initialEvents={eventResult.events}
          initialHasMore={eventResult.hasMore}
        />
      </main>
    </AITrackingProvider>
  );
}
