"use client";

import React, { useState } from "react";
import { Grid3X3, DollarSign, Users, Plus } from "lucide-react";
import {
  MdAlignHorizontalLeft,
  MdOutlineAlignHorizontalCenter,
  MdOutlineAlignHorizontalRight,
} from "react-icons/md";
import { RxValueNone } from "react-icons/rx";
import { SeatShape, GridShape, RowShape, SeatGridSettings } from "../../types";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";
import { ColorPicker } from "../inputs/color-picker";

interface GridPropertiesTabProps {
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
  onSelectAll: (gridId: string) => void;
  onExtractGrid: () => void;
  onAddRow: (gridId: string, seatsCount: number, rowName: string) => void;
}

export const GridPropertiesTab: React.FC<GridPropertiesTabProps> = ({
  selectionAnalysis,
  selectedShapes,
  onGridUpdate,
  onSelectAll,
  onExtractGrid,
  onAddRow,
}) => {
  const grid = selectionAnalysis.grid;
  const gridId = selectionAnalysis.gridId;
  const [newRowSeats, setNewRowSeats] = useState(10);
  const [newRowName, setNewRowName] = useState("");

  const totalSeats =
    selectionAnalysis.totalSeats ||
    grid.children.reduce(
      (sum: number, row: RowShape) => sum + row.children.length,
      0
    );

  const hasPartialSelection =
    selectionAnalysis.type === "single-row-seats" ||
    selectionAnalysis.type === "single-grid-seats" ||
    selectionAnalysis.type === "mixed-row-seats" ||
    selectionAnalysis.type === "single-row-container" ||
    selectionAnalysis.type === "multi-row-container";

  React.useEffect(() => {
    if (grid && grid.children.length > 0) {
      const lastRow = grid.children[grid.children.length - 1];
      const lastChar = lastRow.rowName.charCodeAt(0);
      const nextChar = String.fromCharCode(lastChar + 1);
      setNewRowName(nextChar);
    } else {
      setNewRowName("A");
    }
  }, [grid]);

  const handleAddRow = () => {
    if (newRowSeats > 0 && newRowName.trim()) {
      onAddRow(gridId, newRowSeats, newRowName.trim());
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
        <Grid3X3 className="w-4 h-4 text-blue-400" />
        <span>Grid Properties ({totalSeats} seats)</span>
      </div>

      {/* Add Row Section */}
      <div className="flex flex-col gap-2 mb-6">
        <button
          onClick={handleAddRow}
          className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
        >
          Add Row
        </button>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Row Name</label>
            <input
              type="text"
              value={newRowName}
              onChange={(e) => setNewRowName(e.target.value)}
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
              placeholder="A"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Seats</label>
            <input
              type="number"
              min="1"
              max="50"
              value={newRowSeats}
              onChange={(e) => setNewRowSeats(parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
        </div>
      </div>

      {/* Grid Actions */}
      {hasPartialSelection && (
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={onExtractGrid}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors text-left"
          >
            Extract Selected to New Grid
          </button>
          <button
            onClick={() => onSelectAll(gridId)}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors text-left"
          >
            Select All Seats in Grid
          </button>
        </div>
      )}

      {/* Grid Name */}
      <div>
        <label className="block text-sm font-medium mb-1">Grid Name</label>
        <DebouncedTextarea
          value={grid.gridName}
          onChange={() => {}}
          onUpdate={(value) => onGridUpdate(gridId, { name: value })}
          rows={1}
          className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
        />
      </div>

      {/* Grid Price */}
      <div>
        <label className="block text-sm font-medium mb-1 flex items-center">
          <DollarSign className="w-4 h-4 mr-1 text-green-400" />
          Base Price per Seat
        </label>
        <DebouncedInput
          type="number"
          min="0"
          step="0.01"
          value={grid.seatSettings.price}
          onChange={() => {}}
          onUpdate={(value) =>
            onGridUpdate(gridId, {
              seatSettings: { ...grid.seatSettings, price: value },
            })
          }
          isFloat={true}
          className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
        />
      </div>

      {/* Grid Spacing */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Spacing Settings</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">
              Row Spacing
            </label>
            <DebouncedInput
              type="number"
              min="15"
              max="150"
              value={grid.seatSettings.rowSpacing}
              onChange={() => {}}
              onUpdate={(value) =>
                onGridUpdate(gridId, {
                  seatSettings: { ...grid.seatSettings, rowSpacing: value },
                })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Seat Spacing
            </label>
            <DebouncedInput
              type="number"
              min="10"
              max="100"
              value={grid.seatSettings.seatSpacing}
              onChange={() => {}}
              onUpdate={(value) =>
                onGridUpdate(gridId, {
                  seatSettings: { ...grid.seatSettings, seatSpacing: value },
                })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
