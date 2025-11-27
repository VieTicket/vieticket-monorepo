import CategoryList from "@/components/events/category-cards";
import { getFilteredEvents } from "@/lib/queries/events";
import HeroCarousel from "@/components/HeroCarousel";
import { SmartHomePageGrid } from "@/components/events/smart-homepage-grid";
import { MouseGlowEffect } from "@/components/effects/mouse-glow";

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
    <>
      {/* Professional Dark Background - Inline for simplicity */}
      <div className="fixed inset-0 bg-slate-950" style={{ zIndex: 0 }} />
      
      {/* Static Gradient Accents */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-yellow-400/10 to-purple-600/10 blur-[120px] rounded-full pointer-events-none" style={{ zIndex: 1 }} />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/10 to-yellow-400/10 blur-[120px] rounded-full pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Mouse Glow Effect */}
      <MouseGlowEffect />
      
      <div className="relative z-10">
        <HeroCarousel />
        <main className="max-w-7xl mx-auto px-safe-offset-0 mt-5">
          <CategoryList />
          <SmartHomePageGrid 
            initialEvents={eventResult.events}
            initialHasMore={eventResult.hasMore}
          />
        </main>
      </div>
    </>
  );
}
