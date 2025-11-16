"use client";

import React from "react";
import { useSeatMapStore } from "../store/seat-map-store";
import { DefaultProperties } from "./sidebar/default-properties";
import { SingleItemProperties } from "./sidebar/single-item-properties";
import { AreaModeProperties } from "./sidebar/area-mode-properties";
import { GridShape, RowShape, SeatShape } from "../types";
import { isAreaMode } from "../variables";

export const PropertiesSidebar = React.memo(() => {
  const selectedItems = useSeatMapStore((state) => state.selectedShapes);

  const renderPropertiesPanel = () => {
    if (selectedItems.length === 0) {
      return <DefaultProperties />;
    }
    if (isAreaMode && selectedItems.length > 0) {
      // Filter for area mode compatible shapes: SeatShape, RowShape, or GridShape
      const areaModeShapes = selectedItems.filter(
        (shape): shape is SeatShape | GridShape | RowShape =>
          // SeatShape check
          (shape.type === "ellipse" && "gridId" in shape && "rowId" in shape) ||
          // GridShape check
          (shape.type === "container" &&
            "gridName" in shape &&
            "seatSettings" in shape) ||
          // RowShape check
          (shape.type === "container" &&
            "rowName" in shape &&
            "gridId" in shape &&
            "labelPlacement" in shape)
      );

      // If all selected items are area mode compatible, use area mode properties
      if (
        areaModeShapes.length === selectedItems.length &&
        areaModeShapes.length > 0
      ) {
        return <AreaModeProperties selectedShapes={areaModeShapes} />;
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
