"use client";

import React, { useState } from "react";
import { ArrowLeftRight, Circle as CircleIcon } from "lucide-react";
import { SeatShape, GridShape, RowShape, SeatGridSettings } from "../../types";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";
import { ColorPicker } from "../inputs/color-picker";
import { formatNumber } from "../utils/number-utils";

interface SeatPropertiesTabProps {
  selectionAnalysis: any;
  selectedShapes: (SeatShape | GridShape | RowShape)[];
  onGridUpdate: (
    gridId: string,
    updates: {
      name?: string;
      seatSettings?: Partial<SeatGridSettings>;
      labelPlacement?: "left" | "middle" | "right" | "none";
    }
  ) => void;

  onReverseRowLabels: (gridId: string, rowIds: string[]) => void;
  onRenumberSeats: (
    gridId: string,
    rowIds: string[],
    startNumber: number,
    step: number
  ) => void;
  onSeatUpdate: (updates: Partial<SeatShape>) => void;
}

export const SeatPropertiesTab: React.FC<SeatPropertiesTabProps> = ({
  selectionAnalysis,
  selectedShapes,
  onGridUpdate,
  onSeatUpdate,

  onReverseRowLabels,
  onRenumberSeats,
}) => {
  const [startNumber, setStartNumber] = useState(1);
  const [numberingStep, setNumberingStep] = useState(1);
  const seats = selectionAnalysis.seats || [];
  const isSingleSeatSelected = seats.length === 1;
  const grid = selectionAnalysis.grid;
  const gridId = selectionAnalysis.gridId;

  const seat = seats[0];
  let row: RowShape | null = null;
  let rows: RowShape[] = [];
  let isMultipleRows = false;
  let isSingleRow = false;
  let selectedSeatCount = 0;
  let totalSeats = 0;
  let hasPartialSelection = false;

  switch (selectionAnalysis.type) {
    case "single-row-container":
      row = selectionAnalysis.row;
      isSingleRow = true;
      totalSeats = row?.children.length || 0;
      rows = row ? [row] : [];
      break;

    case "multi-row-container":
      rows = selectionAnalysis.rows || [];
      isMultipleRows = true;
      totalSeats = rows.reduce(
        (sum: number, r: RowShape) => sum + r.children.length,
        0
      );
      break;

    case "single-row-seats":
      row = selectionAnalysis.row;
      isSingleRow = true;
      selectedSeatCount = selectionAnalysis.seats?.length || 0;
      totalSeats = row?.children.length || 0;
      hasPartialSelection = selectedSeatCount < totalSeats;
      rows = row ? [row] : [];
      break;

    case "single-grid-seats":
      const seats = selectionAnalysis.seats || [];
      selectedSeatCount = seats.length;
      const rowIds = [...new Set(seats.map((s: SeatShape) => s.rowId))];
      console.log("single-grid-seats - rowIds:", rowIds);
      if (rowIds.length === 1) {
        row = grid.children.find((r: RowShape) => r.id === rowIds[0]) || null;
        isSingleRow = true;
        totalSeats = row?.children.length || 0;
        hasPartialSelection = selectedSeatCount < totalSeats;
        rows = row ? [row] : [];
      } else {
        rows = grid.children.filter((r: RowShape) => rowIds.includes(r.id));
        isMultipleRows = true;
        totalSeats = rows.reduce(
          (sum: number, r: RowShape) => sum + r.children.length,
          0
        );
        hasPartialSelection = selectedSeatCount < totalSeats;
      }
      break;

    case "mixed-row-seats":
      rows = selectionAnalysis.rows || [];
      selectedSeatCount = selectionAnalysis.seats?.length || 0;
      isMultipleRows = rows.length > 0;
      if (rows.length === 1) {
        row = rows[0];
        isSingleRow = true;
        isMultipleRows = false;
      }
      totalSeats = rows.reduce(
        (sum: number, r: RowShape) => sum + r.children.length,
        0
      );
      hasPartialSelection = selectedSeatCount < totalSeats;
      break;

    case "single-grid-container":
      totalSeats = grid.children.reduce(
        (sum: number, r: RowShape) => sum + r.children.length,
        0
      );
      // ✅ Still allow access to all rows in the grid for tools
      rows = grid.children;
      break;
  }

  const rowId = row?.id;
  const getTargetRowIds = (): string[] => {
    if (rows.length > 0) {
      return rows.map((r) => r.id);
    }
    if (isSingleRow && rowId) {
      return [rowId];
    }
    return [];
  };
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
        <CircleIcon className="w-4 h-4 text-purple-400" />
        <span>Seat Properties</span>
      </div>
      <div className="mt-4">
        <label className="block text-md font-medium mb-2">
          Custom Seat Numbering
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Start Number
            </label>
            <input
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Step (+)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={numberingStep}
              onChange={(e) => setNumberingStep(parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
        </div>
        <button
          onClick={() =>
            onRenumberSeats(
              gridId,
              getTargetRowIds(),
              startNumber,
              numberingStep
            )
          }
          className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
        >
          Apply Custom Numbering
        </button>
        <button
          onClick={() => onReverseRowLabels(gridId, getTargetRowIds())}
          className="w-full mt-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Reverse Seat Numbers
        </button>
      </div>
      {/* Seat Name */}
      {isSingleSeatSelected && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seat Name</label>
            <DebouncedTextarea
              value={seat.name}
              onChange={() => {}}
              onUpdate={(value) => onSeatUpdate({ name: value })}
              rows={1}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
              placeholder="Enter seat name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Position</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">
                  X Position
                </label>
                <DebouncedInput
                  type="number"
                  step="0.1"
                  value={parseFloat(formatNumber(seat.x, true))}
                  onChange={() => {}}
                  onUpdate={(value) => onSeatUpdate({ x: value })}
                  isFloat={true}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Y Position
                </label>
                <DebouncedInput
                  type="number"
                  step="0.1"
                  value={parseFloat(formatNumber(seat.y, true))}
                  onChange={() => {}}
                  onUpdate={(value) => onSeatUpdate({ y: value })}
                  isFloat={true}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seat Appearance */}
      {grid && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Seat Radius
            </label>
            <DebouncedInput
              type="number"
              min="3"
              max="20"
              value={grid.seatSettings.seatRadius}
              onChange={() => {}}
              onUpdate={(value) =>
                onGridUpdate(gridId, {
                  seatSettings: { ...grid.seatSettings, seatRadius: value },
                })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">
                Seat Color
              </label>
              <ColorPicker
                value={grid.seatSettings.seatColor}
                onChange={(color) =>
                  onGridUpdate(gridId, {
                    seatSettings: { ...grid.seatSettings, seatColor: color },
                  })
                }
                compact={true}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Stroke Color
              </label>
              <ColorPicker
                value={grid.seatSettings.seatStrokeColor}
                onChange={(color) =>
                  onGridUpdate(gridId, {
                    seatSettings: {
                      ...grid.seatSettings,
                      seatStrokeColor: color,
                    },
                  })
                }
                compact={true}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Stroke Width
            </label>
            <DebouncedInput
              type="number"
              min="0"
              max="5"
              step="0.5"
              value={grid.seatSettings.seatStrokeWidth}
              onChange={() => {}}
              onUpdate={(value) =>
                onGridUpdate(gridId, {
                  seatSettings: {
                    ...grid.seatSettings,
                    seatStrokeWidth: value,
                  },
                })
              }
              isFloat={true}
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
