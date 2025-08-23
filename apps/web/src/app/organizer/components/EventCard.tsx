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
    <div className="border rounded-2xl p-5 space-y-4 shadow-md bg-white hover:shadow-lg transition-all duration-200">
      {/* Header with name and status */}
      <div className="flex justify-between items-start gap-3">
        <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 leading-tight">
          {event.name}
        </h3>
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Date Information */}
      <div className="bg-gray-50 rounded-xl p-3">
        <span className="text-sm font-medium text-gray-700">
          {isSameDay
            ? formatDate(startDate)
            : `${formatDate(startDate)} - ${formatDate(endDate)}`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          onClick={() =>
            router.push(`/organizer/general/create?id=${event.id}`)
          }
          variant="outline"
          className="flex-1 text-sm"
        >
          View Statistics
        </Button>
        {event.approvalStatus !== "approved" && (
          <Button
            onClick={() =>
              router.push(`/organizer/event/create?id=${event.id}`)
            }
            className="flex-1 text-sm"
          >
            Edit Event
          </Button>
        )}
      </div>
    </div>
  );
}
