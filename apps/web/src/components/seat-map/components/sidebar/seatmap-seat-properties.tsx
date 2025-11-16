import React, { useCallback } from "react";
import { areaModeContainer } from "../../variables";
import { DebouncedInput } from "../inputs/debounced-input";
import { useSeatMapStore } from "../../store/seat-map-store";
import { SeatGridSettings } from "../../types";
import { ColorPicker } from "../inputs/color-picker";
import { setSeatGridSettings } from "../../shapes/grid-shape";

export const SeatMapSeatSettings = () => {
  const shapes = useSeatMapStore((state) => state.shapes);
  const updateShapes = useSeatMapStore((state) => state.updateShapes);

  // ✅ Handle seat grid settings updates
  const handleSeatGridSettingsUpdate = useCallback(
    (updates: Partial<SeatGridSettings>) => {
      if (!areaModeContainer) return;

      // Update the default settings
      setSeatGridSettings(updates);
    },
    [shapes, updateShapes]
  );

  return (
    areaModeContainer && (
      <div className="rounded-lg px-4 space-y-4 flex-1">
        <h4 className="text-sm font-semibold border-b border-gray-700 pb-2">
          Default Seat Settings
        </h4>

        {/* Default Price */}
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-300 flex items-center">
            Price per Seat (VND)
          </label>
          <DebouncedInput
            type="number"
            min="0"
            step="0.01"
            value={areaModeContainer.defaultSeatSettings.price || 0}
            onChange={() => {}}
            onUpdate={(value) => handleSeatGridSettingsUpdate({ price: value })}
            isFloat={true}
            className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
          />
        </div>

        {/* Spacing Settings */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Seat Spacing
              </label>
              <DebouncedInput
                type="number"
                min="10"
                max="100"
                value={areaModeContainer.defaultSeatSettings.seatSpacing}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleSeatGridSettingsUpdate({ seatSpacing: value })
                }
                className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Row Spacing
              </label>
              <DebouncedInput
                type="number"
                min="15"
                max="150"
                value={areaModeContainer.defaultSeatSettings.rowSpacing}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleSeatGridSettingsUpdate({ rowSpacing: value })
                }
                className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
              />
            </div>
          </div>

          {/* Seat Appearance */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-300">
              Seat Radius
            </label>
            <DebouncedInput
              type="number"
              min="3"
              max="20"
              value={areaModeContainer.defaultSeatSettings.seatRadius}
              onChange={() => {}}
              onUpdate={(value) =>
                handleSeatGridSettingsUpdate({ seatRadius: value })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
            />
          </div>

          {/* Seat Colors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Seat Color
              </label>
              <ColorPicker
                value={areaModeContainer.defaultSeatSettings.seatColor}
                onChange={(color) =>
                  handleSeatGridSettingsUpdate({ seatColor: color })
                }
                compact={true}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-300">
                Stroke Color
              </label>
              <ColorPicker
                value={areaModeContainer.defaultSeatSettings.seatStrokeColor}
                onChange={(color) =>
                  handleSeatGridSettingsUpdate({ seatStrokeColor: color })
                }
                compact={true}
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-300">
              Stroke Width
            </label>
            <DebouncedInput
              type="number"
              min="0"
              max="5"
              step="0.5"
              value={areaModeContainer.defaultSeatSettings.seatStrokeWidth}
              onChange={() => {}}
              onUpdate={(value) =>
                handleSeatGridSettingsUpdate({ seatStrokeWidth: value })
              }
              isFloat={true}
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-700 text-white"
            />
          </div>
        </div>
      </div>
    )
  );
};
