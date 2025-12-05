"use client";

import React, { useMemo } from "react";
import {
  Grid3X3,
  Hash,
  Circle as CircleIcon,
  DollarSign,
  Split,
} from "lucide-react";
import {
  MdAlignHorizontalLeft,
  MdOutlineAlignHorizontalCenter,
  MdOutlineAlignHorizontalRight,
} from "react-icons/md";
import { RxValueNone } from "react-icons/rx";
import { SeatShape, GridShape, RowShape, SeatGridSettings } from "../../types";
import {
  cloneCanvasItem,
  cloneCanvasItems,
  ShapeContext,
  useSeatMapStore,
} from "../../store/seat-map-store";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";
import { ColorPicker } from "../inputs/color-picker";
import { areaModeContainer } from "../../variables";
import {
  getGridById,
  getSeatsByGridId,
  createNewGridFromSelection,
  selectSeatsInGrid,
  updateGridSettings,
} from "../../shapes/grid-shape";
import {
  getGridByRowId,
  getRowById,
  getRowByIdFromAllGrids,
  handleRowLabelPlacementChange,
  handleRowsLabelPlacementChange,
  selectSeatsInRow,
  setRowLabelPlacement,
  updateRowLabelPosition,
} from "../../shapes/row-shape";
import {
  updateSeatLabelRotation,
  createPixiTextStyle,
  updateSeatGraphics,
} from "../../shapes/seat-shape";
import { getSelectionTransform } from "../../events/transform-events";
import { formatNumber, parseNumber } from "../utils/number-utils";
import { SeatMapCollaboration } from "../../collaboration/seatmap-socket-client";

interface AreaModePropertiesProps {
  selectedShapes: (SeatShape | GridShape | RowShape)[];
}

