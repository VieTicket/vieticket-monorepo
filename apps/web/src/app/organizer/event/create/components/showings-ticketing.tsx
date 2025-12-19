"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Settings, Calendar, Copy, Users } from "lucide-react";
import { SimpleTicketingMode } from "./simple-ticketing-mode";
import { SeatMapTicketingMode } from "./seat-map-ticketing-mode";
import type {
  Area,
  SeatMapData,
  TicketingMode,
} from "../../../../../types/event-types";
import type { ShowingWithAreas } from "@/types/showings";
import { formatDateVi } from "@/lib/utils";

interface ShowingsTicketingProps {
  ticketingMode: TicketingMode;
  showings: ShowingWithAreas[];
  seatMapData: SeatMapData | null;
  setSeatMapData: (data: SeatMapData | null) => void;
  onOpenSeatMapModal: () => void;
}

interface SimpleTicketingShowingConfig {
  showingIndex: number;
  areas?: Area[];
}

interface SeatmapTicketingShowingConfig {
  showingIndex: number;
  seatMapId: string;
  seatMapData?: SeatMapData;
}

export function ShowingsTicketing({
  ticketingMode,
  showings,
  seatMapData,
  setSeatMapData,
  onOpenSeatMapModal,
}: ShowingsTicketingProps) {
  const [selectedShowingIndex, setSelectedShowingIndex] = useState(0);
  const [copyToAllShowings, setCopyToAllShowings] = useState(false);
  const [showingConfigs, setShowingConfigs] = useState<
    SimpleTicketingShowingConfig[]
  >([]);

  // ✅ Local state for areas (only used in simple mode)
  const [areas, setAreas] = useState<Area[]>([
    { name: "Area A", seatCount: "", ticketPrice: "" },
  ]);

  const currentShowing = showings[selectedShowingIndex] || showings[0];

  // ✅ Get all showing configurations for form submission
  const getAllShowingConfigs = () => {
    if (ticketingMode === "seatmap") {
      // For seat map mode, all showings use the same seat map
      return showings.map((_, index) => ({
        showingIndex: index,
        seatMapId: seatMapData?.id || "",
        seatMapData: seatMapData,
      }));
    }

    // For simple mode
    if (copyToAllShowings) {
      return showings.map((_, index) => ({
        showingIndex: index,
        areas,
      }));
    } else {
      return showings.map((showing, index) => {
        const config = showingConfigs.find((c) => c.showingIndex === index);

        let showingAreas = config?.areas;
        if (!showingAreas) {
          showingAreas =
            showing.areas && showing.areas.length > 0
              ? showing.areas
              : [{ name: "Area A", seatCount: "", ticketPrice: "" }];
        }

        return {
          showingIndex: index,
          areas: showingAreas,
        };
      });
    }
  };

  const getCurrentShowingAreas = () => {
    if (copyToAllShowings) {
      return areas;
    }

    const config = showingConfigs.find(
      (c) => c.showingIndex === selectedShowingIndex
    );
    if (config?.areas) {
      return config.areas;
    }

    const currentShowing = showings[selectedShowingIndex];
    if (currentShowing?.areas && currentShowing.areas.length > 0) {
      return currentShowing.areas;
    }

    return [{ name: "Area A", seatCount: "", ticketPrice: "" }];
  };

  const updateCurrentShowingAreas = (
    newAreas: React.SetStateAction<Area[]>
  ) => {
    if (copyToAllShowings) {
      setAreas(newAreas);
    } else {
      const updatedConfigs = [...showingConfigs];
      const existingIndex = updatedConfigs.findIndex(
        (c) => c.showingIndex === selectedShowingIndex
      );

      const resolvedAreas =
        typeof newAreas === "function"
          ? newAreas(getCurrentShowingAreas())
          : newAreas;

      if (existingIndex >= 0) {
        updatedConfigs[existingIndex].areas = resolvedAreas;
      } else {
        updatedConfigs.push({
          showingIndex: selectedShowingIndex,
          areas: resolvedAreas,
        });
      }

      setShowingConfigs(updatedConfigs);
    }
  };

  const handleCopyModeChange = (enabled: boolean) => {
    setCopyToAllShowings(enabled);
    if (enabled) {
      // When enabling copy mode, clear individual configs
      setShowingConfigs([]);
    }
  };

  if (!currentShowing) {
    return (
      <div className="text-center py-8 text-gray-500">
        No showings available. Please add showings in the previous step.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Showings List */}
      <div>
        {ticketingMode === "simple" && (
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">
              Configure Ticketing for Each Showing
            </span>
          </h3>
        )}

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {ticketingMode === "simple" &&
            showings.map((showing, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all duration-200 ${
                  index === selectedShowingIndex
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedShowingIndex(index)}
              >
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{showing.name}</span>
                    </span>
                    {index === selectedShowingIndex && (
                      <Badge
                        variant="default"
                        className="text-xs flex-shrink-0"
                      >
                        Selected
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {showing.startTime
                          ? formatDateVi(new Date(showing.startTime))
                          : "Not set"}
                      </span>
                    </div>
                    {ticketingMode === "simple" && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {copyToAllShowings
                            ? `${areas.length} area${areas.length !== 1 ? "s" : ""}`
                            : `${
                                showingConfigs.find(
                                  (c) => c.showingIndex === index
                                )?.areas?.length ||
                                showing.areas?.length ||
                                1
                              } area${
                                (showingConfigs.find(
                                  (c) => c.showingIndex === index
                                )?.areas?.length ||
                                  showing.areas?.length ||
                                  1) !== 1
                                  ? "s"
                                  : ""
                              }`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Copy to All Showings Toggle - Only for Simple Mode */}
      {ticketingMode === "simple" && showings.length > 1 && (
        <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <div>
                  <Label
                    htmlFor="copy-mode"
                    className="text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    Apply to All Showings
                  </Label>
                  <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                    Use same ticketing configuration for all showings
                  </p>
                </div>
              </div>
              <Switch
                id="copy-mode"
                checked={copyToAllShowings}
                onCheckedChange={handleCopyModeChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Showing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">
              {copyToAllShowings
                ? "Configuration for All Showings"
                : `Configuration for ${currentShowing.name}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketingMode === "simple" ? (
            <SimpleTicketingMode
              areas={getCurrentShowingAreas()}
              setAreas={updateCurrentShowingAreas}
            />
          ) : (
            <SeatMapTicketingMode
              seatMapData={seatMapData}
              setSeatMapData={setSeatMapData}
              onOpenSeatMapModal={onOpenSeatMapModal}
            />
          )}
        </CardContent>
      </Card>

      {/* Hidden inputs for form submission */}
      {getAllShowingConfigs().map((config, index) => (
        <div key={index} style={{ display: "none" }}>
          <input
            type="hidden"
            name={`showings[${config.showingIndex}].ticketingMode`}
            value={ticketingMode}
          />
          {ticketingMode === "simple" &&
            (config as SimpleTicketingShowingConfig).areas?.map(
              (area, areaIndex) => (
                <React.Fragment key={areaIndex}>
                  <input
                    type="hidden"
                    name={`showings[${config.showingIndex}].areas[${areaIndex}].name`}
                    value={area.name}
                  />
                  <input
                    type="hidden"
                    name={`showings[${config.showingIndex}].areas[${areaIndex}].seatCount`}
                    value={area.seatCount}
                  />
                  <input
                    type="hidden"
                    name={`showings[${config.showingIndex}].areas[${areaIndex}].ticketPrice`}
                    value={area.ticketPrice}
                  />
                </React.Fragment>
              )
            )}
          {ticketingMode === "seatmap" && (
            <>
              <input
                type="hidden"
                name={`showings[${config.showingIndex}].seatMapId`}
                value={(config as SeatmapTicketingShowingConfig).seatMapId}
              />
              {(config as SeatmapTicketingShowingConfig).seatMapData && (
                <input
                  type="hidden"
                  name={`showings[${config.showingIndex}].seatMapData`}
                  value={JSON.stringify({
                    grids:
                      (config as SeatmapTicketingShowingConfig)!.seatMapData!
                        .grids || [],
                    defaultSeatSettings:
                      (config as SeatmapTicketingShowingConfig)!.seatMapData!
                        .defaultSeatSettings,
                  })}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
