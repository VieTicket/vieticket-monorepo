"use client";

import { useState, useEffect } from "react";
import {
  getUserSeatMapsAction,
  searchSeatMapsAction,
  getPublicSeatMapsAction,
  createDraftFromPublicSeatMapAction,
  publishSeatMapAction,
  deleteSeatMapAction,
  unpublishSeatMapAction,
} from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";
import { Sidebar } from "./components/sidebar";
import { DraftsView } from "./components/drafts-view";
import { TemplatesView } from "./components/templates-view";
import { CanvasItem } from "@vieticket/db/mongo/models/seat-map";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { useRouter } from "next/navigation";
import { authClient } from "@vieticket/auth/client";

export type SeatMapItem = {
  id: string;
  name: string;
  shapes: CanvasItem[];
  updatedAt: Date;
  createdAt: Date;
  image?: string;
  createdBy: string;
  publicity?: "public" | "private";
  draftedFrom?: string;
  usedByEvent?: string;
  eventInfo?: {
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    status?: string;
  };
};

type PublicSeatMapItem = {
  id: string;
  name: string;
  image: string;
  createdBy: string;
  originalCreator?: string;
  draftedFrom?: string;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
};

type ViewMode = "drafts" | "templates";

export default function SeatMapDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftsSearchQuery, setDraftsSearchQuery] = useState("");
  const [seatMaps, setSeatMaps] = useState<SeatMapItem[]>([]);
  const [allSeatMaps, setAllSeatMaps] = useState<SeatMapItem[]>([]);
  const [publicSeatMaps, setPublicSeatMaps] = useState<PublicSeatMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState<string | null>(null);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentView, setCurrentView] = useState<ViewMode>("drafts");
  const [templatesSearchQuery, setTemplatesSearchQuery] = useState("");

  const { isMobile, isLoading: deviceLoading } = useDeviceDetection();
  const { data: session } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!deviceLoading && isMobile) {
      router.push("/organizer");
    }
  }, [isMobile, deviceLoading, router]);

  useEffect(() => {
    loadSeatMaps();
  }, []);

  const loadSeatMaps = async () => {
    try {
      setIsLoading(true);
      const result = await getUserSeatMapsAction();

      if (result.success && result.data) {
        setAllSeatMaps(result.data as SeatMapItem[]);
        const draftsAndTemplates = result.data.filter(
          (seatMap) => !seatMap.usedByEvent
        );
        setSeatMaps(draftsAndTemplates as SeatMapItem[]);
      } else {
        toast.error(result.error || "Failed to load seat maps");
      }
    } catch (error) {
      console.error("Error loading seat maps:", error);
      toast.error("An unexpected error occurred while loading seat maps");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicSeatMaps = async (query?: string) => {
    try {
      setIsLoadingTemplates(true);
      const result = await getPublicSeatMapsAction(1, 50, query);

      if (result.success) {
        setPublicSeatMaps(result.data.seatMaps);
      } else {
        toast.error(result.error || "Failed to load public seat maps");
      }
    } catch (error) {
      console.error("Error loading public seat maps:", error);
      toast.error("An unexpected error occurred while loading templates");
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentView === "drafts") {
        if (searchQuery.trim()) {
          handleSearch(searchQuery);
        } else {
          loadSeatMaps();
        }
      } else if (currentView === "templates") {
        loadPublicSeatMaps(templatesSearchQuery || undefined);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, templatesSearchQuery, currentView]);

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      const result = await searchSeatMapsAction(query);

      if (result.success && result.data) {
        const draftsAndTemplates = result.data.filter(
          (seatMap: SeatMapItem) => !seatMap.usedByEvent
        );
        setSeatMaps(draftsAndTemplates);
      } else {
        toast.error(result.error || "Failed to search seat maps");
      }
    } catch (error) {
      console.error("Error searching seat maps:", error);
      toast.error("An unexpected error occurred while searching");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDrafts = () => {
    setCurrentView("drafts");
    if (seatMaps.length === 0) {
      loadSeatMaps();
    }
  };

  const handleShowTemplates = () => {
    setCurrentView("templates");
    loadPublicSeatMaps();
  };

  const handleCreateDraft = async (seatMap: PublicSeatMapItem) => {
    try {
      setIsCreatingDraft(seatMap.id);
      const draftName = `${seatMap.name} (draft)`;

      const result = await createDraftFromPublicSeatMapAction(
        seatMap.id,
        draftName
      );

      if (result.success) {
        toast.success(`Draft "${draftName}" created successfully!`);
        setCurrentView("drafts");
        loadSeatMaps();
      } else {
        toast.error(result.error || "Failed to create draft");
      }
    } catch (error) {
      console.error("Error creating draft:", error);
      toast.error("An unexpected error occurred while creating draft");
    } finally {
      setIsCreatingDraft(null);
    }
  };

  const handlePublishSeatMap = async (seatMapId: string) => {
    try {
      setPublishingIds((prev) => new Set([...prev, seatMapId]));

      const result = await publishSeatMapAction(seatMapId);

      if (result.success) {
        toast.success("Seat map published successfully!");
        loadSeatMaps();
      } else {
        toast.error(result.error || "Failed to publish seat map");
      }
    } catch (error) {
      console.error("Error publishing seat map:", error);
      toast.error("An unexpected error occurred while publishing");
    } finally {
      setPublishingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(seatMapId);
        return newSet;
      });
    }
  };

  const handleUnpublishSeatMap = async (seatMapId: string) => {
    try {
      setPublishingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(seatMapId);
        return newSet;
      });

      const result = await unpublishSeatMapAction(seatMapId);

      if (result.success) {
        toast.success("Seat map unpublished successfully!");
        loadSeatMaps();
      } else {
        toast.error(result.error || "Failed to unpublish seat map");
      }
    } catch (error) {
      console.error("Error unpublishing seat map:", error);
      toast.error("An unexpected error occurred while publishing");
    } finally {
      setPublishingIds((prev) => new Set([...prev, seatMapId]));
    }
  };

  const handleDeleteSeatMap = async (seatMapId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this seat map? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingIds((prev) => new Set([...prev, seatMapId]));

      const result = await deleteSeatMapAction(seatMapId);

      if (result.success) {
        toast.success("Seat map deleted successfully!");
        loadSeatMaps();
      } else {
        toast.error(result.error || "Failed to delete seat map");
      }
    } catch (error) {
      console.error("Error deleting seat map:", error);
      toast.error("An unexpected error occurred while deleting");
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(seatMapId);
        return newSet;
      });
    }
  };
  const filteredDrafts = seatMaps.filter((seatMap) =>
    seatMap.name.toLowerCase().includes(draftsSearchQuery.toLowerCase())
  );

  const getEventSeatMaps = () => {
    return allSeatMaps.filter((seatMap) => seatMap.usedByEvent);
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date =
        dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (deviceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col  h-full overflow-hidden">
      {currentView === "drafts" && (
        <DraftsView
          filteredSeatMaps={filteredDrafts}
          eventSeatMaps={getEventSeatMaps()}
          isLoading={isLoading}
          draftsSearchQuery={draftsSearchQuery}
          setDraftsSearchQuery={setDraftsSearchQuery}
          viewMode={viewMode}
          onShowTemplates={handleShowTemplates}
          setViewMode={setViewMode}
          onPublish={handlePublishSeatMap}
          onUnpublish={handleUnpublishSeatMap}
          onDelete={handleDeleteSeatMap}
          publishingIds={publishingIds}
          deletingIds={deletingIds}
        />
      )}

      {currentView === "templates" && (
        <TemplatesView
          publicSeatMaps={publicSeatMaps.filter(
            (seatMap) => seatMap.createdBy !== session?.user?.id
          )}
          isLoadingTemplates={isLoadingTemplates}
          templatesSearchQuery={templatesSearchQuery}
          setTemplatesSearchQuery={setTemplatesSearchQuery}
          onBack={() => setCurrentView("drafts")}
          onCreateDraft={handleCreateDraft}
          isCreatingDraft={isCreatingDraft}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
