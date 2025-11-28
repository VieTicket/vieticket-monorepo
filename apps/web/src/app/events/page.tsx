import { Suspense } from "react";
import FilteredClientGrid from "./filtered-client-grid";
import SearchBar from "@/components/ui/search-bar";
import { MouseGlowEffect } from "@/components/effects/mouse-glow";

export default async function EventsPage() {
  return (
    <>
      {/* Professional Dark Background */}
      <div className="fixed inset-0 bg-slate-950" style={{ zIndex: 0 }} />
      
      {/* Static Gradient Accents */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-yellow-400/10 to-purple-600/10 blur-[120px] rounded-full pointer-events-none" style={{ zIndex: 1 }} />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/10 to-yellow-400/10 blur-[120px] rounded-full pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Mouse Glow Effect */}
      <MouseGlowEffect />
      
      <div className="relative z-10 min-h-screen">
        {/* Search Bar Section */}
        <div className="pt-4 sm:pt-8 md:pt-12 pb-4 sm:pb-6 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={
              <div className="professional-card rounded-lg p-4 shadow-xl border border-slate-700/30">
                <div className="text-center text-slate-400">Loading search...</div>
              </div>
            }>
              <SearchBar />
            </Suspense>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 md:pb-16">
          <Suspense fallback={
            <div className="professional-card rounded-lg p-6 sm:p-8 shadow-xl border border-slate-700/30">
              <div className="text-center text-slate-400">Loading events...</div>
            </div>
          }>
            <FilteredClientGrid />
          </Suspense>
        </div>
      </div>
    </>
  );
}
