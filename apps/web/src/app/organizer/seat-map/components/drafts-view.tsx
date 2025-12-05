"use client";

import {
  Search,
  Grid,
  List,
  Plus,
  Users,
  Calendar,
  MapPin,
  Clock,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SeatMapItem } from "../page";
import { formatDate } from "date-fns";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmptySeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface DraftsViewProps {
  filteredSeatMaps: SeatMapItem[];
  eventSeatMaps: SeatMapItem[];
  isLoading: boolean;
  draftsSearchQuery: string;
  viewMode: "grid" | "list";
  publishingIds: Set<string>;
  deletingIds: Set<string>;
  setDraftsSearchQuery: (query: string) => void;
  setViewMode: (mode: "grid" | "list") => void;
  onShowTemplates: () => void;
  onPublish: (seatMapId: string) => void;
  onUnpublish: (seatMapId: string) => void;
  onDelete: (seatMapId: string) => void;
}

export function DraftsView({
  filteredSeatMaps,
  eventSeatMaps,
  isLoading,
  draftsSearchQuery,
  setDraftsSearchQuery,
  viewMode,
  setViewMode,
  onPublish,
  onUnpublish,
  onDelete,
  onShowTemplates,
  publishingIds,
  deletingIds,
}: DraftsViewProps) {
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventViewMode, setEventViewMode] = useState<"grid" | "list">("grid");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const t = useTranslations("organizer-dashboard.SeatMap");

  const handleCreateNewSeatMap = async () => {
    try {
      setIsCreating(true);

      const result = await createEmptySeatMapAction();

      if (result.success) {
        const newSeatMap = result.data;

        toast.success(`New seat map "${newSeatMap.name}" created!`);

        // Navigate to the canvas editor with the new seat map ID
        router.push(`/seat-map?seatMapId=${newSeatMap.id}`);
      } else {
        toast.error(result.error || "Failed to create new seat map");
        console.error("Failed to create seat map:", result.error);
      }
    } catch (error) {
      console.error("Error creating new seat map:", error);
      toast.error("An unexpected error occurred while creating the seat map");
    } finally {
      setIsCreating(false);
    }
  };

  // Filter event seat maps based on local search
  const filteredEventSeatMaps = eventSeatMaps.filter(
    (seatMap) =>
      seatMap.name.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      seatMap.eventInfo?.name
        ?.toLowerCase()
        .includes(eventSearchQuery.toLowerCase()) ||
      seatMap.eventInfo?.location
        ?.toLowerCase()
        .includes(eventSearchQuery.toLowerCase())
  );

  // Filter drafts based on drafts search query
  const filteredDrafts = filteredSeatMaps.filter((seatMap) =>
    seatMap.name.toLowerCase().includes(draftsSearchQuery.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="border-b dark:border-gray-800 p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center h-auto md:h-20">
        <div className="w-full flex justify-between items-center gap-3 md:gap-4 mb-3 md:mb-0">
          <div>
            <h1 className="text-lg md:text-xl font-semibold">
              {t("manager")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowTemplates}
              disabled={isCreating}
              className="flex items-center rounded-lg gap-2 md:gap-3 p-2 md:p-3 bg-yellow-300 hover:bg-yellow-500 dark:hover:bg-yellow-600 text-primary transition-colors group text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <span className="font-medium text-sm md:text-base">
                  {t("viewTemplates")}
                </span>
              </div>
            </button>
            <button
              onClick={handleCreateNewSeatMap}
              disabled={isCreating}
              className="flex items-center rounded-lg gap-2 md:gap-3 p-2 md:p-3 bg-yellow-300 hover:bg-yellow-500 dark:hover:bg-yellow-600 text-primary transition-colors group text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <span className="font-medium text-sm md:text-base">
                  {isCreating ? t("creating") : t("newSeatMap")}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
        {/* Drafts & Templates Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("draftsTemplates")}
              </h2>
            </div>

            {/* Drafts Controls */}
            <div className="flex items-center gap-3">
              {/* Search Input for Drafts */}
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  size={16}
                />
                <Input
                  placeholder={t("searchDrafts")}
                  className="w-48 pl-8 text-sm"
                  value={draftsSearchQuery}
                  onChange={(e) => setDraftsSearchQuery(e.target.value)}
                />
              </div>

              {/* View Mode Buttons for Drafts */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 w-8",
                    viewMode === "grid" ? "bg-gray-100 dark:bg-gray-800" : ""
                  )}
                >
                  <Grid size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="List view"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 w-8",
                    viewMode === "list" ? "bg-gray-100 dark:bg-gray-800" : ""
                  )}
                >
                  <List size={16} />
                </Button>
              </div>
            </div>
          </div>

          <DraftsTemplates
            isLoading={isLoading}
            filteredSeatMaps={filteredDrafts}
            searchQuery={draftsSearchQuery}
            viewMode={viewMode}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onDelete={onDelete}
            publishingIds={publishingIds}
            deletingIds={deletingIds}
          />
        </div>

        {/* Separator */}
        {eventSeatMaps.length > 0 && <Separator className="my-8" />}

        {/* Event Seat Maps Section */}
        {eventSeatMaps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t("eventSeatMaps")}
                </h2>
              </div>

              {/* Event Seat Maps Controls */}
              <div className="flex items-center gap-3">
                {/* Search Input for Event Seat Maps */}
                <div className="relative">
                  <Search
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    size={16}
                  />
                  <Input
                    placeholder={t("searchEvents")}
                    className="w-48 pl-8 text-sm"
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                  />
                </div>

                {/* View Mode Buttons for Event Seat Maps */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Grid view"
                    onClick={() => setEventViewMode("grid")}
                    className={cn(
                      "h-8 w-8",
                      eventViewMode === "grid"
                        ? "bg-gray-100 dark:bg-gray-800"
                        : ""
                    )}
                  >
                    <Grid size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="List view"
                    onClick={() => setEventViewMode("list")}
                    className={cn(
                      "h-8 w-8",
                      eventViewMode === "list"
                        ? "bg-gray-100 dark:bg-gray-800"
                        : ""
                    )}
                  >
                    <List size={16} />
                  </Button>
                </div>
              </div>
            </div>

            <EventSeatMaps
              isLoading={isLoading}
              eventSeatMaps={filteredEventSeatMaps}
              viewMode={eventViewMode}
              searchQuery={eventSearchQuery}
            />
          </div>
        )}
      </div>
    </>
  );
}
const DraftsTemplates = ({
  isLoading,
  filteredSeatMaps,
  searchQuery,
  viewMode,
  onPublish,
  onUnpublish,
  onDelete,
  publishingIds,
  deletingIds,
}: {
  isLoading: boolean;
  filteredSeatMaps: SeatMapItem[];
  searchQuery: string;
  viewMode: "grid" | "list";
  onPublish: (seatMapId: string) => void;
  onUnpublish: (seatMapId: string) => void;
  onDelete: (seatMapId: string) => void;
  publishingIds: Set<string>;
  deletingIds: Set<string>;
}) => {
  const t = useTranslations("organizer-dashboard.SeatMap");
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (filteredSeatMaps.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          {searchQuery
            ? t("noMatchingSearch")
            : t("noDraftsFound")}
        </p>
        {!searchQuery && (
          <div className="space-y-3">
            <Link href="/seat-map">
              <Button className="mb-2">
                <Plus size={16} className="mr-2" />
                {t("createNewSeatMap")}
              </Button>
            </Link>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("canvasEditorHint")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
          : "flex flex-col gap-3 md:gap-4"
      )}
    >
      {filteredSeatMaps.map((seatMap) => (
        <DraftTemplateCard
          key={seatMap.id}
          seatMap={seatMap}
          viewMode={viewMode}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onDelete={onDelete}
          publishingIds={publishingIds}
          deletingIds={deletingIds}
        />
      ))}
    </div>
  );
};

