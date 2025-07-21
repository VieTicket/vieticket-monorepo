"use client";

import { Label } from "@/components/ui/label";
import { SimpleTicketingMode } from "./simple-ticketing-mode";
import { SeatMapTicketingMode } from "./seat-map-ticketing-mode";
import type {
  Area,
  SeatMapData,
  SeatMapPreviewData,
  TicketingMode,
} from "../../../../../types/event-types";

interface TicketingStepProps {
  ticketingMode: TicketingMode;
  setTicketingMode: (mode: TicketingMode) => void;
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  selectedSeatMap: string;
  setSelectedSeatMap: (id: string) => void;
  selectedSeatMapData: SeatMapData | null;
  setSelectedSeatMapData: (data: SeatMapData | null) => void;
  seatMapPreviewData: SeatMapPreviewData | null;
  setSeatMapPreviewData: (data: SeatMapPreviewData | null) => void;
  setShowSeatMapModal: (show: boolean) => void;
  hasSeatMapChanges?: boolean;
}

export function TicketingStep({
  ticketingMode,
  setTicketingMode,
  areas,
  setAreas,
  selectedSeatMap,
  setSelectedSeatMap,
  selectedSeatMapData,
  setSelectedSeatMapData,
  seatMapPreviewData,
  setSeatMapPreviewData,
  setShowSeatMapModal,
  hasSeatMapChanges = false,
}: TicketingStepProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Ticketing & Seating</h2>

      {/* Seat Map Changes Warning */}
      {hasSeatMapChanges && (
        <div className="mb-6 p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-800 font-medium">
              Changes detected that will affect seat assignments
            </span>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="space-y-4 mb-6">
        <Label className="text-base font-medium">Choose Ticketing Mode</Label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setTicketingMode("simple")}
            className={`flex-1 p-4 border rounded-lg text-left transition-colors ${
              ticketingMode === "simple"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium mb-2">Simple Ticketing</div>
            <div className="text-sm text-gray-600">
              Create tickets with basic area pricing (no specific seat
              selection)
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTicketingMode("seatmap")}
            className={`flex-1 p-4 border rounded-lg text-left transition-colors ${
              ticketingMode === "seatmap"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium mb-2">Seat Map Ticketing</div>
            <div className="text-sm text-gray-600">
              Use a pre-designed seat map with specific seat selection
            </div>
          </button>
        </div>
      </div>

      {/* Content based on selected mode */}
      {ticketingMode === "simple" ? (
        <SimpleTicketingMode areas={areas} setAreas={setAreas} />
      ) : (
        <SeatMapTicketingMode
          selectedSeatMap={selectedSeatMap}
          setSelectedSeatMap={setSelectedSeatMap}
          selectedSeatMapData={selectedSeatMapData}
          setSelectedSeatMapData={setSelectedSeatMapData}
          seatMapPreviewData={seatMapPreviewData}
          setSeatMapPreviewData={setSeatMapPreviewData}
          setShowSeatMapModal={setShowSeatMapModal}
        />
      )}

      {/* Hidden input for ticketing mode */}
      <input type="hidden" name="ticketingMode" value={ticketingMode} />
    </div>
  );
}
