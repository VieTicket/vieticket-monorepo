"use client";

import React from "react";
import { useSeatMapStore } from "../store/seat-map-store";
import { DefaultProperties } from "./sidebar/default-properties";
import { SingleItemProperties } from "./sidebar/single-item-properties";
import { AreaModeProperties } from "./sidebar/area-mode-properties";
import { SeatShape } from "../types";
import { isAreaMode } from "../variables";

export const PropertiesSidebar = React.memo(() => {
  const selectedItems = useSeatMapStore((state) => state.selectedShapes);

  const renderPropertiesPanel = () => {
    if (selectedItems.length === 0) {
      return <DefaultProperties />;
    }

    // ✅ Area Mode Logic: Check if all selected items are seats
    if (isAreaMode && selectedItems.length > 0) {
      const seatShapes = selectedItems.filter(
        (shape): shape is SeatShape =>
          shape.type === "ellipse" && "gridId" in shape && "rowId" in shape
      );

      // If all selected items are seats, use area mode properties
      if (seatShapes.length === selectedItems.length) {
        return <AreaModeProperties selectedShapes={seatShapes} />;
      }
    }

    if (selectedItems.length === 1) {
      return <SingleItemProperties item={selectedItems[0]} />;
    }

    return (
      <div className="p-4">
        <div className="text-sm text-gray-600 mb-4">
          {selectedItems.length} items selected
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 z-10 flex flex-col text-white">
      <div className="flex border-b border-gray-700">
        <button className="flex-1 px-4 py-2 text-md font-semibold">
          Properties
        </button>
      </div>
      <div
        className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-gray-900
              [&::-webkit-scrollbar-track]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-gray-700
              [&::-webkit-scrollbar-thumb]:rounded-full
              dark:[&::-webkit-scrollbar-track]:bg-neutral-700
              dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
      >
        {renderPropertiesPanel()}
      </div>
    </div>
  );
});

PropertiesSidebar.displayName = "PropertiesSidebar";
