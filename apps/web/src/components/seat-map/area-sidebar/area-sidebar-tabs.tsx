import React from "react";
import { PropertiesTab } from "./properties-tab";
import { StyleTab } from "./style-tab";
import { TransformTab } from "./transform-tab";
import { AreaSettingsCard } from "./area-settings-card";
import { ActionButtonsCard } from "./action-buttons-card";
import { SelectionSummaryCard } from "./selection-summary-card";
import { RowShape, SeatShape } from "@/types/seat-map-types";

interface AreaSidebarTabsProps {
  activeTab: "properties" | "style" | "transform";
  setActiveTab: (tab: "properties" | "style" | "transform") => void;
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
  singleRow: RowShape | null;
  singleSeat: SeatShape | null;
  batchValues: Record<string, any>;
  handlers: any;
  setIsMerging: (value: boolean) => void;
}

export function AreaSidebarTabs({
  activeTab,
  setActiveTab,
  selectedRows,
  selectedSeats,
  singleRow,
  singleSeat,
  batchValues,
  handlers,
  setIsMerging,
}: AreaSidebarTabsProps) {
  const totalSelected = selectedRows.length + selectedSeats.length;

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 text-white mb-4">
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "properties"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("properties")}
        >
          Properties
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "style"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("style")}
        >
          Style
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "transform"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("transform")}
        >
          Transform
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "properties" && (
          <PropertiesTab
            selectedRows={selectedRows}
            selectedSeats={selectedSeats}
            singleRow={singleRow}
            singleSeat={singleSeat}
            batchValues={batchValues}
            handlers={handlers}
          />
        )}

        {activeTab === "style" && (
          <StyleTab
            selectedRows={selectedRows}
            selectedSeats={selectedSeats}
            singleRow={singleRow}
            singleSeat={singleSeat}
            batchValues={batchValues}
            handlers={handlers}
          />
        )}

        {activeTab === "transform" && (
          <TransformTab
            selectedRows={selectedRows}
            selectedSeats={selectedSeats}
            singleRow={singleRow}
            singleSeat={singleSeat}
            batchValues={batchValues}
            handlers={handlers}
          />
        )}

        <ActionButtonsCard
          totalSelected={totalSelected}
          selectedRows={selectedRows}
          selectedSeats={selectedSeats}
          handlers={handlers}
          setIsMerging={setIsMerging}
        />

        <SelectionSummaryCard
          selectedRows={selectedRows}
          selectedSeats={selectedSeats}
        />
      </div>
    </>
  );
}
