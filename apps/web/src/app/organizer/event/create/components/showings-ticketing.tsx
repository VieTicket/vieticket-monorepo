"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, Settings, Calendar, Copy, Users } from "lucide-react";
import { SimpleTicketingMode } from "./simple-ticketing-mode";
import { SeatMapTicketingMode } from "./seat-map-ticketing-mode";
import type {
  Area,
  SeatMapData,
  SeatMapPreviewData,
  TicketingMode,
} from "../../../../../types/event-types";
import type { ShowingFormData, ShowingWithAreas } from "@/types/showings";
import { formatDateVi } from "@/lib/utils";

interface ShowingsTicketingProps {
  ticketingMode: TicketingMode;
  showings: ShowingWithAreas[];
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  selectedSeatMap: string;
  setSelectedSeatMap: (id: string) => void;
  selectedSeatMapData: SeatMapData | null;
  setSelectedSeatMapData: (data: SeatMapData | null) => void;
  seatMapPreviewData: SeatMapPreviewData | null;
  setSeatMapPreviewData: (data: SeatMapPreviewData | null) => void;
  setShowSeatMapModal: (show: boolean) => void;
}

// State for managing per-showing configuration
interface ShowingConfig {
  showingIndex: number;
  areas?: Area[];
  seatMapId?: string;
  seatMapData?: SeatMapData | null;
}

