"use client";

import EventCard from "./EventCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Event } from "@vieticket/db/postgres/schema";

interface EventListProps {
  title: string;
  events: Event[];
}

export default function EventList({ title, events }: EventListProps) {
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
              Search
            </span>
            <Input
              placeholder="Search by event name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-60"
            />
          </Label>

          <Label className="w-full md:w-auto">
            <span className="block mb-1 text-sm font-medium text-gray-700">
              Filter by Status
            </span>
            <select
              className="w-full md:w-48 px-3 py-2 rounded-md border text-sm text-gray-700"
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </Label>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            }}
          />
        ))}
      </div>
    </div>
  );
}
