"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3x3, Users, DollarSign, MapPin, AlertCircle } from "lucide-react";
import type {
  SeatMapData,
  SeatMapPreviewData,
} from "../../../../../types/event-types";
import { getSeatMapGridDataAction } from "@/lib/actions/organizer/seat-map-actions";

interface SeatMapTicketingModeProps {
  seatMapData: SeatMapData | null;
  setSeatMapData: (data: SeatMapData | null) => void;
  onOpenSeatMapModal: () => void;
}

export function SeatMapTicketingMode({
  seatMapData,
  setSeatMapData,
  onOpenSeatMapModal,
}: SeatMapTicketingModeProps) {
  // ✅ Local state for preview data (only used for display)
  const [previewData, setPreviewData] = useState<SeatMapPreviewData | null>(
    null
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // ✅ Load preview data when seat map is selected
  useEffect(() => {
    if (seatMapData?.id && !previewData) {
      loadPreviewData(seatMapData.id);
    }
  }, [seatMapData?.id]);

  const loadPreviewData = async (seatMapId: string) => {
    setIsLoadingPreview(true);
    try {
      const result = await getSeatMapGridDataAction(seatMapId);
      if (result.success && result.data?.preview) {
        setPreviewData(result.data.preview);
      }
    } catch (error) {
      console.error("Failed to load preview data:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const handleClearSeatMap = () => {
    setSeatMapData(null);
    setPreviewData(null);
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
            onClick={onOpenSeatMapModal}
          >
            {seatMapData ? seatMapData.name : "-- Select a seat map --"}
          </Button>
          {seatMapData && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearSeatMap}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ✅ Enhanced Preview Section */}
      {seatMapData && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Seat Map Preview
          </h4>

          <div className="space-y-4">
            {/* Header Info */}
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="font-medium text-lg">{seatMapData.name}</span>
              <span className="text-sm text-gray-500">
                Updated: {new Date(seatMapData.updatedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Preview Image */}
            <div className="aspect-video bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {seatMapData.image ? (
                <img
                  src={seatMapData.image}
                  alt={seatMapData.name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <span className="text-gray-500">
                  No preview image available
                </span>
              )}
            </div>

            {/* Statistics Cards */}
            {isLoadingPreview ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-100 p-3 rounded-lg animate-pulse"
                  >
                    <div className="h-5 w-5 bg-gray-300 rounded mx-auto mb-1"></div>
                    <div className="h-6 bg-gray-300 rounded mb-1"></div>
                    <div className="h-3 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : previewData ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <Grid3x3 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.areas.length}
                    </div>
                    <div className="text-xs text-gray-600">
                      {previewData.areas.length === 1 ? "Area" : "Areas"}
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <div className="text-2xl font-bold text-green-600">
                      {previewData.totalSeats}
                    </div>
                    <div className="text-xs text-gray-600">Total Seats</div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(previewData.totalRevenue)}
                    </div>
                    <div className="text-xs text-gray-600">Total Revenue</div>
                  </div>
                </div>

                {/* Areas Breakdown */}
                {previewData.areas.length > 0 ? (
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4" />
                      Seating Areas ({previewData.areas.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {previewData.areas.map((area, index: number) => (
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
                              <span className="font-medium">
                                {area.seatCount}
                              </span>
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
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">Loading preview data...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
