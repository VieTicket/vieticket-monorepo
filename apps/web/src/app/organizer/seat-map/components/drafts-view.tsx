"use client";

import { ArrowLeft, Search, Grid, List, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SeatMapCard } from "./seat-map-card";
import Link from "next/link";

type SeatMapItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
  publicity?: "public" | "private";
};

interface DraftsViewProps {
  filteredSeatMaps: SeatMapItem[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  onBack: () => void;
  formatDate: (date: string) => string;
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
  onBack,
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
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              : "flex flex-col gap-4"
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
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery
            ? "No seat maps match your search"
            : tabValue === "recent"
              ? "No recent seat maps found"
              : "No seat maps found. Create your first seat map to get started."}
        </p>
        {!searchQuery && tabValue === "all" && (
          <Link href="/seat-map">
            <Button className="mt-4">
              <Plus size={16} className="mr-2" />
              Create New Seat Map
            </Button>
          </Link>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Drafts View Header */}
      <div className="border-b dark:border-gray-800 p-4 flex justify-between items-center h-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">My Drafts</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />
            <Input
              placeholder="Search your seat maps..."
              className="w-64 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
              className={
                viewMode === "grid" ? "bg-gray-100 dark:bg-gray-800" : ""
              }
            >
              <Grid size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="List view"
              onClick={() => setViewMode("list")}
              className={
                viewMode === "list" ? "bg-gray-100 dark:bg-gray-800" : ""
              }
            >
              <List size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Drafts Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs
          defaultValue="all"
          className="w-full"
          onValueChange={setSelectedTab}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Seat Maps</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>

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
