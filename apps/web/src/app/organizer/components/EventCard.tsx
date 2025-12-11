"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Loader2, Building2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteEventAction } from "@/lib/actions/organizer/delete-event-action";
import { linkEventToOrganizationAction } from "@/lib/actions/organizer/link-event-organization-action";
import { authClient } from "@/lib/auth/auth-client";
import { EvidenceUploadDialog, type EvidenceUploadData } from "@/components/event/evidence-upload-dialog";
import { handleUpdateEvent } from "@/lib/actions/organizer/events-action";

import { EventApprovalStatus } from "@vieticket/db/pg/schema";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    approvalStatus: EventApprovalStatus;
    bannerUrl?: string;
    organizationId?: string | null;
    location?: string | null;
  };
  onEventDeleted?: () => void;
}

const statusConfig = {
  NotYet: {
    label: "Draft",
    className: "bg-blue-100 text-blue-700",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-200 text-yellow-800",
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
  const [isLinking, setIsLinking] = useState(false);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string>(
    event.organizationId || "personal"
  );
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  
  // Get user's organizations and user info
  const { data: organizations, isPending: loadingOrgs } = authClient.useListOrganizations();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    setSelectedOrganization(event.organizationId || "personal");
  }, [event.organizationId]);

  const statusKey = (() => {
    switch (event.approvalStatus) {
      case "NotYet":
        return "NotYet";
      case "approved":
        return "approved";
      case "rejected":
        return "rejected";
      case "pending":
        return "pending";
      default:
        return "NotYet"; // Default to NotYet for unknown statuses
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

  const handleLinkOrganization = async () => {
    setIsLinking(true);
    try {
      const orgId = selectedOrganization === "personal" ? null : selectedOrganization;
      const result = await linkEventToOrganizationAction(event.id, orgId);

      if (result.success) {
        toast.success(
          orgId 
            ? "Event linked to organization successfully!" 
            : "Event unlinked from organization successfully!"
        );
        setIsOrgDialogOpen(false);
        if (onEventDeleted) {
          onEventDeleted(); // Reuse this callback to refresh the list
        }
        router.refresh();
      } else {
        toast.error(result.error || "Failed to link event");
      }
    } catch (error) {
      toast.error("Failed to link event");
      console.error("Link error:", error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleEvidenceUploadComplete = async (evidenceData: EvidenceUploadData) => {
    setIsSubmittingEvidence(true);
    try {
      // Create form data with just the evidence information
      const form = new FormData();
      form.set("eventId", event.id);
      form.set("evidenceData", JSON.stringify(evidenceData));

      const result = await handleUpdateEvent(form);
      
      if (result.success) {
        toast.success("Evidence submitted successfully! Your event is now under review.");
        setShowEvidenceUpload(false);
        if (onEventDeleted) {
          onEventDeleted(); // Refresh the event list to show updated status
        }
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit evidence");
      }
    } catch (error) {
      toast.error("Failed to submit evidence");
      console.error("Evidence submission error:", error);
    } finally {
      setIsSubmittingEvidence(false);
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
            {/* Statistics Button - hide for NotYet status */}
            {event.approvalStatus !== "NotYet" && (
              <Button
                onClick={() =>
                  router.push(`/organizer/general/create?id=${event.id}`)
                }
                variant="outline"
                className="flex-1 text-[10px] sm:text-xs py-1.5 sm:py-2 h-7 sm:h-8 min-h-[28px] sm:min-h-[32px] px-1 sm:px-2 truncate"
              >
                Statistics
              </Button>
            )}
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
            
            {/* Submit Evidence Button - only show for NotYet status */}
            {event.approvalStatus === "NotYet" && (
              <Button
                onClick={() => setShowEvidenceUpload(true)}
                className="flex-1 text-[10px] sm:text-xs py-1.5 sm:py-2 h-7 sm:h-8 min-h-[28px] sm:min-h-[32px] px-1 sm:px-2 truncate bg-green-600 hover:bg-green-700"
                disabled={isSubmittingEvidence}
              >
                {isSubmittingEvidence ? "Submitting..." : "Submit"}
              </Button>
            )}
            
            {/* Organization Linking Dialog */}
            {organizations && organizations.length > 0 && (
              <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1.5 sm:py-2 h-7 sm:h-8 px-1.5 sm:px-2 min-h-[28px] sm:min-h-[32px] min-w-[28px] sm:min-w-[32px]"
                    title="Link to Organization"
                  >
                    <Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Event to Organization</DialogTitle>
                    <DialogDescription>
                      Choose an organization to link this event to, or select "Personal" to keep it private.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Select
                      value={selectedOrganization}
                      onValueChange={setSelectedOrganization}
                      disabled={loadingOrgs}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal Event</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsOrgDialogOpen(false)}
                      disabled={isLinking}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleLinkOrganization}
                      disabled={isLinking || selectedOrganization === (event.organizationId || "personal")}
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
      
      {/* Evidence Upload Dialog */}
      <EvidenceUploadDialog
        open={showEvidenceUpload}
        onOpenChange={setShowEvidenceUpload}
        onComplete={handleEvidenceUploadComplete}
        eventName={event.name}
        eventDate={`${formatDate(startDate)} - ${formatDate(endDate)}`}
        eventLocation={event.location || "Chưa xác định"}
        organizerInfo={{
          name: session?.user?.name || "Nhà tổ chức",
          email: session?.user?.email || "",
          phone: "Chưa cập nhật",
        }}
      />
    </div>
  );
}
