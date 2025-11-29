"use client";

import {
  ArrowLeft,
  Search,
  Grid,
  List,
  Plus,
  Star,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SeatMapCard } from "./seat-map-card";
import Link from "next/link";
import { SeatMapItem } from "../page";

interface DraftsViewProps {
  filteredSeatMaps: SeatMapItem[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  formatDate: (date: Date) => string;
  onPublish: (seatMapId: string) => void;
  onDelete: (seatMapId: string) => void;
  publishingIds: Set<string>;
  deletingIds: Set<string>;
}

export function DraftsView({
  filteredSeatMaps,
  isLoading,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  selectedTab,
  setSelectedTab,
  formatDate,
  onPublish,
  onDelete,
  publishingIds,
  deletingIds,
}: DraftsViewProps) {
  const renderContent = (tabValue: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (filteredSeatMaps.length > 0) {
      return (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              : "flex flex-col gap-3 md:gap-4"
          )}
        >
          {filteredSeatMaps.map((item) => (
            <SeatMapCard
              key={item.id}
              item={item}
              viewMode={viewMode}
              formatDate={formatDate}
              showActions={true}
              onPublish={onPublish}
              onDelete={onDelete}
              isPublishing={publishingIds.has(item.id)}
              isDeleting={deletingIds.has(item.id)}
            />
          ))}
        </div>
      );
    }

    if (tabValue === "starred") {
      return (
        <div className="text-center py-10">
          <Star className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Starred functionality coming soon
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-10">
        <Palette className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {searchQuery
            ? "No canvas seat maps match your search"
            : tabValue === "recent"
              ? "No recent canvas seat maps found"
              : "No canvas seat maps found. Create your first canvas seat map to get started."}
        </p>
        {!searchQuery && tabValue === "all" && (
          <div className="space-y-3">
            <Link href="/seat-map">
              <Button className="mb-2">
                <Plus size={16} className="mr-2" />
                Create New Canvas Seat Map
              </Button>
            </Link>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Use our new PIXI.js-powered canvas editor for better performance
              and features
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Header - Responsive */}
      <div className="border-b dark:border-gray-800 p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center h-auto md:h-20">
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-0">
          <div>
            <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <Palette className="w-4 md:w-5 h-4 md:h-5" />
              My Canvas Seat Maps
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          {/* Search Input - Responsive */}
          <div className="relative flex-1 md:flex-none">
            <Search
              className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={16}
            />
            <Input
              placeholder="Search..."
              className="w-full min-w-32 md:w-48 lg:w-64 pl-8 md:pl-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-8 w-8 md:h-9 md:w-9",
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
                "h-8 w-8 md:h-9 md:w-9",
                viewMode === "list" ? "bg-gray-100 dark:bg-gray-800" : ""
              )}
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <Tabs
          defaultValue="all"
          className="w-full"
          onValueChange={setSelectedTab}
        >
          <TabsContent value="all" className="mt-0">
            {renderContent("all")}
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            {renderContent("recent")}
          </TabsContent>

          <TabsContent value="starred" className="mt-0">
            {renderContent("starred")}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
