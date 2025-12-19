"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { ShowingsTicketing } from "./showings-ticketing";
import { SeatMapSelectionModal } from "./seat-map-selection-modal";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getSeatMapGridDataAction } from "@/lib/actions/organizer/seat-map-actions";
import type {
  SeatMapData,
  TicketingMode,
} from "../../../../../types/event-types";
import type { ShowingWithAreas } from "@/types/showings";

interface TicketingStepProps {
  ticketingMode: TicketingMode;
  setTicketingMode: (mode: TicketingMode) => void;
  seatMapData: SeatMapData | null;
  setSeatMapData: (data: SeatMapData | null) => void;
  showings: ShowingWithAreas[];
  hasSeatMapChanges?: boolean | null | "";
}

export function TicketingStep({
  ticketingMode,
  setTicketingMode,
  seatMapData,
  setSeatMapData,
  showings,
  hasSeatMapChanges = false,
}: TicketingStepProps) {
  const t = useTranslations("organizer-dashboard.CreateEvent.ticketing");

  // ✅ Modal state managed locally - only affects UI
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);

  // ✅ Handle seat map selection
  const handleSeatMapSelect = async (seatMap: SeatMapData) => {
    try {
      const result = await getSeatMapGridDataAction(seatMap.id);

      if (result.success && result.data) {
        const enrichedSeatMap: SeatMapData = {
          ...seatMap,
          grids: result.data.gridData?.grids || [],
          defaultSeatSettings:
            result.data.gridData?.defaultSeatSettings || undefined,
        };

        setSeatMapData(enrichedSeatMap);
        setShowSeatMapModal(false);
      } else {
        console.error("Failed to load seat map data:", result.error);
        toast.error(result.error || t("failedLoadSeatMap"));
      }
    } catch (error) {
      console.error("Error processing seat map:", error);
      toast.error(t("seatMapLoadError"));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
        {t("title")}
      </h2>

      {/* Seat Map Changes Warning */}
      {hasSeatMapChanges && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-xs sm:text-sm text-yellow-800 font-medium">
              {t("seatMapChangesWarning")}
            </span>
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        <Label className="text-sm sm:text-base font-medium">
          {t("chooseModeLabel")}
        </Label>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setTicketingMode("simple")}
            className={`flex-1 p-3 sm:p-4 border rounded-lg text-left transition-colors ${
              ticketingMode === "simple"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">
              {t("simpleMode.title")}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 leading-snug">
              {t("simpleMode.description")}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTicketingMode("seatmap")}
            className={`flex-1 p-3 sm:p-4 border rounded-lg text-left transition-colors ${
              ticketingMode === "seatmap"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">
              {t("seatMapMode.title")}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 leading-snug">
              {t("seatMapMode.description")}
            </div>
          </button>
        </div>
      </div>

      {/* Content based on selected mode */}
      <ShowingsTicketing
        ticketingMode={ticketingMode}
        showings={showings}
        seatMapData={seatMapData}
        setSeatMapData={setSeatMapData}
        onOpenSeatMapModal={() => setShowSeatMapModal(true)}
      />

      {/* Seat Map Selection Modal */}
      <SeatMapSelectionModal
        open={showSeatMapModal}
        onOpenChange={setShowSeatMapModal}
        onSelect={handleSeatMapSelect}
        onSetShowings={() => {}} // Not needed
        showings={showings}
        selectedSeatMapId={seatMapData?.id}
        selectedSeatMapData={seatMapData}
      />

      {/* Hidden input for ticketing mode */}
      <input type="hidden" name="ticketingMode" value={ticketingMode} />
    </div>
  );
}
