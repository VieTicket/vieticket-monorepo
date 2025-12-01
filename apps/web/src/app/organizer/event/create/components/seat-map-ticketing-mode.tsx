"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Grid3x3, Users, DollarSign, MapPin, AlertCircle } from "lucide-react";
import type {
  SeatMapData,
  SeatMapPreviewData,
} from "../../../../../types/event-types";

interface SeatMapTicketingModeProps {
  selectedSeatMap: string;
  setSelectedSeatMap: (id: string) => void;
  selectedSeatMapData: SeatMapData | null;
  setSelectedSeatMapData: (data: SeatMapData | null) => void;
  seatMapPreviewData: SeatMapPreviewData | null;
  setSeatMapPreviewData: (data: SeatMapPreviewData | null) => void;
  setShowSeatMapModal: (show: boolean) => void;
}

export function SeatMapTicketingMode({
  selectedSeatMap,
  setSelectedSeatMap,
  selectedSeatMapData,
  setSelectedSeatMapData,
  seatMapPreviewData,
  setSeatMapPreviewData,
  setShowSeatMapModal,
}: SeatMapTicketingModeProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="seatmap-select">Choose a Seat Map</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 justify-start"
            onClick={() => setShowSeatMapModal(true)}
          >
            {selectedSeatMapData
              ? selectedSeatMapData.name
              : "-- Select a seat map --"}
          </Button>
          {selectedSeatMapData && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.log("🗑️ Clearing seat map selection");
                setSelectedSeatMap("");
                setSelectedSeatMapData(null);
                setSeatMapPreviewData(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ✅ Enhanced Preview Section */}
      {selectedSeatMapData && seatMapPreviewData && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Seat Map Preview
          </h4>

          <div className="space-y-4">
            {/* Header Info */}
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="font-medium text-lg">
                {selectedSeatMapData.name}
              </span>
              <span className="text-sm text-gray-500">
                Updated:{" "}
                {new Date(selectedSeatMapData.updatedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Preview Image */}
            <div className="aspect-video bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {selectedSeatMapData.image ? (
                <img
                  src={selectedSeatMapData.image}
                  alt={selectedSeatMapData.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <span className="text-gray-500">
                  No preview image available
                </span>
              )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <Grid3x3 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">
                  {seatMapPreviewData.areas.length}
                </div>
                <div className="text-xs text-gray-600">
                  {seatMapPreviewData.areas.length === 1 ? "Area" : "Areas"}
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <div className="text-2xl font-bold text-green-600">
                  {seatMapPreviewData.totalSeats}
                </div>
                <div className="text-xs text-gray-600">Total Seats</div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(seatMapPreviewData.totalRevenue)}
                </div>
                <div className="text-xs text-gray-600">Total Revenue</div>
              </div>
            </div>

            {/* Areas Breakdown */}
            {seatMapPreviewData.areas.length > 0 ? (
              <div className="space-y-2">
                <h5 className="font-medium text-sm flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Seating Areas ({seatMapPreviewData.areas.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {seatMapPreviewData.areas.map((area, index: number) => (
                    <div
                      key={area.id}
                      className="bg-gray-50 p-3 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-sm flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                          {area.name}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Rows:</span>
                          <span className="font-medium">
                            {area.rows.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Seats:</span>
                          <span className="font-medium">{area.seatCount}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span>Base Price:</span>
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(area.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm text-yellow-800 font-medium">
                  This seat map has no seating areas configured
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Please edit the seat map to add seating areas
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="seatMapId" value={selectedSeatMap} />
      {selectedSeatMapData?.grids && (
        <input
          type="hidden"
          name="seatMapData"
          value={JSON.stringify({
            id: selectedSeatMapData.id,
            name: selectedSeatMapData.name,
            grids: selectedSeatMapData.grids,
            defaultSeatSettings: selectedSeatMapData.defaultSeatSettings,
          })}
        />
      )}
    </div>
  );
}
