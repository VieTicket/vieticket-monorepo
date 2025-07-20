"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Check } from "lucide-react";
import { toast } from "sonner";
import { getUserSeatMapsAction } from "@/lib/actions/organizer/seat-map-actions";
import { Card } from "@/components/ui/card";
import type { SeatMapData } from "../../../../../types/event-types";

interface SeatMapSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (seatMap: SeatMapData) => void;
  selectedSeatMapId?: string;
}

export function SeatMapSelectionModal({
  open,
  onOpenChange,
  onSelect,
  selectedSeatMapId,
}: SeatMapSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [seatMaps, setSeatMaps] = useState<SeatMapData[]>([]);
  const [filteredSeatMaps, setFilteredSeatMaps] = useState<SeatMapData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSeatMaps = async () => {
    try {
      setIsLoading(true);
      const result = await getUserSeatMapsAction();

      if (result.success) {
        setSeatMaps(result.data);
        setFilteredSeatMaps(result.data);
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
    if (open) {
      loadSeatMaps();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = seatMaps.filter((seatMap) =>
        seatMap.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSeatMaps(filtered);
    } else {
      setFilteredSeatMaps(seatMaps);
    }
  }, [searchQuery, seatMaps]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select a Seat Map</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search */}
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

          {/* Seat Maps Grid */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredSeatMaps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSeatMaps.map((seatMap) => (
                  <Card
                    key={seatMap.id}
                    className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                      selectedSeatMapId === seatMap.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => onSelect(seatMap)}
                  >
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                      <img
                        src={seatMap.image || placeholderImage}
                        alt={seatMap.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedSeatMapId === seatMap.id && (
                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium truncate mb-1">
                        {seatMap.name}
                      </h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Updated: {formatDate(seatMap.updatedAt)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `/seat-map?id=${seatMap.id}&preview=true`,
                              "_blank"
                            );
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(seatMap);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery
                    ? "No seat maps match your search"
                    : "No seat maps found"}
                </p>
                {!searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      window.open("/organizer/seat-map", "_blank");
                    }}
                  >
                    Create a Seat Map
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
