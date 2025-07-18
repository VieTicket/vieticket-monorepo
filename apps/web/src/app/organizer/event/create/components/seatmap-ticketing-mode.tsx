"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select Seat Map</h3>

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

      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">
            Don&apos;t have a seat map? Create one first.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/organizer/seat-map">Manage Seat Maps</Link>
        </Button>
      </div>

      {selectedSeatMapData && seatMapPreviewData && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium mb-4">Seat Map Preview</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">{selectedSeatMapData.name}</span>
              <span className="text-sm text-gray-500">
                Updated:{" "}
                {new Date(selectedSeatMapData.updatedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Seat map preview image */}
            <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
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

            {/* Areas summary */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm">
                Seating Areas ({seatMapPreviewData.areas.length})
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {seatMapPreviewData.areas.map((area, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="font-medium">{area.name}</div>
                    <div className="text-gray-600">
                      {area.rows.length} rows,{" "}
                      {area.rows.reduce(
                        (acc: number, row) => acc + row.seats.length,
                        0
                      )}{" "}
                      seats
                    </div>
                    <div className="text-green-600 font-medium">
                      Base price: {area.price.toLocaleString()} VND
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name="seatMapId" value={selectedSeatMap} />
    </div>
  );
}
