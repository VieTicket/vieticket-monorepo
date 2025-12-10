"use client";

import React, { useState } from "react";
import {
  Hash,
  Rows3,
  Users,
  Plus,
  ArrowLeftRight,
  ListOrdered,
} from "lucide-react";
import {
  MdAlignHorizontalLeft,
  MdOutlineAlignHorizontalCenter,
  MdOutlineAlignHorizontalRight,
} from "react-icons/md";
import { RxValueNone } from "react-icons/rx";
import { SeatShape, GridShape, RowShape, SeatGridSettings } from "../../types";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";

interface RowPropertiesTabProps {
  selectionAnalysis: any;
  selectedShapes: (SeatShape | GridShape | RowShape)[];
  onRowUpdate: (
    gridId: string,
    rowId: string,
    updates: {
      name?: string;
      seatSpacing?: number;
      labelPlacement?: "left" | "middle" | "right" | "none";
    }
  ) => void;
  onGridUpdate: (
    gridId: string,
    updates: {
      name?: string;
      seatSettings?: Partial<SeatGridSettings>;
      labelPlacement?: "left" | "middle" | "right" | "none";
    }
  ) => void;
  onMultipleRowUpdate: (updates: {
    name?: string;
    seatSpacing?: number;
    labelPlacement?: "left" | "middle" | "right" | "none";
  }) => void;
  onSelectAll: (rowId: string) => void;
  // ✅ Updated to accept arrays
  onAddSeatToRow: (gridId: string, rowIds: string[], count: number) => void;
  onRenameRowSequence: (
    gridId: string,
    rowIds: string[],
    startLetter: string
  ) => void;
}

