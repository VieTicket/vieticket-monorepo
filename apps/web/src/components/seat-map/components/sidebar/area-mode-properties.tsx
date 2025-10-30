"use client";

import React, { useMemo } from "react";
import {
  Grid3X3,
  Hash,
  Circle as CircleIcon,
  DollarSign,
  Split,
} from "lucide-react";
import { AreaModeContainer, SeatShape, GridData, RowData } from "../../types";
import { cloneCanvasItem, useSeatMapStore } from "../../store/seat-map-store";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";
import { ColorPicker } from "../inputs/color-picker";
import { areaModeContainer } from "../../variables";
import {
  getGridById,
  getRowById,
  setRowBend,
  updateGridSettings,
  updateRowSettings,
  getSeatsByRowId,
  getSeatsByGridId,
  createNewGridFromSelection,
  selectSeatsInRow,
  selectSeatsInGrid,
} from "../../shapes/seats";
import { getSelectionTransform } from "../../events/transform-events";
import { formatNumber, parseNumber } from "../utils/number-utils";

interface AreaModePropertiesProps {
  selectedShapes: SeatShape[];
}

export const AreaModeProperties = React.memo(
  ({ selectedShapes }: AreaModePropertiesProps) => {
    const updateShapes = useSeatMapStore((state) => state.updateShapes);
    const shapes = useSeatMapStore((state) => state.shapes);

    const selectionAnalysis = useMemo(() => {
      if (!areaModeContainer || selectedShapes.length === 0) {
        return { type: "none" };
      }

      const firstSeat = selectedShapes[0];
      const allSameGrid = selectedShapes.every(
        (seat) => seat.gridId === firstSeat.gridId
      );
      const allSameRow = selectedShapes.every(
        (seat) => seat.rowId === firstSeat.rowId
      );

      if (allSameRow && allSameGrid) {
        return {
          type: "single-row",
          gridId: firstSeat.gridId,
          rowId: firstSeat.rowId,
          grid: getGridById(firstSeat.gridId),
          row: getRowById(firstSeat.gridId, firstSeat.rowId),
        };
      } else if (allSameGrid) {
        return {
          type: "single-grid",
          gridId: firstSeat.gridId,
          grid: getGridById(firstSeat.gridId),
        };
      } else {
        return {
          type: "mixed",
        };
      }
    }, [selectedShapes]);

    const handleGridUpdate = (gridId: string, updates: Partial<GridData>) => {
      if (!areaModeContainer) return;
      const gridIndex = areaModeContainer.grids.findIndex(
        (g) => g.id === gridId
      );
      if (gridIndex === -1) return;
      const before = cloneCanvasItem(areaModeContainer);

      Object.assign(areaModeContainer.grids[gridIndex], updates);

      if (updates.seatSettings) {
        updateGridSettings(gridId, updates.seatSettings);
      }

      updateShapes([...shapes], false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(areaModeContainer.children);
      }

      const after = cloneCanvasItem(areaModeContainer);
      useSeatMapStore.getState().saveDirectHistory([before], [after]);
    };

    const handleRowUpdate = (
      gridId: string,
      rowId: string,
      updates: Partial<RowData>
    ) => {
      if (!areaModeContainer) return;

      const grid = areaModeContainer.grids.find((g) => g.id === gridId);
      if (!grid) return;

      const rowIndex = grid.rows.findIndex((r) => r.id === rowId);
      if (rowIndex === -1) return;
      const before = cloneCanvasItem(areaModeContainer);

      Object.assign(grid.rows[rowIndex], updates);

      if (updates.bend !== undefined) {
        setRowBend(rowId, updates.bend);
      }

      if (updates.seatSpacing !== undefined) {
        const rowSeats = selectedShapes.filter((seat) => seat.rowId === rowId);
        rowSeats.sort((a, b) => a.x - b.x);

        rowSeats.forEach((seat, index) => {
          const newX = rowSeats[0].x + index * updates.seatSpacing!;
          seat.x = newX;
          seat.graphics.position.set(newX, seat.y);
        });
      }
      updateShapes([...shapes], false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(areaModeContainer.children);
      }

      const after = cloneCanvasItem(areaModeContainer);

      useSeatMapStore.getState().saveDirectHistory([before], [after]);
    };

    // ✅ Enhanced seat update function with change detection
    const handleSeatUpdate = (updates: Partial<SeatShape>) => {
      if (!areaModeContainer || selectedShapes.length !== 1) return;

      const seat = selectedShapes[0];

      // ✅ Check if updates actually change anything
      const hasChanges = Object.entries(updates).some(([key, value]) => {
        return (seat as any)[key] !== value;
      });

      if (!hasChanges) {
        console.log("No changes detected in seat update, skipping...");
        return;
      }

      const before = cloneCanvasItem(areaModeContainer);

      Object.assign(seat, updates);

      // Update graphics position if needed
      if (updates.x !== undefined || updates.y !== undefined) {
        seat.graphics.position.set(seat.x, seat.y);
      }

      updateShapes([...shapes], false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(selectedShapes);
      }

      const after = cloneCanvasItem(areaModeContainer);
      useSeatMapStore.getState().saveDirectHistory([before], [after]);
    };

    if (selectionAnalysis.type === "none") {
      return (
        <div className="p-4 text-center text-gray-500">
          <CircleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">Select seats to edit properties</div>
        </div>
      );
    }

    if (selectionAnalysis.type === "mixed") {
      return (
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-4">
            Mixed selection ({selectedShapes.length} seats from different grids)
          </div>
          <div className="text-xs text-gray-500">
            Select seats from the same grid for specific editing options.
          </div>
        </div>
      );
    }

    if (
      selectionAnalysis.type === "single-row" &&
      selectionAnalysis.row &&
      selectionAnalysis.grid
    ) {
      const { row, grid, gridId, rowId } = selectionAnalysis;
      const isSingleSeatSelected = selectedShapes.length === 1;

      return (
        <div className="space-y-6">
          <div className="p-4 space-y-3 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-300 flex items-center">
              <Split className="w-4 h-4 mr-2" />
              Options
            </h4>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={createNewGridFromSelection}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-start space-x-2 transition-colors"
              >
                <span>Extract to New Grid</span>
              </button>
              <button
                onClick={() => selectSeatsInRow(rowId)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-start space-x-2 transition-colors"
              >
                <span>Select Seats in {row.name}</span>
              </button>
              <button
                onClick={() => selectSeatsInGrid(gridId)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-start space-x-2 transition-colors"
              >
                <span>Select All Seats in {grid.name}</span>
              </button>
            </div>
          </div>

          {/* ✅ Seat Properties Section - Only for single seat selection */}
          {isSingleSeatSelected && (
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
                <CircleIcon className="w-4 h-4 text-purple-400" />
                <span>Seat Properties</span>
              </div>

              {/* Seat Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Seat Name
                </label>
                <DebouncedTextarea
                  value={selectedShapes[0].name}
                  onChange={() => {}}
                  onUpdate={(value) => handleSeatUpdate({ name: value })}
                  rows={1}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
                  placeholder="Enter seat name..."
                />
              </div>

              {/* Seat Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    X Position
                  </label>
                  <DebouncedInput
                    type="number"
                    step="0.1"
                    value={parseFloat(formatNumber(selectedShapes[0].x, true))}
                    onChange={() => {}}
                    onUpdate={(value) => handleSeatUpdate({ x: value })}
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
                    value={parseFloat(formatNumber(selectedShapes[0].y, true))}
                    onChange={() => {}}
                    onUpdate={(value) => handleSeatUpdate({ y: value })}
                    isFloat={true}
                    className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                  />
                </div>
              </div>

              {/* Seat Info */}
              <div className="bg-gray-800 rounded p-3 text-xs">
                <div className="text-gray-400 mb-2">Seat Information</div>
                <div className="grid grid-cols-1 gap-1">
                  <div>
                    ID:{" "}
                    <span className="text-gray-300 font-mono">
                      {selectedShapes[0].id}
                    </span>
                  </div>
                  <div>
                    Grid: <span className="text-blue-300">{grid.name}</span>
                  </div>
                  <div>
                    Row: <span className="text-yellow-300">{row.name}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Visual properties (color, size, etc.) are inherited from grid
                settings to maintain consistency.
              </div>
            </div>
          )}

          {/* Row Properties Section */}
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
              <Hash className="w-4 h-4 text-yellow-400" />
              <span>Row Properties</span>
            </div>

            {/* Row Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Row Name</label>
              <DebouncedTextarea
                value={row.name || `Row ${grid.rows.indexOf(row) + 1}`}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleRowUpdate(gridId, rowId, { name: value })
                }
                rows={1}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
              />
            </div>

            {/* Row Seat Spacing Override */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Seat Spacing Override
                <span className="text-xs text-gray-400 ml-1">
                  (Grid default: {grid.seatSettings.seatSpacing}px)
                </span>
              </label>
              <DebouncedInput
                type="number"
                min="10"
                max="100"
                value={row.seatSpacing || grid.seatSettings.seatSpacing}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleRowUpdate(gridId, rowId, { seatSpacing: value })
                }
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>

            {/* Row Bend */}
            <div>
              <label className="block text-sm font-medium mb-1">Row Bend</label>
              <DebouncedInput
                type="number"
                min="-1"
                max="1"
                step="0.01"
                value={row.bend || 0}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleRowUpdate(gridId, rowId, { bend: value })
                }
                isFloat={true}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>
          </div>

          {/* Grid Properties Section */}
          <div className="p-4 space-y-4 border-t border-gray-700">
            <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
              <Grid3X3 className="w-4 h-4 text-blue-400" />
              <span>Grid Properties</span>
            </div>

            {/* Grid Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Grid Name
              </label>
              <DebouncedTextarea
                value={grid.name}
                onChange={() => {}}
                onUpdate={(value) => handleGridUpdate(gridId, { name: value })}
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
                  handleGridUpdate(gridId, {
                    seatSettings: { ...grid.seatSettings, price: value },
                  })
                }
                isFloat={true}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>

            {/* Grid Spacing Overrides */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">
                Spacing Overrides
              </h4>

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
                      handleGridUpdate(gridId, {
                        seatSettings: {
                          ...grid.seatSettings,
                          rowSpacing: value,
                        },
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
                      handleGridUpdate(gridId, {
                        seatSettings: {
                          ...grid.seatSettings,
                          seatSpacing: value,
                        },
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Seat Appearance */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">
                Seat Appearance
              </h4>

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
                    handleGridUpdate(gridId, {
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
                      handleGridUpdate(gridId, {
                        seatSettings: {
                          ...grid.seatSettings,
                          seatColor: color,
                        },
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
                      handleGridUpdate(gridId, {
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
                    handleGridUpdate(gridId, {
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
          </div>
        </div>
      );
    }

    if (selectionAnalysis.type === "single-grid" && selectionAnalysis.grid) {
      const { grid, gridId } = selectionAnalysis;
      const totalGridSeats = getSeatsByGridId(gridId).length;
      const isPartialGridSelection = selectedShapes.length < totalGridSeats;

      return (
        <div className="p-4 space-y-4">
          {/* ✅ Extract Options Section for Grid */}
          {isPartialGridSelection && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-blue-300 flex items-center">
                <Split className="w-4 h-4 mr-2" />
                Options
              </h4>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={createNewGridFromSelection}
                  className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-center space-x-2 transition-colors"
                >
                  <span>Extract to New Grid</span>
                </button>
                <button
                  onClick={() => selectSeatsInGrid(gridId)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-center space-x-2 transition-colors"
                >
                  <span>Select All Seats in {grid.name}</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
            <Grid3X3 className="w-4 h-4 text-blue-400" />
            <span>Grid Properties</span>
          </div>

          {/* Grid Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Grid Name</label>
            <DebouncedTextarea
              value={grid.name}
              onChange={() => {}}
              onUpdate={(value) => handleGridUpdate(gridId, { name: value })}
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
                handleGridUpdate(gridId, {
                  seatSettings: { ...grid.seatSettings, price: value },
                })
              }
              isFloat={true}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>

          {/* Grid Spacing Overrides */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">
              Spacing Overrides
            </h4>

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
                    handleGridUpdate(gridId, {
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
                    handleGridUpdate(gridId, {
                      seatSettings: {
                        ...grid.seatSettings,
                        seatSpacing: value,
                      },
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                />
              </div>
            </div>
          </div>

          {/* Seat Appearance */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">
              Seat Appearance
            </h4>

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
                  handleGridUpdate(gridId, {
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
                    handleGridUpdate(gridId, {
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
                    handleGridUpdate(gridId, {
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
                  handleGridUpdate(gridId, {
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
        </div>
      );
    }

    return null;
  }
);

AreaModeProperties.displayName = "AreaModeProperties";
