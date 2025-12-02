"use client";

import EventCard from "./EventCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Event } from "@vieticket/db/pg/schema";

/* Custom scrollbar hiding */
const scrollbarHideStyle = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* Additional overflow protection */
  * {
    box-sizing: border-box;
  }
  
  .event-container {
    max-width: 100vw;
    overflow-x: hidden;
  }
`;

interface EventListProps {
  title: string;
  events: Event[];
  onEventDeleted?: () => void;
}

export default function EventList({
  title,
  events,
  onEventDeleted,
}: EventListProps) {
  const t = useTranslations("organizer-dashboard.ListEvent");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter
      ? event.approvalStatus === statusFilter
      : true;
    return matchesSearch && matchesStatus;
  });

  if (filteredEvents.length === 0 && events.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyle }} />
      <div className="event-container w-full max-w-full overflow-hidden space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 leading-tight">
            {title}
          </h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <Label className="w-full sm:w-auto">
              <span className="block mb-1 text-xs sm:text-sm font-medium text-gray-700">
                {t("searchLabel")}
              </span>
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-40 md:w-48 lg:w-56 text-xs sm:text-sm h-8 sm:h-9"
              />
            </Label>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="inline-flex bg-gray-50 rounded-lg sm:rounded-xl p-0.5 sm:p-1 shadow-sm border min-w-max gap-0.5">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-1.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[28px] sm:min-h-[32px] flex items-center justify-center ${
                statusFilter === null
                  ? "bg-white text-gray-900 shadow-md transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {t("allEvents")}
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-1.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[28px] sm:min-h-[32px] flex items-center justify-center ${
                statusFilter === "approved"
                  ? "bg-green-100 text-green-800 shadow-md transform scale-105 border border-green-200"
                  : "text-gray-600 hover:text-green-700 hover:bg-green-50"
              }`}
            >
              {t("approved")}
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-1.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[28px] sm:min-h-[32px] flex items-center justify-center ${
                statusFilter === "pending"
                  ? "bg-yellow-100 text-yellow-800 shadow-md transform scale-105 border border-yellow-200"
                  : "text-gray-600 hover:text-yellow-700 hover:bg-yellow-50"
              }`}
            >
              {t("pending")}
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-1.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[28px] sm:min-h-[32px] flex items-center justify-center ${
                statusFilter === "rejected"
                  ? "bg-red-100 text-red-800 shadow-md transform scale-105 border border-red-200"
                  : "text-gray-600 hover:text-red-700 hover:bg-red-50"
              }`}
            >
              {t("rejected")}
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 w-full auto-rows-fr">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{
                id: event.id,
                name: event.name,
                startTime:
                  event.startTime instanceof Date
                    ? event.startTime.toISOString()
                    : String(event.startTime),
                endTime:
                  event.endTime instanceof Date
                    ? event.endTime.toISOString()
                    : String(event.endTime),
                approvalStatus: event.approvalStatus ?? "pending",
                bannerUrl: event.bannerUrl ?? undefined,
              }}
              onEventDeleted={onEventDeleted}
            />
          ))}
        </div>
      </div>
    </>
  );
}
