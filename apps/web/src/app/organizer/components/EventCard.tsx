"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteEventAction } from "@/lib/actions/organizer/delete-event-action";

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
  onEventDeleted?: () => void;
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

export default function EventCard({ event, onEventDeleted }: EventCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteEventAction(event.id);

      if (result.success) {
        toast.success("Event deleted successfully!");
        // Call the callback to refresh the event list
        if (onEventDeleted) {
          onEventDeleted();
        }
        router.refresh(); // Fallback refresh
      } else {
        toast.error(result.error || "Failed to delete event");
      }
    } catch (error) {
      toast.error("Failed to delete event");
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Show delete button only for non-approved events
  const canDelete = event.approvalStatus !== "approved";

  return (
    <div className="w-full max-w-full min-w-0 max-h-72 border rounded-xl overflow-hidden shadow-sm bg-white hover:shadow-md transition-all duration-200">
      {/* Banner Image */}
      {event.bannerUrl && (
        <div className="relative w-full h-1/2 sm:h-32 md:h-36 bg-gray-200">
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

      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 flex flex-col justify-between h-1/2">
        {/* Header with name and status */}
        <div className="flex justify-between items-start gap-2 m-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 line-clamp-2 leading-tight flex-1 min-w-0 break-words">
            {event.name}
          </h3>
          <span
            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium shrink-0 ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div>
          {/* Date Information */}
          <div className="rounded-lg py-1.5">
            <span className="text-[10px] sm:text-xs font-medium text-gray-700 break-words">
              {isSameDay
                ? formatDate(startDate)
                : `${formatDate(startDate)} - ${formatDate(endDate)}`}
            </span>
          </div>
          {/* Actions */}
          <div className="flex gap-1 sm:gap-2 w-full">
            <Button
              onClick={() =>
                router.push(`/organizer/general/create?id=${event.id}`)
              }
              variant="outline"
              className="flex-1 text-[10px] sm:text-xs py-1.5 sm:py-2 h-7 sm:h-8 min-h-[28px] sm:min-h-[32px] px-1 sm:px-2 truncate"
            >
              Statistics
            </Button>
            {event.approvalStatus !== "approved" && (
              <Button
                onClick={() =>
                  router.push(`/organizer/event/create?id=${event.id}`)
                }
                className="flex-1 text-[10px] sm:text-xs py-1.5 sm:py-2 h-7 sm:h-8 min-h-[28px] sm:min-h-[32px] px-1 sm:px-2 truncate"
              >
                Edit
              </Button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs py-1.5 sm:py-2 h-7 sm:h-8 px-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] min-w-[28px] sm:min-w-[32px]"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the event "{event.name}"?
                      This action cannot be undone and will delete all related
                      data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteEvent}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Event
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
