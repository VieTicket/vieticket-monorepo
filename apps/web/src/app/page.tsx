import CategoryList from "@/components/events/catetory-cards";
import { EventGridSection } from "@/components/events/event-grid";
import SearchBar from "@/components/ui/search-bar";
import { getEventSummaries } from "@/lib/queries/events";


function HeroSection() {
    return (
        <section
            className="relative bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/images/hero-banner.jpg')"
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-32 text-center">
                <span className="text-white">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Don&rsquo;t miss out!
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-semibold">
                        Explore the <span className="text-yellow-400">vibrant events</span> happening locally and globally.
                    </h2>
                </span>

                <div className="mt-12">
                    <SearchBar />
                </div>
            </div>
        </section>
    );
}

export default function Home() {

    const eventPromise = getEventSummaries({
        limit: 12, // Works best on 1, 2, 3, or 4 columns
        sortColumnKey: 'startTime'
    })

    return (
        <>
            <HeroSection />
            <main className={'max-w-7xl mx-auto px-safe-offset-0'}>
                <CategoryList />
                <EventGridSection
                    title="Discover Best of Online Events"
                    events={eventPromise}
                />
            </main>
        </>
    )
}
