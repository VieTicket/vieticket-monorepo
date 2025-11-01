"use client";

import React, { memo } from "react";
import { areaModeContainer, isAreaMode } from "../../variables";
import { SeatMapProperties } from "./seatmap-properties";
import { SeatMapSeatSettings } from "./seatmap-seat-properties";

export const DefaultProperties = memo(() => {
  return (
    <div className="flex flex-col space-y-6 h-full">
      {/* Seat Map Settings */}
      <SeatMapProperties />
      {/* Area Mode Settings - Only show if area mode is available */}
      <SeatMapSeatSettings />

      {/* Instructions */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Quick Tips</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Select shapes to edit their properties</li>
          <li>• Use Ctrl+Click to multi-select</li>
          <li>• Drag shapes to move them around</li>
          {isAreaMode && <li>• Create seat grids by dragging in area mode</li>}
          <li>• Right-click for context menu options</li>
          {areaModeContainer && (
            <li>• Click grids/rows in Area List to select them</li>
          )}
        </ul>
      </div>
    </div>
  );
});

DefaultProperties.displayName = "DefaultProperties";
