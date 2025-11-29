"use client";

import { Plus, Star, FileText, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmptySeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";
import { SeatMapItem } from "../page";

type ViewMode = "welcome" | "drafts" | "templates";

interface SidebarProps {
  currentView: ViewMode;
  seatMaps: SeatMapItem[];
  recentSeatMaps: SeatMapItem[];
  onShowTemplates: () => void;
  onShowDrafts: () => void;
  formatDate: (date: Date) => string;
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

  return (
    <div className="w-54 md:w-50 lg:w-80 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col">
      <div className="p-3 md:p-4 dark:border-gray-800">
        <div className="space-y-2">
          <button
            onClick={handleCreateNewSeatMap}
            disabled={isCreating}
            className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-yellow-300 hover:bg-yellow-500 dark:hover:bg-yellow-600 text-primary transition-colors group w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div>
              <span className="font-medium text-sm md:text-base">
                {isCreating ? "Creating..." : "New Seat Map"}
              </span>
            </div>
          </button>
          <div className="border-t dark:border-gray-800 my-4"></div>

          <Button
            variant="ghost"
            className="w-full justify-start h-auto pl-2 md:pl-3 group"
            onClick={onShowTemplates}
          >
            <div className="text-left">
              <span className="font-medium text-sm md:text-base">
                Search Templates
              </span>
            </div>
          </Button>
        </div>
        <div className="mb-3">
          <Button
            variant="ghost"
            className="w-full justify-start h-auto p-2 md:p-3"
            onClick={onShowDrafts}
          >
            <div className="text-left">
              <span className="text-sm md:text-base">Manage Seat Maps</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