export const RowPropertiesTab: React.FC<RowPropertiesTabProps> = ({
  selectionAnalysis,
  selectedShapes,
  onRowUpdate,
  onGridUpdate,
  onMultipleRowUpdate,
  onSelectAll,
  onAddSeatToRow,
  onRenameRowSequence,
}) => {
  const [seatsToAdd, setSeatsToAdd] = useState(1);
  const [startLetter, setStartLetter] = useState("A");
  const [applyToAllRows, setApplyToAllRows] = useState(false);

  // ✅ Selected row for manipulation tools (can be any single row from selection)
  const [selectedRowForTools, setSelectedRowForTools] = useState<string | null>(
    null
  );

  if (!selectionAnalysis.grid || !selectionAnalysis.gridId) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">No row selected</div>
        <div className="text-xs text-gray-400 mt-2">
          Select rows or seats from the same grid
        </div>
      </div>
    );
  }

  const { grid, gridId } = selectionAnalysis;
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

  // ✅ Determine which row to use for manipulation tools
  const toolsRow =
    isSingleRow && row
      ? row
      : rows.length > 0 && selectedRowForTools
        ? rows.find((r) => r.id === selectedRowForTools) || rows[0]
        : rows[0] || null;

  const toolsRowId = toolsRow?.id;

  // ✅ Auto-select first row if none selected
  React.useEffect(() => {
    if (rows.length > 0 && !selectedRowForTools) {
      setSelectedRowForTools(rows[0].id);
    }
  }, [rows, selectedRowForTools]);

  const getTargetRowIds = (): string[] => {
    console.log("getTargetRowIds called", isSingleRow, rowId, toolsRowId);
    if (rows.length > 0) {
      return rows.map((r) => r.id);
    }
    if (isSingleRow && rowId) {
      return [rowId];
    }
    if (toolsRowId) {
      return [toolsRowId];
    }
    return [];
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
        <Rows3 className="w-4 h-4 text-green-400" />
        <span>Row Properties ({rows.length})</span>
      </div>

      {/* ✅ Add Seats Section */}
      {(toolsRow || applyToAllRows) && (
        <div>
          <h4 className="text-sm font-semibold gap-2 flex items-center mb-2">
            <div>Add</div>
            <input
              type="number"
              min="1"
              max="20"
              value={seatsToAdd}
              onChange={(e) => setSeatsToAdd(parseInt(e.target.value) || 1)}
              className="w-15 px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
              placeholder="Count"
            />
            <div>Seats to Row</div>
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() =>
                onAddSeatToRow(gridId, getTargetRowIds(), seatsToAdd)
              }
              className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* ✅ Row Labeling Tools */}
      {(toolsRow || applyToAllRows) && (
        <div>
          {/* Continue Row Labeling */}
          <div className="mt-4">
            <label className="block text-md font-medium mb-2">
              Sequential Row Naming
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={1}
                value={startLetter}
                onChange={(e) => setStartLetter(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white uppercase"
                placeholder="A"
              />
              <button
                onClick={() =>
                  onRenameRowSequence(gridId, getTargetRowIds(), startLetter)
                }
                className="px-4 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Name - Only for single row */}
      {isSingleRow && row && rowId && (
        <div>
          <label className="block text-sm font-medium mb-1">Row Name</label>
          <DebouncedTextarea
            value={row.rowName}
            onChange={() => {}}
            onUpdate={(value) => onRowUpdate(gridId, rowId, { name: value })}
            rows={1}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
          />
        </div>
      )}

      {/* Row Label Placement */}
      {(isSingleRow || isMultipleRows) && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Row Label Placement{isMultipleRows ? " (All)" : ""}
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() =>
                isSingleRow && rowId
                  ? onRowUpdate(gridId, rowId, { labelPlacement: "left" })
                  : onGridUpdate(gridId, { labelPlacement: "left" })
              }
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isSingleRow && row && row.labelPlacement === "left"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <MdAlignHorizontalLeft className="mx-auto" />
            </button>
            <button
              onClick={() =>
                isSingleRow && rowId
                  ? onRowUpdate(gridId, rowId, { labelPlacement: "middle" })
                  : onGridUpdate(gridId, { labelPlacement: "middle" })
              }
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isSingleRow && row && row.labelPlacement === "middle"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <MdOutlineAlignHorizontalCenter className="mx-auto" />
            </button>
            <button
              onClick={() =>
                isSingleRow && rowId
                  ? onRowUpdate(gridId, rowId, { labelPlacement: "right" })
                  : onGridUpdate(gridId, { labelPlacement: "right" })
              }
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isSingleRow && row && row.labelPlacement === "right"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <MdOutlineAlignHorizontalRight className="mx-auto" />
            </button>
            <button
              onClick={() =>
                isSingleRow && rowId
                  ? onRowUpdate(gridId, rowId, { labelPlacement: "none" })
                  : onGridUpdate(gridId, { labelPlacement: "none" })
              }
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isSingleRow && row && row.labelPlacement === "none"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <RxValueNone className="mx-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Seat Spacing Override */}
      {(isSingleRow || isMultipleRows) && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Seat Spacing Override{isMultipleRows ? " (All Rows)" : ""}
            <span className="text-xs text-gray-400 ml-1">
              (Grid default: {grid.seatSettings.seatSpacing}px)
            </span>
          </label>
          <DebouncedInput
            type="number"
            min="10"
            max="100"
            value={
              isSingleRow && row
                ? row.seatSpacing || grid.seatSettings.seatSpacing
                : grid.seatSettings.seatSpacing
            }
            onChange={() => {}}
            onUpdate={(value) =>
              isSingleRow && rowId
                ? onRowUpdate(gridId, rowId, { seatSpacing: value })
                : onMultipleRowUpdate({ seatSpacing: value })
            }
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
          />
        </div>
      )}

      {/* Info message when grid is selected */}
      {selectionAnalysis.type === "single-grid-container" && (
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-400">
            Grid contains {grid.children.length} rows with {totalSeats} total
            seats
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Use the dropdown above to select a row for manipulation tools
          </div>
        </div>
      )}
    </div>
  );
};
