"use client";

import { Plus, Star, FileText, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmptySeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";
import { RecentSeatMapsList } from "./recent-seat-maps-list";
import { SeatMapItem } from "../page";

type ViewMode = "welcome" | "drafts" | "templates";

interface SidebarProps {
  currentView: ViewMode;
  seatMaps: SeatMapItem[];
  recentSeatMaps: SeatMapItem[];
  onShowTemplates: () => void;
  onShowDrafts: () => void;
  formatDate: (date: string) => string;
}

export function Sidebar({
  currentView,
  seatMaps,
  recentSeatMaps,
  onShowTemplates,
  onShowDrafts,
  formatDate,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateNewSeatMap = async () => {
    try {
      setIsCreating(true);

      console.log("🆕 Creating new empty seat map...");

      const result = await createEmptySeatMapAction();

      if (result.success) {
        const newSeatMap = result.data;
        console.log("✅ Empty seat map created:", newSeatMap);

        toast.success(`New seat map "${newSeatMap.name}" created!`);

        // Navigate to the canvas editor with the new seat map ID
        router.push(`/seat-map?seatMapId=${newSeatMap.id}`);
      } else {
        toast.error(result.error || "Failed to create new seat map");
        console.error("❌ Failed to create seat map:", result.error);
      }
    } catch (error) {
      console.error("❌ Error creating new seat map:", error);
      toast.error("An unexpected error occurred while creating the seat map");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b dark:border-gray-800">
        <h2 className="font-semibold text-lg mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <button
            onClick={handleCreateNewSeatMap}
            disabled={isCreating}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-primary transition-colors group w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
              {isCreating ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400" />
              ) : (
                <Plus size={16} className="text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <span className="font-medium">
                {isCreating ? "Creating..." : "Create New"}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isCreating ? "Setting up canvas..." : "Canvas seat map"}
              </p>
            </div>
          </button>

          <Button
            variant="ghost"
            className="w-full justify-start h-auto pl-3 group"
            onClick={onShowTemplates}
          >
            <div className="p-1 mr-1 rounded bg-yellow-100 dark:bg-yellow-900/30 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50">
              <Star
                size={16}
                className="text-yellow-600 dark:text-yellow-400"
              />
            </div>
            <div className="text-left">
              <span className="font-medium">Browse Templates</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Community designs
              </p>
            </div>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto p-3"
            onClick={onShowDrafts}
          >
            <FileText size={18} className="mr-3" />
            <div className="text-left">
              <span>My Canvas Seat Maps ({seatMaps.length})</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {seatMaps.length > 0
                  ? `${seatMaps.filter((map) => map.publicity === "public").length} public`
                  : "No seat maps yet"}
              </p>
            </div>
          </Button>
        </div>

        <RecentSeatMapsList seatMaps={recentSeatMaps} formatDate={formatDate} />
      </div>
    </div>
  );
}
