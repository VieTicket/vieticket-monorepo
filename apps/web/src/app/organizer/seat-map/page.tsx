"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Star,
  Clock,
  Grid,
  List,
  PenSquare,
  Layers,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getUserSeatMapsAction,
  searchSeatMapsAction,
} from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";
import { TemplatesDialog } from "./components/templates-dialog";

type SeatMapItem = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  image?: string;
  createdBy: string;
};

export default function SeatMapDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [seatMaps, setSeatMaps] = useState<SeatMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTab, setSelectedTab] = useState("all");
  const [showAllDrafts, setShowAllDrafts] = useState(false);

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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() && showAllDrafts) {
        handleSearch(searchQuery);
      } else if (!searchQuery.trim() && showAllDrafts) {
        loadSeatMaps();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showAllDrafts]);

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

  const getRecentSeatMaps = () => {
    return seatMaps
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 3);
  };

  const getFilteredSeatMaps = () => {
    if (!showAllDrafts) return [];

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

  const handleDraftCreated = () => {
    loadSeatMaps();
  };

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Left Sidebar */}
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
            <TemplatesDialog onDraftCreated={handleDraftCreated}>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto p-3"
              >
                <Star size={18} className="mr-3" />
                <span>Browse Templates</span>
              </Button>
            </TemplatesDialog>
          </div>
        </div>

        {/* Drafts Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3">
            <Button
              variant={showAllDrafts ? "default" : "ghost"}
              className="w-full justify-start h-auto p-3"
              onClick={() => {
                setShowAllDrafts(!showAllDrafts);
                if (!showAllDrafts) {
                  loadSeatMaps();
                }
              }}
            >
              <FileText size={18} className="mr-3" />
              <span>My Drafts ({seatMaps.length})</span>
            </Button>
          </div>

          {!showAllDrafts && (
            <>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 px-2">
                Recent Updates
              </div>
              <div className="space-y-2">
                {recentSeatMaps.length > 0 ? (
                  recentSeatMaps.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() =>
                        window.open(`/seat-map?id=${item.id}`, "_blank")
                      }
                    >
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
                        <img
                          src={
                            item.image ||
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E"
                          }
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(item.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 px-2">
                    No seat maps yet
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showAllDrafts ? (
          <>
            {/* Top Bar - Only shown when viewing all drafts */}
            <div className="border-b dark:border-gray-800 p-4 flex justify-between items-center">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    size={18}
                  />
                  <Input
                    placeholder="Search your seat maps..."
                    className="w-full pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
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

            {/* Tabs and Content */}
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
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredSeatMaps.length > 0 ? (
                    <div
                      className={cn(
                        viewMode === "grid"
                          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                          : "flex flex-col gap-4"
                      )}
                    >
                      {filteredSeatMaps.map((item) => (
                        <SeatMapCard
                          key={item.id}
                          item={item}
                          viewMode={viewMode}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery
                          ? "No seat maps match your search"
                          : "No seat maps found. Create your first seat map to get started."}
                      </p>
                      {!searchQuery && (
                        <Link href="/seat-map">
                          <Button className="mt-4">
                            <Plus size={16} className="mr-2" />
                            Create New Seat Map
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recent" className="mt-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredSeatMaps.length > 0 ? (
                    <div
                      className={cn(
                        viewMode === "grid"
                          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                          : "flex flex-col gap-4"
                      )}
                    >
                      {filteredSeatMaps.map((item) => (
                        <SeatMapCard
                          key={item.id}
                          item={item}
                          viewMode={viewMode}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">
                        No recent seat maps found
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="starred" className="mt-0">
                  <div className="text-center py-10">
                    <Star className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Starred functionality coming soon
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <Layers className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Seat Map Manager
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Create custom seat maps for your events or browse community
                templates to get started quickly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/seat-map">
                  <Button size="lg">
                    <Plus size={16} className="mr-2" />
                    Create New Seat Map
                  </Button>
                </Link>
                <TemplatesDialog onDraftCreated={handleDraftCreated}>
                  <Button variant="outline" size="lg">
                    <Star size={16} className="mr-2" />
                    Browse Templates
                  </Button>
                </TemplatesDialog>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type SeatMapCardProps = {
  item: SeatMapItem;
  viewMode: "grid" | "list";
  formatDate: (date: string) => string;
};

function SeatMapCard({ item, viewMode, formatDate }: SeatMapCardProps) {
  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

  if (viewMode === "grid") {
    return (
      <div className="group rounded-xl overflow-hidden border dark:border-gray-800 transition-all hover:shadow-md dark:hover:border-gray-700">
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
          <img
            src={item.image || placeholderImage}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/seat-map?id=${item.id}`}>
                <PenSquare size={16} className="mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-medium truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
            <Clock size={14} className="mr-1" />
            {formatDate(item.updatedAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden shrink-0">
        <img
          src={item.image || placeholderImage}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{item.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Updated {formatDate(item.updatedAt)}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/seat-map?id=${item.id}`}>Edit</Link>
      </Button>
    </div>
  );
}