export const AreaModeProperties = React.memo(
  ({ selectedShapes }: AreaModePropertiesProps) => {
    const updateShapes = useSeatMapStore((state) => state.updateShapes);
    const shapes = useSeatMapStore((state) => state.shapes);

    const selectionAnalysis = useMemo(() => {
      if (!areaModeContainer || selectedShapes.length === 0) {
        return { type: "none" };
      }

      const seatShapes = selectedShapes.filter(
        (shape): shape is SeatShape =>
          shape.type === "ellipse" && "rowId" in shape && "gridId" in shape
      );
      const containerShapes = selectedShapes.filter(
        (shape) => shape.type === "container"
      );

      if (containerShapes.length > 0) {
        const gridShapes = containerShapes.filter(
          (shape): shape is GridShape => "gridName" in shape
        );
        const rowShapes = containerShapes.filter(
          (shape): shape is RowShape => "rowName" in shape && "gridId" in shape
        );

        if (gridShapes.length > 0) {
          if (
            gridShapes.length === 1 &&
            rowShapes.length === 0 &&
            seatShapes.length === 0
          ) {
            const grid = gridShapes[0];
            return {
              type: "single-grid-container",
              gridId: grid.id,
              grid,
              totalSeats: grid.children.reduce(
                (sum, row) => sum + row.children.length,
                0
              ),
            };
          } else {
            return {
              type: "mixed-containers",
              gridCount: gridShapes.length,
              rowCount: rowShapes.length,
              seatCount: seatShapes.length,
            };
          }
        }

        if (rowShapes.length > 0) {
          const uniqueGridIds = [
            ...new Set(rowShapes.map((row) => row.gridId)),
          ];

          if (rowShapes.length === 1 && seatShapes.length === 0) {
            const row = rowShapes[0];
            const grid = getGridById(row.gridId);
            return {
              type: "single-row-container",
              gridId: row.gridId,
              rowId: row.id,
              grid,
              row,
              totalSeats: row.children.length,
            };
          } else if (uniqueGridIds.length === 1 && seatShapes.length === 0) {
            const gridId = uniqueGridIds[0];
            const grid = getGridById(gridId);
            return {
              type: "multi-row-container",
              gridId,
              grid,
              rowIds: rowShapes.map((row) => row.id),
              rows: rowShapes,
              totalSeats: rowShapes.reduce(
                (sum, row) => sum + row.children.length,
                0
              ),
            };
          } else {
            return {
              type: "mixed-containers",
              gridCount: 0,
              rowCount: rowShapes.length,
              seatCount: seatShapes.length,
            };
          }
        }
      }

      if (seatShapes.length > 0 && containerShapes.length === 0) {
        const firstSeat = seatShapes[0];
        const allSameGrid = seatShapes.every(
          (seat) => seat.gridId === firstSeat.gridId
        );
        const allSameRow = seatShapes.every(
          (seat) => seat.rowId === firstSeat.rowId
        );

        if (allSameRow && allSameGrid) {
          return {
            type: "single-row-seats",
            gridId: firstSeat.gridId,
            rowId: firstSeat.rowId,
            grid: getGridById(firstSeat.gridId),
            row: getRowById(firstSeat.gridId, firstSeat.rowId),
            seats: seatShapes,
          };
        } else if (allSameGrid) {
          return {
            type: "single-grid-seats",
            gridId: firstSeat.gridId,
            grid: getGridById(firstSeat.gridId),
            seats: seatShapes,
          };
        } else {
          return {
            type: "mixed-seats",
            seats: seatShapes,
          };
        }
      }

      return { type: "mixed" };
    }, [selectedShapes]);

    const handleGridUpdate = (
      gridId: string,
      updates: {
        name?: string;
        seatSettings?: Partial<SeatGridSettings>;
        labelPlacement?: "left" | "middle" | "right" | "none";
      }
    ) => {
      if (!areaModeContainer) return;

      const grid = areaModeContainer.children.find(
        (g) => g.id === gridId
      ) as GridShape;
      if (!grid) return;

      const beforeGrid = cloneCanvasItem(grid);

      // Apply updates
      if (updates.name !== undefined) {
        grid.name = updates.name;
        grid.gridName = updates.name;
      }

      if (updates.seatSettings) {
        updateGridSettings(gridId, updates.seatSettings);
      }

      if (updates.labelPlacement !== undefined) {
        handleRowsLabelPlacementChange(grid, updates.labelPlacement);
        return;
      }

      updateShapes([...shapes], false, undefined, false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(selectedShapes);
      }

      // ✅ Context-based history saving
      const context: ShapeContext = {
        topLevel: [],
        nested: [
          {
            id: gridId,
            type: "container",
            parentId: areaModeContainer.id,
          },
        ],
        operation: "modify",
        containerPositions: {
          [areaModeContainer.id]: {
            x: areaModeContainer.x,
            y: areaModeContainer.y,
          },
        },
      };

      const action = useSeatMapStore.getState()._saveToHistory(
        {
          shapes: [beforeGrid],
          selectedShapes: selectedShapes,
          context,
        },
        {
          shapes: [grid],
          selectedShapes: selectedShapes,
          context,
        }
      );

      SeatMapCollaboration.broadcastShapeChange(action);
    };

    const handleRowUpdate = (
      gridId: string,
      rowId: string,
      updates: {
        name?: string;
        seatSpacing?: number;
        labelPlacement?: "left" | "middle" | "right" | "none";
      }
    ) => {
      if (!areaModeContainer) return;

      const grid = areaModeContainer.children.find(
        (g) => g.id === gridId
      ) as GridShape;
      if (!grid) return;

      const row = grid.children.find((r) => r.id === rowId) as RowShape;
      if (!row) return;

      // ✅ Store original values for before state
      const beforeRow = cloneCanvasItem(row);

      // Apply updates
      if (updates.name !== undefined) {
        row.name = updates.name;
        row.rowName = updates.name;

        if (row.labelGraphics) {
          row.labelGraphics.text = updates.name;
        }
      }

      if (updates.seatSpacing !== undefined) {
        row.seatSpacing = updates.seatSpacing;

        const rowSeats = row.children.sort((a, b) => a.x - b.x);
        rowSeats.forEach((seat, index) => {
          const newX =
            rowSeats[0].x -
            rowSeats.findIndex((s) => s.id === rowSeats[0].id) *
              updates.seatSpacing! +
            index * updates.seatSpacing!;
          seat.x = newX;
          seat.graphics.position.set(newX, seat.y);
        });

        updateRowLabelPosition(row);
      }

      if (updates.labelPlacement !== undefined) {
        setRowLabelPlacement(row, updates.labelPlacement);
      }

      updateShapes([...shapes], false, undefined, false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(selectedShapes);
      }

      // ✅ Context-based history saving
      const context: ShapeContext = {
        topLevel: [],
        nested: [
          {
            id: rowId,
            type: "container",
            parentId: gridId,
          },
        ],
        operation: "modify",
        containerPositions: {
          [areaModeContainer.id]: {
            x: areaModeContainer.x,
            y: areaModeContainer.y,
          },
        },
      };

      const action = useSeatMapStore.getState()._saveToHistory(
        {
          shapes: [beforeRow],
          selectedShapes: selectedShapes,
          context,
        },
        {
          shapes: [row],
          selectedShapes: selectedShapes,
          context,
        }
      );

      SeatMapCollaboration.broadcastShapeChange(action);
    };

    const handleMultipleRowUpdates = (updates: {
      name?: string;
      seatSpacing?: number;
      labelPlacement?: "left" | "middle" | "right" | "none";
    }) => {
      if (!areaModeContainer) return;

      const rowShapes = selectedShapes.filter(
        (shape): shape is RowShape =>
          shape.type === "container" && "rowName" in shape && "gridId" in shape
      );

      if (rowShapes.length === 0) return;

      // ✅ Store original values for before state
      const beforeRows = cloneCanvasItems(rowShapes);

      // Apply updates
      rowShapes.forEach((row) => {
        if (updates.name !== undefined) {
          const newName = `${updates.name}`;
          row.name = newName;
          row.rowName = newName;
          if (row.labelGraphics) {
            row.labelGraphics.text = newName;
          }
        }

        if (updates.seatSpacing !== undefined) {
          row.seatSpacing = updates.seatSpacing;
          const rowSeats = row.children.sort((a, b) => a.x - b.x);
          rowSeats.forEach((seat, index) => {
            const newX =
              rowSeats[0].x -
              rowSeats.findIndex((s) => s.id === rowSeats[0].id) *
                updates.seatSpacing! +
              index * updates.seatSpacing!;
            seat.x = newX;
            seat.graphics.position.set(newX, seat.y);
          });
        }

        if (updates.labelPlacement !== undefined) {
          setRowLabelPlacement(row, updates.labelPlacement);
        }
      });

      updateShapes([...shapes], false, undefined, false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(selectedShapes);
      }

      // ✅ Context-based history saving
      const context: ShapeContext = {
        topLevel: [],
        nested: [
          // Include all affected rows
          ...rowShapes.map((row) => ({
            id: row.id,
            type: "container" as const,
            parentId: row.gridId,
          })),
        ],
        operation: "modify",
        containerPositions: {
          [areaModeContainer.id]: {
            x: areaModeContainer.x,
            y: areaModeContainer.y,
          },
        },
      };

      const action = useSeatMapStore.getState()._saveToHistory(
        {
          shapes: beforeRows,
          selectedShapes: selectedShapes,
          context,
        },
        {
          shapes: rowShapes,
          selectedShapes: selectedShapes,
          context,
        }
      );

      SeatMapCollaboration.broadcastShapeChange(action);
    };

    const handleSeatUpdate = (updates: Partial<SeatShape>) => {
      if (!areaModeContainer) return;

      const seatShapes = selectedShapes.filter(
        (shape): shape is SeatShape =>
          shape.type === "ellipse" && "rowId" in shape && "gridId" in shape
      );

      if (seatShapes.length !== 1) return;

      const seat = seatShapes[0];

      const hasChanges = Object.entries(updates).some(([key, value]) => {
        return (seat as any)[key] !== value;
      });

      if (!hasChanges) {
        return;
      }

      // ✅ Store original values for before state
      const beforeSeat = cloneCanvasItem(seat);

      // Apply updates
      Object.assign(seat, updates);

      if (updates.x !== undefined || updates.y !== undefined) {
        seat.graphics.position.set(seat.x, seat.y);
      }

      if (updates.name !== undefined && seat.labelGraphics) {
        seat.labelGraphics.text = updates.name;
      }

      if (updates.labelStyle !== undefined && seat.labelGraphics) {
        seat.labelGraphics.style = createPixiTextStyle(seat.labelStyle);
      }

      if (updates.showLabel !== undefined && seat.labelGraphics) {
        seat.labelGraphics.visible = updates.showLabel;
      }

      if (
        updates.color !== undefined ||
        updates.strokeColor !== undefined ||
        updates.strokeWidth !== undefined ||
        updates.radiusX !== undefined ||
        updates.radiusY !== undefined
      ) {
        updateSeatGraphics(seat);
      }

      if (updates.rotation !== undefined) {
        seat.graphics.rotation = seat.rotation;
        const row = getRowByIdFromAllGrids(seat.rowId);
        const grid = getGridByRowId(seat.rowId);
        updateSeatLabelRotation(seat, row, grid);
      }

      if (updates.scaleX !== undefined || updates.scaleY !== undefined) {
        seat.graphics.scale.set(seat.scaleX, seat.scaleY);
      }

      if (updates.opacity !== undefined) {
        seat.graphics.alpha = seat.opacity;
      }

      if (updates.visible !== undefined) {
        seat.graphics.visible = seat.visible;
      }

      updateShapes([...shapes], false, undefined, false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(selectedShapes);
      }

      const context: ShapeContext = {
        topLevel: [],
        nested: [
          {
            id: seat.id,
            type: "ellipse",
            parentId: seat.rowId,
          },
        ],
        operation: "modify",
        containerPositions: {
          [areaModeContainer.id]: {
            x: areaModeContainer.x,
            y: areaModeContainer.y,
          },
        },
      };

      const action = useSeatMapStore.getState()._saveToHistory(
        {
          shapes: [beforeSeat],
          selectedShapes: selectedShapes,
          context,
        },
        {
          shapes: [seat],
          selectedShapes: selectedShapes,
          context,
        }
      );

      SeatMapCollaboration.broadcastShapeChange(action);
    };
    console.log(selectionAnalysis.type);
    if (selectionAnalysis.type === "none") {
      return (
        <div className="p-4 text-center text-gray-500">
          <CircleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">
            Select seats, rows, or grids to edit properties
          </div>
        </div>
      );
    }

    if (
      selectionAnalysis.type === "mixed-containers" ||
      selectionAnalysis.type === "mixed"
    ) {
      return (
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-4">
            Mixed selection ({selectedShapes.length} items)
          </div>
          <div className="text-xs text-gray-500">
            Select items of the same type for specific editing options.
          </div>
        </div>
      );
    }

    if (selectionAnalysis.type === "mixed-seats") {
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

    if (selectionAnalysis.type === "single-grid-container") {
      const { grid, gridId, totalSeats } = selectionAnalysis;

      return (
        grid && (
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
              <Grid3X3 className="w-4 h-4 text-blue-400" />
              <span>Grid Properties ({totalSeats} seats)</span>
            </div>

            {/* Grid Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Grid Name
              </label>
              <DebouncedTextarea
                value={grid!.gridName}
                onChange={() => {}}
                onUpdate={(value) => handleGridUpdate(gridId!, { name: value })}
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
                value={grid!.seatSettings.price}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleGridUpdate(gridId!, {
                    seatSettings: { ...grid!.seatSettings, price: value },
                  })
                }
                isFloat={true}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Row Label Placement
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "left" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <MdAlignHorizontalLeft />
                </button>
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "middle" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <MdOutlineAlignHorizontalCenter />
                </button>
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "right" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <MdOutlineAlignHorizontalRight />
                </button>
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "none" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <RxValueNone />
                </button>
              </div>
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
                      handleGridUpdate(gridId!, {
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
                      handleGridUpdate(gridId!, {
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
                    handleGridUpdate(gridId!, {
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
                      handleGridUpdate(gridId!, {
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
                      handleGridUpdate(gridId!, {
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
                    handleGridUpdate(gridId!, {
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
        )
      );
    }

    if (selectionAnalysis.type === "single-row-container") {
      const { row, grid, gridId, rowId, totalSeats } = selectionAnalysis;

      return (
        <div className="space-y-6">
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
              <Hash className="w-4 h-4 text-yellow-400" />
              <span>Row Properties ({totalSeats} seats)</span>
            </div>

            {/* Row Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Row Name</label>
              <DebouncedTextarea
                value={row!.rowName}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleRowUpdate(gridId!, rowId!, { name: value })
                }
                rows={1}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
              />
            </div>

            {/* Row Label Placement */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Row Label Placement
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() =>
                    handleRowUpdate(gridId!, rowId!, { labelPlacement: "left" })
                  }
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    row!.labelPlacement === "left"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <MdAlignHorizontalLeft />
                </button>
                <button
                  onClick={() =>
                    handleRowUpdate(gridId!, rowId!, {
                      labelPlacement: "middle",
                    })
                  }
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    row!.labelPlacement === "middle"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <MdOutlineAlignHorizontalCenter />
                </button>
                <button
                  onClick={() =>
                    handleRowUpdate(gridId!, rowId!, {
                      labelPlacement: "right",
                    })
                  }
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    row!.labelPlacement === "right"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <MdOutlineAlignHorizontalRight />
                </button>
                <button
                  onClick={() =>
                    handleRowUpdate(gridId!, rowId!, { labelPlacement: "none" })
                  }
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    row!.labelPlacement === "none"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  <RxValueNone />
                </button>
              </div>
            </div>

            {/* Row Seat Spacing Override */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Seat Spacing Override
                <span className="text-xs text-gray-400 ml-1">
                  (Grid default: {grid!.seatSettings.seatSpacing}px)
                </span>
              </label>
              <DebouncedInput
                type="number"
                min="10"
                max="100"
                value={row!.seatSpacing || grid!.seatSettings.seatSpacing}
                onChange={() => {}}
                onUpdate={(value) =>
                  handleRowUpdate(gridId!, rowId!, { seatSpacing: value })
                }
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

            {/* Grid properties (read-only for context) */}
            <div className="bg-gray-800 rounded p-3 text-sm">
              <div className="text-gray-400 mb-2">Parent Grid Information</div>
              <div>
                Name: <span className="text-blue-300">{grid!.gridName}</span>
              </div>
              <div>
                Price:{" "}
                <span className="text-green-300">
                  ${grid!.seatSettings.price}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectionAnalysis.type === "multi-row-container") {
      const { grid, gridId, rows, totalSeats } = selectionAnalysis;

      return (
        <div className="p-4 space-y-4">
          <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
            <Hash className="w-4 h-4 text-yellow-400" />
            <span>
              Multiple Rows ({rows!.length} rows, {totalSeats} seats)
            </span>
          </div>

          {/* Row Label Placement for all selected rows */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Row Label Placement
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  handleMultipleRowUpdates({ labelPlacement: "left" })
                }
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
              >
                <MdAlignHorizontalLeft />
              </button>
              <button
                onClick={() =>
                  handleMultipleRowUpdates({ labelPlacement: "middle" })
                }
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
              >
                <MdOutlineAlignHorizontalCenter />
              </button>
              <button
                onClick={() =>
                  handleMultipleRowUpdates({ labelPlacement: "right" })
                }
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
              >
                <MdOutlineAlignHorizontalRight />
              </button>
              <button
                onClick={() =>
                  handleMultipleRowUpdates({ labelPlacement: "none" })
                }
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
              >
                <RxValueNone />
              </button>
            </div>
          </div>

          {/* Common seat spacing for all rows */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Seat Spacing Override (All Rows)
              <span className="text-xs text-gray-400 ml-1">
                (Grid default: {grid!.seatSettings.seatSpacing}px)
              </span>
            </label>
            <DebouncedInput
              type="number"
              min="10"
              max="100"
              value={grid!.seatSettings.seatSpacing}
              onChange={() => {}}
              onUpdate={(value) =>
                handleMultipleRowUpdates({ seatSpacing: value })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>

          {/* Grid context */}
          <div className="bg-gray-800 rounded p-3 text-sm">
            <div className="text-gray-400 mb-2">Parent Grid</div>
            <div>
              Name: <span className="text-blue-300">{grid!.gridName}</span>
            </div>
          </div>
        </div>
      );
    }

    if (selectionAnalysis.type === "single-row-seats") {
      const { row, grid, gridId, rowId, seats } = selectionAnalysis;
      const isSingleSeatSelected = seats!.length === 1;

      return (
        grid &&
        row && (
          <div className="space-y-6">
            <div className="p-4 space-y-3 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-300 flex items-center">
                <Split className="w-4 h-4 mr-2" />
                Options ({seats!.length} seats selected)
              </h4>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={createNewGridFromSelection}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-start space-x-2 transition-colors"
                >
                  <span>Extract to New Grid</span>
                </button>
                <button
                  onClick={() => selectSeatsInRow(rowId!)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-start space-x-2 transition-colors"
                >
                  <span>Select All Seats in {row!.rowName}</span>
                </button>
                <button
                  onClick={() => selectSeatsInGrid(gridId!)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-start space-x-2 transition-colors"
                >
                  <span>Select All Seats in {grid!.gridName}</span>
                </button>
              </div>
            </div>

            {/* Single Seat Properties - only if one seat selected */}
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
                    value={seats![0].name}
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
                      value={parseFloat(formatNumber(seats![0].x, true))}
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
                      value={parseFloat(formatNumber(seats![0].y, true))}
                      onChange={() => {}}
                      onUpdate={(value) => handleSeatUpdate({ y: value })}
                      isFloat={true}
                      className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Row Properties Section (existing logic) */}
            <div className="p-4 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold border-b border-gray-700 pb-2">
                <Hash className="w-4 h-4 text-yellow-400" />
                <span>Row Properties</span>
              </div>

              {/* Row Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Row Name
                </label>
                <DebouncedTextarea
                  value={row.name}
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
                  onUpdate={(value) =>
                    handleGridUpdate(gridId, { name: value })
                  }
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
                        seatSettings: {
                          ...grid.seatSettings,
                          seatRadius: value,
                        },
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
        )
      );
    }

    if (selectionAnalysis.type === "single-grid-seats") {
      const { grid, gridId, seats } = selectionAnalysis;
      const totalGridSeats = getSeatsByGridId(gridId!).length;
      const isPartialGridSelection = seats!.length < totalGridSeats;

      return (
        grid && (
          <div className="p-4 space-y-4">
            {/* Extract Options Section for Grid */}
            {isPartialGridSelection && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-blue-300 flex items-center">
                  <Split className="w-4 h-4 mr-2" />
                  Options ({seats!.length} of {totalGridSeats} seats selected)
                </h4>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={createNewGridFromSelection}
                    className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-center space-x-2 transition-colors"
                  >
                    <span>Extract to New Grid</span>
                  </button>
                  <button
                    onClick={() => selectSeatsInGrid(gridId!)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium flex items-start justify-center space-x-2 transition-colors"
                  >
                    <span>Select All Seats in {grid!.gridName}</span>
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Row Label Placement
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "left" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <MdAlignHorizontalLeft />
                </button>
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "middle" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <MdOutlineAlignHorizontalCenter />
                </button>
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "right" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <MdOutlineAlignHorizontalRight />
                </button>
                <button
                  onClick={() =>
                    handleGridUpdate(gridId!, { labelPlacement: "none" })
                  }
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                >
                  <RxValueNone />
                </button>
              </div>
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
        )
      );
    }

    return null;
  }
);

AreaModeProperties.displayName = "AreaModeProperties";
