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
import { Search, Eye, Check, Grid3x3, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { getUserSeatMapsAction } from "@/lib/actions/organizer/seat-map-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SeatMapData } from "../../../../../types/event-types";
import {
  AreaModeContainer,
  GridShape,
  RowShape,
  SeatShape,
  SeatGridSettings,
} from "@/components/seat-map/types";

interface SeatMapSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (seatMap: SeatMapData) => void;
  selectedSeatMapId?: string;
  selectedSeatMapData?: SeatMapData | null; // Add this to identify the current seat map used by the event
}

export function SeatMapSelectionModal({
  open,
  onOpenChange,
  onSelect,
  selectedSeatMapId,
  selectedSeatMapData,
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
        let draftedFrom: any = result.data!.filter((seatMap: any) => {
          return seatMap.id === selectedSeatMapId;
        });
        // ✅ Filter out seat maps that are used by events
        const availableSeatMaps = result.data!.filter((seatMap: any) => {
          return !seatMap.usedByEvent;
        });

        const processedSeatMaps = availableSeatMaps.map((seatMap: any) => {
          const areaModeContainer = seatMap.shapes?.find(
            (shape: any) =>
              shape.id === "area-mode-container-id" &&
              shape.type === "container" &&
              shape.defaultSeatSettings
          ) as AreaModeContainer | undefined;

          const grids: GridShape[] =
            areaModeContainer?.children?.filter(
              (child): child is GridShape =>
                child.type === "container" &&
                "gridName" in child &&
                "seatSettings" in child &&
                Array.isArray(child.children)
            ) || [];

          const { gridCount, totalSeats, totalRevenue } = calculateSeatMapStats(
            grids,
            areaModeContainer?.defaultSeatSettings
          );
          console.log(
            seatMap,
            draftedFrom,
            seatMap.id === draftedFrom[0].draftedFrom
          );
          const isDraftedFromCurrent =
            seatMap.id === draftedFrom[0].draftedFrom;
          return {
            ...seatMap,
            grids: grids.map((grid) => ({
              id: grid.id,
              name: grid.gridName,
              rows: grid.children.map((row: RowShape) => ({
                id: row.id,
                name: row.rowName,
                seats:
                  row.children.filter(
                    (seat: SeatShape) => seat.type === "ellipse"
                  ) || [],
                seatSpacing:
                  row.seatSpacing ||
                  areaModeContainer?.defaultSeatSettings?.seatSpacing ||
                  25,
                labelPlacement: row.labelPlacement || "left",
              })),
              seatSettings: grid.seatSettings,
              price:
                grid.seatSettings?.price ||
                areaModeContainer?.defaultSeatSettings?.price ||
                0,
              seatCount: grid.children.reduce((acc: number, row: RowShape) => {
                return (
                  acc +
                  (row.children?.filter(
                    (seat: SeatShape) => seat.type === "ellipse"
                  )?.length || 0)
                );
              }, 0),
            })),
            defaultSeatSettings: areaModeContainer?.defaultSeatSettings || null,
            hasGrids: gridCount > 0,
            isDraftedFromCurrent, // ✅ Add this flag
            isCurrentEventSeatMap: seatMap.id === selectedSeatMapData?.id, // ✅ Flag for current seat map
            statistics: {
              gridCount,
              totalSeats,
              totalRevenue,
              hasValidStructure: gridCount > 0 && totalSeats > 0,
            },
          };
        });

        setSeatMaps(processedSeatMaps);
        setFilteredSeatMaps(processedSeatMaps);
      } else {
        console.error("Failed to load seat maps:", result.error);
        toast.error(result.error || "Failed to load seat maps");
      }
    } catch (error) {
      console.error("Error loading seat maps:", error);
      toast.error("An unexpected error occurred while loading seat maps");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSeatMapStats = (
    grids: GridShape[],
    defaultSettings?: SeatGridSettings
  ): {
    gridCount: number;
    totalSeats: number;
    totalRevenue: number;
  } => {
    let totalSeats = 0;
    let totalRevenue = 0;

    const validGrids = grids.filter((grid: GridShape) => {
      return (
        Array.isArray(grid.children) &&
        grid.children.some(
          (row: RowShape) =>
            row.type === "container" &&
            Array.isArray(row.children) &&
            row.children.some((seat: SeatShape) => seat.type === "ellipse")
        )
      );
    });

    validGrids.forEach((grid: GridShape) => {
      const gridSeats = grid.children.reduce((acc: number, row: RowShape) => {
        if (row.type === "container" && Array.isArray(row.children)) {
          const validSeats = row.children.filter(
            (seat: SeatShape) => seat.type === "ellipse"
          );
          return acc + validSeats.length;
        }
        return acc;
      }, 0);

      const gridPrice = grid.seatSettings?.price || defaultSettings?.price || 0;
      const gridRevenue = gridSeats * gridPrice;

      totalSeats += gridSeats;
      totalRevenue += gridRevenue;
    });

    return {
      gridCount: validGrids.length,
      totalSeats,
      totalRevenue,
    };
  };

  useEffect(() => {
    if (open) {
      loadSeatMaps();
    }
  }, [open, selectedSeatMapData]);

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

  const getSeatMapDisplayStats = (seatMap: any) => {
    if (!seatMap.statistics) {
      return { gridCount: 0, totalSeats: 0, isUsable: false };
    }

    return {
      gridCount: seatMap.statistics.gridCount,
      totalSeats: seatMap.statistics.totalSeats,
      isUsable: seatMap.statistics.hasValidStructure,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23cccccc' stroke-width='2'/%3E%3C/svg%3E";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" />
            Select a Seat Map
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />
            <Input
              placeholder="Search your available seat maps..."
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
                <span className="ml-3 text-gray-600">Loading seat maps...</span>
              </div>
            ) : filteredSeatMaps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                {filteredSeatMaps.map((seatMap: any) => {
                  const stats = getSeatMapDisplayStats(seatMap);
                  const isUsable = stats.isUsable;

                  return (
                    <Card
                      key={seatMap.id}
                      className={`flex-col justify-between overflow-hidden transition-all ${
                        isUsable
                          ? "cursor-pointer hover:shadow-lg"
                          : "opacity-60 cursor-not-allowed"
                      } ${
                        selectedSeatMapId === seatMap.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : ""
                      } ${
                        // ✅ Highlight drafted seat maps with special border
                        seatMap.isDraftedFromCurrent
                          ? "ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/20"
                          : ""
                      } ${
                        // ✅ Highlight current event seat map
                        seatMap.isCurrentEventSeatMap
                          ? "ring-2 ring-green-400 bg-green-50 dark:bg-green-950/20"
                          : ""
                      }`}
                      onClick={() => isUsable && onSelect(seatMap)}
                    >
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                        <img
                          src={seatMap.image || placeholderImage}
                          alt={seatMap.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              placeholderImage;
                          }}
                        />
                        {selectedSeatMapId === seatMap.id && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-lg">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                        {/* ✅ Draft indicator */}
                        {seatMap.isDraftedFromCurrent && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                            <Copy className="w-4 h-4" />
                          </div>
                        )}
                        {/* ✅ Current seat map indicator */}
                        {seatMap.isCurrentEventSeatMap && (
                          <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                        {!isUsable && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="bg-white rounded-lg p-3 text-center shadow-lg">
                              <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                              <p className="text-xs text-gray-700 font-medium">
                                No seating areas
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Create areas first
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-medium truncate mr-2 flex-1">
                            {seatMap.name}
                          </h3>
                          <div className="flex gap-1 flex-shrink-0">
                            {/* ✅ Special badges for different states */}
                            {seatMap.isCurrentEventSeatMap && (
                              <Badge variant="default" className="text-xs">
                                Current
                              </Badge>
                            )}
                            {seatMap.isDraftedFromCurrent && (
                              <Badge variant="secondary" className="text-xs">
                                <Copy className="w-3 h-3 mr-1" />
                                Draft
                              </Badge>
                            )}
                            {isUsable &&
                              !seatMap.isCurrentEventSeatMap &&
                              !seatMap.isDraftedFromCurrent && (
                                <Badge variant="outline" className="text-xs">
                                  Available
                                </Badge>
                              )}
                          </div>
                        </div>

                        {/* Enhanced Stats */}
                        {isUsable ? (
                          <div className="space-y-2 mb-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Grid3x3 className="w-3 h-3 mr-1" />
                                {stats.gridCount}{" "}
                                {stats.gridCount === 1 ? "Area" : "Areas"}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {stats.totalSeats.toLocaleString()} Seats
                              </Badge>
                            </div>

                            {/* Revenue info if available */}
                            {seatMap.statistics?.totalRevenue > 0 && (
                              <div className="text-xs text-gray-600">
                                Est. Revenue:{" "}
                                {formatCurrency(
                                  seatMap.statistics.totalRevenue
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mb-3">
                            <Badge variant="destructive" className="text-xs">
                              Empty Seat Map
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              Add seating areas to use this map
                            </p>
                          </div>
                        )}

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
                            disabled={!isUsable || seatMap.isDraftedFromCurrent}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUsable) {
                                onSelect(seatMap);
                                onOpenChange(false);
                              }
                            }}
                          >
                            {seatMap.isDraftedFromCurrent
                              ? "Using"
                              : isUsable
                                ? "Select"
                                : "Empty"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <Grid3x3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery
                    ? "No matching seat maps"
                    : "No available seat maps found"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "All your seat maps are currently being used by other events. Create a new one or use drafts."}
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
