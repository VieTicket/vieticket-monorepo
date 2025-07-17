"use client";

import { Plus, Star, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RecentSeatMapsList } from "./recent-seat-maps-list";

type SeatMapItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
};

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
  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col">
      {/* Quick Actions Section */}
      <div className="p-4 border-b dark:border-gray-800">
        <h2 className="font-semibold text-lg mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <Link
            href="/seat-map"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-primary transition-colors"
          >
            <Plus size={18} />
            <span>Create New</span>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start h-auto p-3"
            onClick={onShowTemplates}
          >
            <Star size={18} className="mr-3" />
            <span>Browse Templates</span>
          </Button>
        </div>
      </div>

      {/* Drafts Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3">
          <Button
            variant={currentView === "drafts" ? "default" : "ghost"}
            className="w-full justify-start h-auto p-3"
            onClick={onShowDrafts}
          >
            <FileText size={18} className="mr-3" />
            <span>My Drafts ({seatMaps.length})</span>
          </Button>
        </div>

        <RecentSeatMapsList seatMaps={recentSeatMaps} formatDate={formatDate} />
      </div>
    </div>
  );
}
