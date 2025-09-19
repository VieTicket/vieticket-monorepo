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
import type { ShowingFormData } from "@/types/showings";
import { formatDateVi } from "@/lib/utils";

interface ShowingsTicketingProps {
  ticketingMode: TicketingMode;
  showings: ShowingFormData[];
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
  const [copyToAllShowings, setCopyToAllShowings] = useState(true);
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
      // Each showing has its own configuration or falls back to global
      return showings.map((_, index) => {
        const config = showingConfigs.find((c) => c.showingIndex === index);
        return {
          showingIndex: index,
          areas: config?.areas || areas,
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
    const config = showingConfigs.find(
      (c) => c.showingIndex === selectedShowingIndex
    );
    return config?.areas || areas;
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
    <div className="space-y-6">
      {/* Showings List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Configure Ticketing for Each Showing
        </h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {showing.name}
                  </span>
                  {index === selectedShowingIndex && (
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Start:</span>
                    <span>{formatDateVi(new Date(showing.startTime))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">End:</span>
                    <span>{formatDateVi(new Date(showing.endTime))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Showing Configuration */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold">
              Configuring: {currentShowing.name}
            </h4>
            <Badge variant="outline" className="text-xs">
              {formatDateVi(new Date(currentShowing.startTime))}
            </Badge>
          </div>

          {/* Copy Mode Toggle */}
          {showings.length > 1 && (
            <div className="flex items-center space-x-2">
              <Switch
                id="copy-mode"
                checked={copyToAllShowings}
                onCheckedChange={handleCopyModeChange}
              />
              <Label htmlFor="copy-mode" className="text-sm font-medium">
                <div className="flex items-center gap-1">
                  <Copy className="w-4 h-4" />
                  Apply to all showings
                </div>
              </Label>
            </div>
          )}
        </div>

        {/* Copy Mode Info */}
        {showings.length > 1 && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              copyToAllShowings
                ? "bg-blue-50 border border-blue-200"
                : "bg-orange-50 border border-orange-200"
            }`}
          >
            <div className="flex items-center gap-2 text-sm">
              {copyToAllShowings ? (
                <>
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Copy Mode Active:
                  </span>
                  <span className="text-blue-700">
                    Changes will apply to all {showings.length} showings
                  </span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">
                    Individual Mode:
                  </span>
                  <span className="text-orange-700">
                    Configure each showing separately
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ticketing Mode Content */}
        {ticketingMode === "simple" ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-2">
                Simple Ticketing Mode
              </h5>
              <p className="text-sm text-green-700">
                Configure areas and pricing for {currentShowing.name}.
                {copyToAllShowings
                  ? " Changes will apply to all showings."
                  : " Each showing has independent configuration."}
              </p>
            </div>
            <SimpleTicketingMode
              areas={getCurrentShowingAreas()}
              setAreas={updateCurrentShowingAreas}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-800 mb-2">Seat Map Mode</h5>
              <p className="text-sm text-blue-700">
                Select a seat map for {currentShowing.name}.
                {copyToAllShowings
                  ? " The same seat map will be used for all showings."
                  : " Each showing can have a different seat map."}
              </p>
            </div>
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
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Click on different showing cards above to
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
