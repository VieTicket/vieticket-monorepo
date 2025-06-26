"use client";

import { Button } from "@/components/ui/button";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isApproved: boolean | null;
  };
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <div className="border rounded-2xl p-4 space-y-2 shadow-sm bg-white">
      <h3 className="text-lg font-semibold">{event.name}</h3>
      <p className="text-sm text-gray-600">
        {new Date(event.startTime).toLocaleString()} →{" "}
        {new Date(event.endTime).toLocaleString()}
      </p>

      <div className="flex gap-2 mt-2">
        <Button variant="outline">View statistic</Button>
        <Button>Edit event</Button>
      </div>
    </div>
  );
}
