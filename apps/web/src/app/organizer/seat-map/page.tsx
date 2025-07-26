"use client";

import { useState, useEffect } from "react";
import {
  getUserSeatMapsAction,
  searchSeatMapsAction,
  getPublicSeatMapsAction,
  createDraftFromPublicSeatMapAction,
  publishSeatMapAction,
  deleteSeatMapAction,
} from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";
import { Sidebar } from "./components/sidebar";
import { WelcomeScreen } from "./components/welcome-screen";
import { DraftsView } from "./components/drafts-view";
import { TemplatesView } from "./components/templates-view";

type SeatMapItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
  publicity?: "public" | "private";
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

type ViewMode = "welcome" | "drafts" | "templates";

export default function SeatMapDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [seatMaps, setSeatMaps] = useState<SeatMapItem[]>([]);
  const [publicSeatMaps, setPublicSeatMaps] = useState<PublicSeatMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState<string | null>(null);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTab, setSelectedTab] = useState("all");
  const [currentView, setCurrentView] = useState<ViewMode>("welcome");
  const [templatesSearchQuery, setTemplatesSearchQuery] = useState("");

  useEffect(() => {
    loadSeatMaps();
  }, []);

  const loadSeatMaps = async () => {
    try {
      setIsLoading(true);
      const result = await getUserSeatMapsAction();

      if (result.success) {
        setSeatMaps(result.data);
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

  // Handle drafts search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && currentView === "drafts") {
        handleSearch(searchQuery);
      } else if (!searchQuery.trim() && currentView === "drafts") {
        loadSeatMaps();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentView]);

  // Handle templates search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentView === "templates") {
        loadPublicSeatMaps(templatesSearchQuery || undefined);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [templatesSearchQuery, currentView]);

  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      const result = await searchSeatMapsAction(query);

      if (result.success) {
        setSeatMaps(result.data);
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
        loadSeatMaps(); // Refresh drafts list
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
        loadSeatMaps(); // Refresh the list
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
        loadSeatMaps(); // Refresh the list
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

  const getRecentSeatMaps = () => {
    return seatMaps
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 3);
  };

  const getFilteredSeatMaps = () => {
    switch (selectedTab) {
      case "recent":
        return seatMaps
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 10);
      case "starred":
        return [];
      default:
        return seatMaps;
    }
  };

  const filteredSeatMaps = getFilteredSeatMaps();
  const recentSeatMaps = getRecentSeatMaps();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        seatMaps={seatMaps}
        recentSeatMaps={recentSeatMaps}
        onShowTemplates={handleShowTemplates}
        onShowDrafts={handleShowDrafts}
        formatDate={formatDate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === "welcome" && (
          <WelcomeScreen onShowTemplates={handleShowTemplates} />
        )}

        {currentView === "drafts" && (
          <DraftsView
            filteredSeatMaps={filteredSeatMaps}
            isLoading={isLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            onBack={() => setCurrentView("welcome")}
            formatDate={formatDate}
            onPublish={handlePublishSeatMap}
            onDelete={handleDeleteSeatMap}
            publishingIds={publishingIds}
            deletingIds={deletingIds}
          />
        )}

        {currentView === "templates" && (
          <TemplatesView
            publicSeatMaps={publicSeatMaps}
            isLoadingTemplates={isLoadingTemplates}
            templatesSearchQuery={templatesSearchQuery}
            setTemplatesSearchQuery={setTemplatesSearchQuery}
            onBack={() => setCurrentView("welcome")}
            onCreateDraft={handleCreateDraft}
            isCreatingDraft={isCreatingDraft}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
}