export function ShowingsTicketing({
  ticketingMode,
  showings,
  areas,
  setAreas,
  selectedSeatMap,
  setSelectedSeatMap,
  selectedSeatMapData,
  setSelectedSeatMapData,
  seatMapPreviewData,
  setSeatMapPreviewData,
  setShowSeatMapModal,
}: ShowingsTicketingProps) {
  const [selectedShowingIndex, setSelectedShowingIndex] = useState(0);
  const [copyToAllShowings, setCopyToAllShowings] = useState(false);
  const [showingConfigs, setShowingConfigs] = useState<ShowingConfig[]>([]);

  const currentShowing = showings[selectedShowingIndex] || showings[0];

  // Get all showing configurations for form submission
  const getAllShowingConfigs = () => {
    if (copyToAllShowings) {
      // All showings use the same configuration
      return showings.map((_, index) => ({
        showingIndex: index,
        areas,
        seatMapId: selectedSeatMap,
        seatMapData: selectedSeatMapData,
      }));
    } else {
      // Each showing has its own configuration or uses its own areas
      return showings.map((showing, index) => {
        const config = showingConfigs.find((c) => c.showingIndex === index);
        
        // Priority: individual config > showing's own areas > default area
        let showingAreas = config?.areas;
        if (!showingAreas) {
          showingAreas = showing.areas && showing.areas.length > 0 
            ? showing.areas 
            : [{ name: "Area A", seatCount: "", ticketPrice: "" }];
        }
        
        return {
          showingIndex: index,
          areas: showingAreas,
          seatMapId: config?.seatMapId || selectedSeatMap,
          seatMapData: config?.seatMapData || selectedSeatMapData,
        };
      });
    }
  };

  // Get current showing's configuration
  const getCurrentShowingAreas = () => {
    if (copyToAllShowings) {
      return areas;
    }

    // First check individual configs
    const config = showingConfigs.find(
      (c) => c.showingIndex === selectedShowingIndex
    );
    if (config?.areas) {
      return config.areas;
    }

    // Then check if current showing has areas from database
    const currentShowing = showings[selectedShowingIndex];
    if (currentShowing?.areas && currentShowing.areas.length > 0) {
      return currentShowing.areas;
    }

    // If no areas exist, create a default area for this showing
    return [{ name: "Area A", seatCount: "", ticketPrice: "" }];
  };

  const getCurrentShowingSeatMap = () => {
    if (copyToAllShowings) {
      return { seatMapId: selectedSeatMap, seatMapData: selectedSeatMapData };
    }
    const config = showingConfigs.find(
      (c) => c.showingIndex === selectedShowingIndex
    );
    return {
      seatMapId: config?.seatMapId || selectedSeatMap,
      seatMapData: config?.seatMapData || selectedSeatMapData,
    };
  };

  // Update current showing's configuration
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

  const updateCurrentShowingSeatMap = (
    seatMapId: string,
    seatMapData: SeatMapData | null
  ) => {
    if (copyToAllShowings) {
      setSelectedSeatMap(seatMapId);
      setSelectedSeatMapData(seatMapData);
    } else {
      const updatedConfigs = [...showingConfigs];
      const existingIndex = updatedConfigs.findIndex(
        (c) => c.showingIndex === selectedShowingIndex
      );

      if (existingIndex >= 0) {
        updatedConfigs[existingIndex].seatMapId = seatMapId;
        updatedConfigs[existingIndex].seatMapData = seatMapData;
      } else {
        updatedConfigs.push({
          showingIndex: selectedShowingIndex,
          seatMapId,
          seatMapData,
        });
      }

      setShowingConfigs(updatedConfigs);
    }
  };

  const handleCopyModeChange = (enabled: boolean) => {
    setCopyToAllShowings(enabled);
    if (enabled) {
      // Clear individual configs when enabling copy mode
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
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">
            Configure Ticketing for Each Showing
          </span>
        </h3>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {showings.map((showing, index) => (
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
                    <Badge variant="default" className="text-xs flex-shrink-0">
                      Selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-medium text-xs sm:text-sm">
                      Start:
                    </span>
                    <span className="truncate text-xs sm:text-sm">
                      {formatDateVi(new Date(showing.startTime))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-medium text-xs sm:text-sm">End:</span>
                    <span className="truncate text-xs sm:text-sm">
                      {formatDateVi(new Date(showing.endTime))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Showing Configuration */}
      <div className="border-t pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <h4 className="text-base sm:text-lg font-semibold truncate">
              Configuring: {currentShowing.name}
            </h4>
          </div>

          {/* Copy Mode Toggle */}
          {showings.length > 1 && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Switch
                id="copy-mode"
                checked={copyToAllShowings}
                onCheckedChange={handleCopyModeChange}
              />
              <Label
                htmlFor="copy-mode"
                className="text-xs sm:text-sm font-medium"
              >
                <div className="flex items-center gap-1">
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">
                    Apply to all showings
                  </span>
                </div>
              </Label>
            </div>
          )}
        </div>

        {/* Copy Mode Info */}
        {showings.length > 1 && (
          <div
            className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg ${
              copyToAllShowings
                ? "bg-blue-50 border border-blue-200"
                : "bg-orange-50 border border-orange-200"
            }`}
          >
            <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm">
              {copyToAllShowings ? (
                <>
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5 sm:mt-0 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-blue-800">
                      Copy Mode Active:
                    </span>
                    <span className="text-blue-700 ml-1">
                      Changes will apply to all {showings.length} showings
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 mt-0.5 sm:mt-0 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-orange-800">
                      Individual Mode:
                    </span>
                    <span className="text-orange-700 ml-1">
                      Configure each showing separately
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ticketing Mode Content */}
        {ticketingMode === "simple" ? (
          <div className="space-y-3 sm:space-y-4">
            <SimpleTicketingMode
              areas={getCurrentShowingAreas()}
              setAreas={updateCurrentShowingAreas}
            />
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <SeatMapTicketingMode
              selectedSeatMap={getCurrentShowingSeatMap().seatMapId}
              setSelectedSeatMap={(id) =>
                updateCurrentShowingSeatMap(
                  id,
                  getCurrentShowingSeatMap().seatMapData
                )
              }
              selectedSeatMapData={getCurrentShowingSeatMap().seatMapData}
              setSelectedSeatMapData={(data) =>
                updateCurrentShowingSeatMap(
                  getCurrentShowingSeatMap().seatMapId,
                  data
                )
              }
              seatMapPreviewData={seatMapPreviewData}
              setSeatMapPreviewData={setSeatMapPreviewData}
              setShowSeatMapModal={setShowSeatMapModal}
            />
          </div>
        )}

        {/* Navigation Info */}
        <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-gray-50 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            <strong>Tip:</strong> Click on different showing cards above to
            configure ticketing for each showing separately.
            {showings.length > 1 &&
              ` You have ${showings.length} showings to configure.`}
          </p>
        </div>

        {/* Hidden inputs for form submission */}
        {getAllShowingConfigs().map((config, showingIndex) => (
          <div key={showingIndex}>
            {/* Add showing configuration data */}
            <input
              type="hidden"
              name={`showingConfigs[${showingIndex}].copyMode`}
              value={copyToAllShowings.toString()}
            />
            {config.areas?.map((area, areaIndex) => (
              <div key={areaIndex}>
                <input
                  type="hidden"
                  name={`showingConfigs[${showingIndex}].areas[${areaIndex}].name`}
                  value={area.name}
                />
                <input
                  type="hidden"
                  name={`showingConfigs[${showingIndex}].areas[${areaIndex}].seatCount`}
                  value={area.seatCount}
                />
                <input
                  type="hidden"
                  name={`showingConfigs[${showingIndex}].areas[${areaIndex}].ticketPrice`}
                  value={area.ticketPrice}
                />
              </div>
            ))}
            {config.seatMapId && (
              <input
                type="hidden"
                name={`showingConfigs[${showingIndex}].seatMapId`}
                value={config.seatMapId}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