const EventSeatMaps = ({
  isLoading,
  eventSeatMaps,
  viewMode,
  searchQuery,
}: {
  isLoading: boolean;
  eventSeatMaps: SeatMapItem[];
  viewMode: "grid" | "list";
  searchQuery: string;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (eventSeatMaps.length === 0) {
    return (
      <div className="text-center py-10">
        <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          {searchQuery
            ? "No event seat maps match your search"
            : "No event seat maps found"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
          : "flex flex-col gap-3 md:gap-4"
      )}
    >
      {eventSeatMaps.map((seatMap) => (
        <EventSeatMapCard
          key={seatMap.id}
          seatMap={seatMap}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

const DraftTemplateCard = ({
  seatMap,
  viewMode,
  onPublish,
  onUnpublish,
  onDelete,
  publishingIds,
  deletingIds,
}: {
  seatMap: SeatMapItem;
  viewMode: "grid" | "list";
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  publishingIds: Set<string>;
  deletingIds: Set<string>;
}) => {
  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-200">
        {/* Thumbnail */}
        <div className="w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
          {seatMap.image ? (
            <img
              src={seatMap.image}
              alt={seatMap.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "https://placehold.co/400x300/e2e8f0/64748b?text=No+Preview";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {seatMap.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Updated {formatDate(seatMap.updatedAt, "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/seat-map?seatMapId=${seatMap.id}`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
          {seatMap.draftedFrom !== null && (
            <div>
              {seatMap.publicity === "private" ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onPublish(seatMap.id)}
                  disabled={publishingIds.has(seatMap.id)}
                >
                  {publishingIds.has(seatMap.id) ? "Publishing..." : "Publish"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUnpublish(seatMap.id)}
                >
                  Unpublish
                </Button>
              )}
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(seatMap.id)}
            disabled={deletingIds.has(seatMap.id)}
          >
            {deletingIds.has(seatMap.id) ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    );
  }

  // Grid view - Remove fixed widths for responsive behavior
  return (
    <div className="max-w-[400px] group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-200 overflow-hidden">
      {/* Publicity Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge
          variant={seatMap.publicity === "public" ? "default" : "secondary"}
          className="text-xs font-medium"
        >
          {seatMap.publicity === "public" ? "Public" : "Draft"}
        </Badge>
      </div>

      {/* Seat Map Image */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
        {seatMap.image ? (
          <img
            src={seatMap.image}
            alt={seatMap.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "https://placehold.co/400x300/e2e8f0/64748b?text=No+Preview";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Palette className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Seat Map Info */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
            {seatMap.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Updated {formatDate(seatMap.updatedAt, "MMM d, yyyy")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Link href={`/seat-map?seatMapId=${seatMap.id}`} className="flex-1">
              <Button variant="outline" className="w-full text-xs">
                Edit
              </Button>
            </Link>
          </div>

          <div className="flex gap-2">
            {seatMap.publicity === "private" ? (
              <Button
                variant="default"
                className="flex-1 text-xs"
                onClick={() => onPublish(seatMap.id)}
                disabled={publishingIds.has(seatMap.id)}
              >
                {publishingIds.has(seatMap.id) ? "Publishing..." : "Publish"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onUnpublish(seatMap.id)}
              >
                Unpublish
              </Button>
            )}

            <Button
              variant="destructive"
              className="flex-1 text-xs"
              onClick={() => onDelete(seatMap.id)}
              disabled={deletingIds.has(seatMap.id)}
            >
              {deletingIds.has(seatMap.id) ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventSeatMapCard = ({
  seatMap,
  viewMode,
}: {
  seatMap: SeatMapItem;
  viewMode: "grid" | "list";
}) => {
  const getEventStatus = (eventInfo: any) => {
    if (!eventInfo?.startTime || !eventInfo?.endTime) return "unknown";

    const now = new Date();
    const startTime = new Date(eventInfo.startTime);
    const endTime = new Date(eventInfo.endTime);

    if (now < startTime) return "upcoming";
    if (now > endTime) return "ended";
    return "ongoing";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ongoing":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "ended":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  const status = seatMap.eventInfo
    ? getEventStatus(seatMap.eventInfo)
    : "unknown";

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-200">
        {/* Thumbnail */}
        <div className="w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
          {seatMap.image ? (
            <img
              src={seatMap.image}
              alt={seatMap.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "https://placehold.co/400x300/e2e8f0/64748b?text=No+Preview";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="max-w-[200px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                {seatMap.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Updated {formatDate(seatMap.updatedAt, "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Event Information */}
          {seatMap.eventInfo && (
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1 max-w-[200px]">
                <Calendar className="max-w-[150px] w-3 h-3 flex-shrink-0" />
                <span className="truncate">{seatMap.eventInfo.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(seatMap.eventInfo.startTime).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </div>
              {seatMap.eventInfo.location && (
                <div className="flex items-center gap-1 max-w-[150px]">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{seatMap.eventInfo.location}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(getEventStatus(seatMap.eventInfo) === "upcoming" ||
            getEventStatus(seatMap.eventInfo) === "unknown") && (
            <Link href={`/seat-map?seatMapId=${seatMap.id}`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
          )}
          {seatMap.eventInfo && (
            <Link href={`/organizer/events/${seatMap.eventInfo.id}`}>
              <Button variant="outline" size="sm">
                View Event
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Grid view - Remove fixed widths for responsive behavior
  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-200 overflow-hidden">
      {/* Event Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge className={cn("text-xs font-medium", getStatusColor(status))}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>

      {/* Seat Map Image */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
        {seatMap.image ? (
          <img
            src={seatMap.image}
            alt={seatMap.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "https://placehold.co/400x300/e2e8f0/64748b?text=No+Preview";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Palette className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Seat Map Info */}
        <div>
          <h3 className=" font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
            {seatMap.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Updated {formatDate(seatMap.updatedAt, "MMM d, yyyy")}
          </p>
        </div>

        <Separator />

        {seatMap.eventInfo && (
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1 max-w-[200px]">
              <Calendar className="max-w-[150px] w-3 h-3 flex-shrink-0" />
              <span className="truncate">{seatMap.eventInfo.name}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Link href={`/seat-map?seatMapId=${seatMap.id}`} className="flex-1">
            <Button variant="outline" className="w-full text-xs">
              Edit
            </Button>
          </Link>
          {seatMap.eventInfo && (
            <Link
              href={`/organizer/events/${seatMap.eventInfo.id}`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full text-xs">
                View Event
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
