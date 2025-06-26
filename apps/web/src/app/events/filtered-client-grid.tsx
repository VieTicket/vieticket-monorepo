"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import EventFiltersSidebar from "@/components/events/eventfilters-sidebar";
import StaticFilteredEventGrid from "@/components/events/static-filtered-event-grid";
import { EventSummary } from "@/lib/queries/events";

interface Props {
  events: EventSummary[];
}

const PRICE_RANGES = [
  { label: "Dưới 500.000", min: 0, max: 500000, value: "lt500k" },
  { label: "500.000 - 1.000.000", min: 500000, max: 1000000, value: "500k-1m" },
  { label: "1.000.000 - 3.000.000", min: 1000000, max: 3000000, value: "1m-3m" },
  { label: "3.000.000 - 5.000.000", min: 3000000, max: 5000000, value: "3m-5m" },
  { label: "Trên 5.000.000", min: 5000000, max: Infinity, value: "gt5m" },
];

export default function FilteredClientGrid({ events }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const priceRange = searchParams.get("price") || "all";
  const date = searchParams.get("date") || "all";
  const location = searchParams.get("location") || "all";
  const category = searchParams.get("category") || "all";
  const query = searchParams.get("q") || "";

  const normalize = (str: string) =>
    str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const ticketPrice = event.typicalTicketPrice ?? 0;
      let matchPrice = true;

      if (priceRange !== "all") {
        const range = PRICE_RANGES.find((r) => r.value === priceRange);
        if (range) {
          matchPrice = ticketPrice >= range.min && ticketPrice < range.max;
        }
      }

      const now = new Date();
      const start = new Date(event.startTime);
      let matchDate = true;

      if (date === "today") {
        matchDate = start.toDateString() === now.toDateString();
      } else if (date === "thisWeek") {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 7);
        matchDate = start >= now && start <= endOfWeek;
      }

      const matchLocation =
        location === "all" ||
        (event.location &&
          normalize(event.location).includes(normalize(location)));

      const matchCategory =
        category === "all" ||
        (event.type && normalize(event.type).includes(normalize(category)));

      const matchQuery =
        query === "" ||
        (event.name && normalize(event.name).includes(normalize(query)));

      return matchPrice && matchDate && matchLocation && matchCategory && matchQuery;
    });
  }, [priceRange, date, location, category, query, events]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => {
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex gap-8">
      <div className="w-64">
        <EventFiltersSidebar
          selectedPriceRange={priceRange}
          selectedDate={date}
          selectedLocation={location}
          selectedCategory={category}
          onChange={handleFilterChange}
        />
      </div>

      <div className="flex-1">
        <StaticFilteredEventGrid events={filteredEvents} />
      </div>
    </div>
  );
}
