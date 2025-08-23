"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { EventApprovalStatus } from "@vieticket/db/pg/schema";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    approvalStatus: EventApprovalStatus;
    bannerUrl?: string;
  };
}

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-gray-300 text-gray-700",
  },
  approved: {
    label: "Approved",
    className: "bg-green-200 text-green-800",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-200 text-red-800",
  },
};

export default function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const statusKey = (() => {
    switch (event.approvalStatus) {
      case "approved":
        return "approved";
      case "rejected":
        return "rejected";
      case "pending":
      default:
        return "pending";
    }
  })();

  const status = statusConfig[statusKey];

  // Format dates
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-all duration-200">
      {/* Banner Image */}
      {event.bannerUrl && (
        <div className="relative w-full h-32 bg-gray-200">
          <img
            src={event.bannerUrl}
            alt={event.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="p-3 space-y-3">
        {/* Header with name and status */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-base font-semibold text-gray-800 line-clamp-2 leading-tight">
            {event.name}
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* Date Information */}
        <div className="bg-gray-50 rounded-lg p-2">
          <span className="text-xs font-medium text-gray-700">
            {isSameDay
              ? formatDate(startDate)
              : `${formatDate(startDate)} - ${formatDate(endDate)}`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() =>
              router.push(`/organizer/general/create?id=${event.id}`)
            }
            variant="outline"
            className="flex-1 text-xs py-2 h-8"
          >
            Statistics
          </Button>
          {event.approvalStatus !== "approved" && (
            <Button
              onClick={() =>
                router.push(`/organizer/event/create?id=${event.id}`)
              }
              className="flex-1 text-xs py-2 h-8"
            >
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
