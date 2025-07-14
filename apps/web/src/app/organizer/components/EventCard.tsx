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

  return (
    <div className="border rounded-2xl p-4 space-y-3 shadow-md bg-white hover:shadow-lg transition">
      {/* Header with name and status */}
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-800">{event.name}</h3>
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Time range */}
      <p className="text-sm text-gray-600">
        {new Date(event.startTime).toLocaleString()} →{" "}
        {new Date(event.endTime).toLocaleString()}
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() =>
            router.push(`/organizer/general/create?id=${event.id}`)
          }
          variant="outline"
        >
          View statistic
        </Button>
        {event.approvalStatus != "approved" ? (
          <Button
            onClick={() =>
              router.push(`/organizer/event/create?id=${event.id}`)
            }
          >
            Edit event
          </Button>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
