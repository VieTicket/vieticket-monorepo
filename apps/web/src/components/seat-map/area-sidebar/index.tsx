"use client";

import React, { useState } from "react";
import { useAreaMode } from "../store/main-store";
import { Badge } from "../../ui/badge";
import { Settings } from "lucide-react";
import { AreaSidebarTabs } from "./area-sidebar-tabs";
import { AreaSidebarHeader } from "./area-sidebar-header";
import { MergeConfirmModal } from "./merge-confirm-modal";
import { useAreaSidebarLogic } from "./use-area-sidebar-logic";
import { AreaSettingsCard } from "./area-settings-card";

interface AreaSidebarProps {
  inSidebar?: boolean;
}

const AreaSidebar = React.memo(function AreaSidebar({
  inSidebar = false,
}: AreaSidebarProps) {
  const { isInAreaMode, selectedRowIds, selectedSeatIds } = useAreaMode();
  const [activeTab, setActiveTab] = useState<
    "properties" | "style" | "transform"
  >("properties");
  const [isMerging, setIsMerging] = useState(false);

  const {
    selectedRows,
    selectedSeats,
    totalSelected,
    selectionType,
    batchValues,
    singleRow,
    singleSeat,
    handlers,
  } = useAreaSidebarLogic();

  if (!isInAreaMode || totalSelected === 0) {
    return (
      <div className="bg-gray-900 text-white p-4 shadow z-10 w-full h-full">
        <AreaSidebarHeader
          isInAreaMode={isInAreaMode}
          totalSelected={totalSelected}
          selectionType={selectionType as "rows" | "seats"}
        />
        <div className="text-center text-gray-400 py-12">
          <AreaSettingsCard handlers={handlers} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-4 shadow z-10 w-full h-full overflow-y-auto">
      <AreaSidebarHeader
        isInAreaMode={isInAreaMode}
        totalSelected={totalSelected}
        selectionType={selectionType as "rows" | "seats"}
      />

      <AreaSidebarTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedRows={selectedRows}
        selectedSeats={selectedSeats}
        singleRow={singleRow}
        singleSeat={singleSeat}
        batchValues={batchValues}
        handlers={handlers}
        setIsMerging={setIsMerging}
      />

      <MergeConfirmModal
        isOpen={isMerging}
        onClose={() => setIsMerging(false)}
        totalSelected={totalSelected}
        selectionType={selectionType as "rows" | "seats"}
        selectedRows={selectedRows}
        selectedSeats={selectedSeats}
        handlers={handlers}
      />
    </div>
  );
});

export default AreaSidebar;
