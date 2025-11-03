"use client";

import EventCard from "./EventCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Event } from "@vieticket/db/pg/schema";

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <h2 className="text-xl font-bold text-gray-800">{title}</h2>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <Label className="w-full md:w-auto">
            <span className="block mb-1 text-sm font-medium text-gray-700">
              {t("searchLabel")}
            </span>
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-60"
            />
          </Label>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="inline-flex bg-gray-50 rounded-2xl p-1.5 shadow-sm border">
        <button
          onClick={() => setStatusFilter(null)}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            statusFilter === null
              ? "bg-white text-gray-900 shadow-md transform scale-105"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {t("allEvents")}
        </button>
        <button
          onClick={() => setStatusFilter("approved")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            statusFilter === "approved"
              ? "bg-green-100 text-green-800 shadow-md transform scale-105 border border-green-200"
              : "text-gray-600 hover:text-green-700 hover:bg-green-50"
          }`}
        >
          {t("approved")}
        </button>
        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            statusFilter === "pending"
              ? "bg-yellow-100 text-yellow-800 shadow-md transform scale-105 border border-yellow-200"
              : "text-gray-600 hover:text-yellow-700 hover:bg-yellow-50"
          }`}
        >
          {t("pending")}
        </button>
        <button
          onClick={() => setStatusFilter("rejected")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            statusFilter === "rejected"
              ? "bg-red-100 text-red-800 shadow-md transform scale-105 border border-red-200"
              : "text-gray-600 hover:text-red-700 hover:bg-red-50"
          }`}
        >
          {t("rejected")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
  );
}
