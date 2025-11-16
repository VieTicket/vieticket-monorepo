"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/custom-tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  CheckCircle2,
  Ban,
  Clock as ClockIcon,
  Search,
  CalendarDays,
  Edit,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/loading";
import {
  useAllEvents,
  useUpdateEventApproval,
  type PendingEvent,
} from "@/hooks/use-admin-data";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Event Card Component
const EventCard = ({
  event,
  onApprove,
  onReject,
  isProcessing,
  onClick,
  onEdit,
}: {
  event: PendingEvent;
  onApprove: (eventId: string) => void;
  onReject: (eventId: string) => void;
  isProcessing: boolean;
  onClick: () => void;
  onEdit?: (eventId: string) => void;
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge
  const getStatusBadge = () => {
    if (event.approvalStatus === "pending") {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="h-3 w-3 mr-1" />
          Pending
        </div>
      );
    } else if (event.approvalStatus === "approved") {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Approved
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Ban className="h-3 w-3 mr-1" />
          Rejected
        </div>
      );
    }
  };

  return (
    <Card
      className="h-full flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 leading-tight">
              {event.title}
            </CardTitle>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground truncate">
                {event.category || "General Event"}
              </p>
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Event Image */}
        {event.image_url && (
          <div className="mb-4 flex-shrink-0">
            <Image
              src={event.image_url}
              alt={event.title}
              width={400}
              height={128}
              className="w-full h-32 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Event Details */}
        <div className="space-y-3 flex-1 min-h-0">
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {event.description || "No description available"}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {event.location || "Location TBD"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{formatDate(event.start_date)}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                Ends: {formatDate(event.end_date)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {event.organizer_name || "Unknown Organizer"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Eye className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                Capacity: {event.capacity || "TBD"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Show for pending, approved, and rejected events with different states */}
        {event.approvalStatus !== "pending" ? (
          <div
            className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {event.approvalStatus === "approved" && onEdit && (
              <Button
                onClick={() => onEdit(event.id)}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              onClick={() => onApprove(event.id)}
              disabled={isProcessing || event.approvalStatus === "approved"}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {event.approvalStatus === "approved" ? "Approved" : "Approve"}
            </Button>
            <Button
              onClick={() => onReject(event.id)}
              disabled={isProcessing || event.approvalStatus === "rejected"}
              variant="destructive"
              className="flex-1 disabled:bg-red-300"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {event.approvalStatus === "rejected" ? "Rejected" : "Reject"}
            </Button>
          </div>
        ) : (
          <div
            className="flex gap-2 mt-4 pt-4 border-t flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              onClick={() => onApprove(event.id)}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => onReject(event.id)}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function EventsPendingPage() {
  const { data: allEvents, isLoading, error } = useAllEvents();
  const updateApproval = useUpdateEventApproval();
  const router = useRouter();
  const [processingEventId, setProcessingEventId] = useState<string | null>(
    null
  );
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Get unique categories from all events
  const categories = useMemo(() => {
    if (!allEvents) return [];
    const uniqueCategories = new Set<string>();
    allEvents.forEach((event) => {
      if (event.category) {
        uniqueCategories.add(event.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [allEvents]);

  // Filter events based on approval status, search query, category, and date range
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];

    let filtered = allEvents;

    // Filter by approval status
    switch (activeTab) {
      case "pending":
        filtered = filtered.filter(
          (event) => event.approvalStatus === "pending"
        );
        break;
      case "approved":
        filtered = filtered.filter(
          (event) => event.approvalStatus === "approved"
        );
        break;
      case "rejected":
        filtered = filtered.filter(
          (event) => event.approvalStatus === "rejected"
        );
        break;
    }

    // Filter by search query (event name and organizer)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          (event.organizer_name &&
            event.organizer_name.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (event) => event.category === selectedCategory
      );
    }

    // Filter by date range
    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      filtered = filtered.filter((event) => {
        const eventStartDate = new Date(event.start_date).getTime();
        return eventStartDate >= startDateTime;
      });
    }

    if (endDate) {
      const endDateTime = new Date(endDate).getTime();
      filtered = filtered.filter((event) => {
        const eventStartDate = new Date(event.start_date).getTime();
        return eventStartDate <= endDateTime;
      });
    }

    return filtered;
  }, [allEvents, activeTab, searchQuery, selectedCategory, startDate, endDate]);

  // Create tabs with counts
  const tabs = useMemo(
    () => [
      {
        id: "pending",
        label: "Pending Review",
        count:
          allEvents?.filter((event) => event.approvalStatus === "pending")
            .length || 0,
      },
      {
        id: "approved",
        label: "Approved",
        count:
          allEvents?.filter((event) => event.approvalStatus === "approved")
            .length || 0,
      },
      {
        id: "rejected",
        label: "Rejected",
        count:
          allEvents?.filter((event) => event.approvalStatus === "rejected")
            .length || 0,
      },
    ],
    [allEvents]
  );

  const handleApprove = async (eventId: string) => {
    setProcessingEventId(eventId);
    try {
      await updateApproval.mutateAsync({ eventId, approvalStatus: "approved" });
      toast.success("Event approved successfully!");
      // Close modal if the approved event was selected
      if (selectedEvent?.id === eventId) {
        setIsModalOpen(false);
        setSelectedEvent(null);
      }
    } catch {
      toast.error("Failed to approve event");
    } finally {
      setProcessingEventId(null);
    }
  };

  const handleReject = async (eventId: string) => {
    setProcessingEventId(eventId);
    try {
      await updateApproval.mutateAsync({ eventId, approvalStatus: "rejected" });
      toast.success("Event rejected successfully!");
      // Close modal if the rejected event was selected
      if (selectedEvent?.id === eventId) {
        setIsModalOpen(false);
        setSelectedEvent(null);
      }
    } catch {
      toast.error("Failed to reject event");
    } finally {
      setProcessingEventId(null);
    }
  };

  const handleEventClick = (event: PendingEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleEdit = (eventId: string) => {
    router.push(`/admin/events/edit?id=${eventId}`);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Event Management
          </h1>
          <p className="text-red-500">Error loading events: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Management</h1>
        <p className="text-muted-foreground">
          Review and manage all event submissions. {allEvents?.length || 0}{" "}
          total events.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) =>
          setActiveTab(tabId as "pending" | "approved" | "rejected")
        }
      />

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search and Category Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event name or organizer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <div className="w-full sm:w-48">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Date Range:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                  {(startDate || endDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="ml-2"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredEvents.length} of {allEvents?.length || 0} events
            {(searchQuery.trim() ||
              selectedCategory !== "all" ||
              startDate ||
              endDate) && (
              <span className="ml-2">
                (filtered by{" "}
                {[
                  searchQuery.trim() && `"${searchQuery}"`,
                  selectedCategory !== "all" &&
                    `category: "${selectedCategory}"`,
                  startDate &&
                    `from: ${new Date(startDate).toLocaleDateString()}`,
                  endDate && `to: ${new Date(endDate).toLocaleDateString()}`,
                ]
                  .filter(Boolean)
                  .join(", ")}
                )
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      {!filteredEvents || filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === "pending" && "No Pending Events"}
              {activeTab === "approved" && "No Approved Events"}
              {activeTab === "rejected" && "No Rejected Events"}
            </h3>
            <p className="text-gray-500">
              {(() => {
                if (
                  searchQuery.trim() ||
                  selectedCategory !== "all" ||
                  startDate ||
                  endDate
                ) {
                  return "No events match your current filters. Try adjusting your search, category, or date filters.";
                }
                if (activeTab === "pending") {
                  return "All events have been reviewed and processed.";
                }
                if (activeTab === "approved") {
                  return "No events have been approved yet.";
                }
                if (activeTab === "rejected") {
                  return "No events have been rejected yet.";
                }
                return "";
              })()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={processingEventId === event.id}
              onClick={() => handleEventClick(event)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onApprove={handleApprove}
        onReject={handleReject}
        isProcessing={processingEventId === selectedEvent?.id}
      />
    </div>
  );
}
