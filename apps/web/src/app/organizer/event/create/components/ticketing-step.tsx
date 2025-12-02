"use client";

import { Label } from "@/components/ui/label";
import { ShowingsTicketing } from "./showings-ticketing";
import { useTranslations } from "next-intl";
import type {
  Area,
  SeatMapData,
  SeatMapPreviewData,
  TicketingMode,
} from "../../../../../types/event-types";
import type { ShowingFormData, ShowingWithAreas } from "@/types/showings";

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
  showings: ShowingWithAreas[];
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
  showings,
  hasSeatMapChanges = false,
}: TicketingStepProps) {
  const t = useTranslations("organizer-dashboard.CreateEvent.ticketing");
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t("title")}</h2>

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
        <Label className="text-sm sm:text-base font-medium">{t("chooseModeLabel")}</Label>
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
            <div className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">{t("simpleMode.title")}</div>
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
            <div className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">{t("seatMapMode.title")}</div>
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
        areas={areas}
        setAreas={setAreas}
        selectedSeatMap={selectedSeatMap}
        setSelectedSeatMap={setSelectedSeatMap}
        selectedSeatMapData={selectedSeatMapData}
        setSelectedSeatMapData={setSelectedSeatMapData}
        seatMapPreviewData={seatMapPreviewData}
        setSeatMapPreviewData={setSeatMapPreviewData}
        setShowSeatMapModal={setShowSeatMapModal}
      />

      {/* Hidden input for ticketing mode */}
      <input type="hidden" name="ticketingMode" value={ticketingMode} />
    </div>
  );
}
