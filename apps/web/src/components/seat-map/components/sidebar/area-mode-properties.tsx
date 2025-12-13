"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Circle as CircleIcon } from "lucide-react";
import { SeatShape, GridShape, RowShape, SeatGridSettings } from "../../types";
import {
  cloneCanvasItem,
  cloneCanvasItems,
  ShapeContext,
  useSeatMapStore,
} from "../../store/seat-map-store";
import { areaModeContainer } from "../../variables";
import {
  getGridById,
  updateGridSettings,
  selectSeatsInGrid,
  createNewGridFromSelection,
  addRowToGrid,
  selectGrid,
} from "../../shapes/grid-shape";
import {
  getRowById,
  setRowLabelPlacement,
  updateRowLabelPosition,
  selectSeatsInRow,
  handleRowsLabelPlacementChange,
  getGridByRowId,
  getRowByIdFromAllGrids,
  renameRowFromLetter,
  renumberSeatsInRow,
  reverseRowSeatLabels,
  addSeatsToRow,
} from "../../shapes/row-shape";
import {
  updateSeatGraphics,
  createPixiTextStyle,
  updateSeatLabelRotation,
} from "../../shapes/seat-shape";
import { getSelectionTransform } from "../../events/transform-events";
import { SeatMapCollaboration } from "../../collaboration/seatmap-socket-client";
import { GridPropertiesTab } from "../area-mode/grid-properties-tab";
import { RowPropertiesTab } from "../area-mode/row-properties-tab";
import { SeatPropertiesTab } from "../area-mode/seat-properties-tab";

interface AreaModePropertiesProps {
  selectedShapes: (SeatShape | GridShape | RowShape)[];
}

type TabType = "grid" | "row" | "seat";

export const AreaModeProperties = React.memo(
  ({ selectedShapes }: AreaModePropertiesProps) => {
    const shapes = useSeatMapStore((state) => state.shapes);
    const updateShapes = useSeatMapStore((state) => state.updateShapes);
    const [activeTab, setActiveTab] = useState<TabType>("grid");
    console.log("AreaModeProperties rerendered");
    // ========== GRID HANDLERS ==========
    const handleGridUpdate = useCallback(
      (
        gridId: string,
        updates: {
          name?: string;
          seatSettings?: Partial<SeatGridSettings>;
          labelPlacement?: "left" | "middle" | "right" | "none";
        }
      ) => {
        console.log("Grid Updates:", updates);
        if (!areaModeContainer) return;

        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const beforeGrid = cloneCanvasItem(grid);

        if (updates.name !== undefined) {
          grid.name = updates.name;
          grid.gridName = updates.name;
        }

        if (updates.seatSettings) {
          console.log("Updating seat settings:", updates.seatSettings);
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
      },
      [shapes, selectedShapes]
    );

    const handleSelectAllInGrid = useCallback((gridId: string) => {
      selectGrid(gridId);
    }, []);

    const handleExtractGrid = useCallback(() => {
      createNewGridFromSelection();
    }, []);

    // ========== ROW HANDLERS ==========
    const handleRowUpdate = useCallback(
      (
        gridId: string,
        rowId: string,
        updates: {
          name?: string;
          seatSpacing?: number;
          labelPlacement?: "left" | "middle" | "right" | "none";
        }
      ) => {
        console.log("Row Updates:", updates);
        if (!areaModeContainer) return;

        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const row = grid.children.find((r) => r.id === rowId) as RowShape;
        if (!row) return;

        const beforeRow = cloneCanvasItem(row);

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
      },
      [shapes, selectedShapes, updateShapes]
    );

    const handleMultipleRowUpdates = useCallback(
      (updates: {
        name?: string;
        seatSpacing?: number;
        labelPlacement?: "left" | "middle" | "right" | "none";
      }) => {
        console.log("Multiple Row Updates:", updates);
        if (!areaModeContainer) return;

        const rowShapes = selectedShapes.filter(
          (shape): shape is RowShape =>
            shape.type === "container" &&
            "rowName" in shape &&
            "gridId" in shape
        );

        if (rowShapes.length === 0) return;

        const beforeRows = cloneCanvasItems(rowShapes);

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

        const context: ShapeContext = {
          topLevel: [],
          nested: [
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
      },
      [shapes, selectedShapes]
    );

    const handleSelectAllInRow = useCallback((rowId: string) => {
      selectSeatsInRow(rowId);
    }, []);

    // ========== SEAT HANDLERS ==========
    const handleSeatUpdate = useCallback(
      (updates: Partial<SeatShape>) => {
        console.log("Seat Updates:", updates);
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

        const beforeSeat = cloneCanvasItem(seat);

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
      },
      [shapes, selectedShapes]
    );

    // ========== SELECTION ANALYSIS ==========
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

        if (rowShapes.length > 0 && seatShapes.length > 0) {
          const selectedRowIds = new Set(rowShapes.map((row) => row.id));
          const seatRowIds = new Set(seatShapes.map((seat) => seat.rowId));
          const allGridIds = new Set([
            ...rowShapes.map((row) => row.gridId),
            ...seatShapes.map((seat) => seat.gridId),
          ]);

          if (allGridIds.size === 1) {
            const gridId = Array.from(allGridIds)[0];
            const grid = getGridById(gridId);
            const hasSeatsFromOtherRows = Array.from(seatRowIds).some(
              (rowId) => !selectedRowIds.has(rowId)
            );

            if (hasSeatsFromOtherRows) {
              return {
                type: "mixed-row-seats",
                gridId,
                grid,
                rows: rowShapes,
                seats: seatShapes,
                selectedRowIds: Array.from(selectedRowIds),
                affectedRowIds: Array.from(seatRowIds),
              };
            }
          }

          return {
            type: "mixed-containers",
            gridCount: 0,
            rowCount: rowShapes.length,
            seatCount: seatShapes.length,
          };
        }

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

    const handleAddRow = useCallback(
      (gridId: string, seatsCount: number, rowName: string) => {
        if (!areaModeContainer) return;

        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const beforeGrid = cloneCanvasItem(grid);

        const newRow = addRowToGrid(gridId, seatsCount, rowName);
        if (!newRow) return;
        updateShapes([...shapes], false, undefined, false);

        const context: ShapeContext = {
          topLevel: [],
          nested: [
            {
              id: newRow.id,
              type: "container",
              parentId: gridId,
            },
          ],
          operation: "modify",
        };

        const action = useSeatMapStore.getState()._saveToHistory(
          {
            shapes: [],
            selectedShapes: newRow ? [newRow] : [],
            context,
          },
          {
            shapes: [newRow],
            selectedShapes: [newRow],
            context,
          }
        );

        SeatMapCollaboration.broadcastShapeChange(action);
      },
      [shapes, selectedShapes]
    );

    const handleAddSeatToRow = useCallback(
      (gridId: string, rowIds: string[], count: number) => {
        if (!areaModeContainer) return;
        console.log("Adding seats to rows:", rowIds, count);
        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const affectedRows = grid.children.filter((r) =>
          rowIds.includes(r.id)
        ) as RowShape[];
        if (affectedRows.length === 0) return;

        let seats: SeatShape[] = [];
        rowIds.forEach((rowId) => {
          const seat = addSeatsToRow(gridId, rowId, count);
          if (seat) {
            seats.push(seat);
          }
        });

        updateShapes([...shapes], false, undefined, false);

        const context: ShapeContext = {
          topLevel: [],
          nested: seats.map((seat) => ({
            id: seat.id,
            type: "container",
            parentId: seat.rowId,
          })),
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
            shapes: [],
            selectedShapes: selectedShapes,
            context,
          },
          {
            shapes: seats,
            selectedShapes: selectedShapes,
            context,
          }
        );

        SeatMapCollaboration.broadcastShapeChange(action);
      },
      [shapes, selectedShapes]
    );

    const handleReverseSeatLabels = useCallback(
      (gridId: string, rowIds: string[]) => {
        if (!areaModeContainer) return;

        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const affectedRows = grid.children.filter((r) =>
          rowIds.includes(r.id)
        ) as RowShape[];
        if (affectedRows.length === 0) return;

        // ✅ Clone BEFORE making changes (captures original seat labels)
        const beforeSeats = cloneCanvasItems(
          affectedRows.map((row) => row.children).flat()
        );

        // Apply changes
        rowIds.forEach((rowId) => {
          reverseRowSeatLabels(gridId, rowId);
        });

        // ✅ Get the AFTER state (now affectedRows have updated seat labels)
        const afterSeats = affectedRows.map((row) => row.children).flat(); // These are already modified

        updateShapes([...shapes], false, undefined, false);

        const context: ShapeContext = {
          topLevel: [],
          nested: afterSeats.map((seat) => ({
            id: seat.id,
            type: "container",
            parentId: seat.rowId,
          })),
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
            shapes: beforeSeats, // Original state with old labels
            selectedShapes: selectedShapes,
            context,
          },
          {
            shapes: afterSeats, // Modified state with reversed labels
            selectedShapes: selectedShapes,
            context,
          }
        );

        SeatMapCollaboration.broadcastShapeChange(action);
      },
      [shapes, selectedShapes]
    );

    const handleRenumberSeats = useCallback(
      (gridId: string, rowIds: string[], startNumber: number, step: number) => {
        if (!areaModeContainer) return;

        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const affectedRows = grid.children.filter((r) =>
          rowIds.includes(r.id)
        ) as RowShape[];
        if (affectedRows.length === 0) return;

        const beforeSeats = cloneCanvasItems(
          affectedRows.map((row) => row.children).flat()
        );

        // Apply changes
        rowIds.forEach((rowId) => {
          renumberSeatsInRow(gridId, rowId, startNumber, step);
        });

        // ✅ Get the AFTER state (now affectedRows have updated seat numbers)
        const afterSeats = affectedRows.map((row) => row.children).flat(); // These are already modified

        updateShapes([...shapes], false, undefined, false);

        const context: ShapeContext = {
          topLevel: [],
          nested: afterSeats.map((seat) => ({
            id: seat.id,
            type: "container",
            parentId: seat.rowId,
          })),
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
            shapes: beforeSeats, // Original state with old numbers
            selectedShapes: selectedShapes,
            context,
          },
          {
            shapes: afterSeats, // Modified state with new numbers
            selectedShapes: selectedShapes,
            context,
          }
        );

        SeatMapCollaboration.broadcastShapeChange(action);
      },
      [shapes, selectedShapes, updateShapes]
    );

    const handleRenameRowSequence = useCallback(
      (gridId: string, rowIds: string[], startLetter: string) => {
        if (!areaModeContainer) return;

        const grid = areaModeContainer.children.find(
          (g) => g.id === gridId
        ) as GridShape;
        if (!grid) return;

        const affectedRows = grid.children.filter((r) =>
          rowIds.includes(r.id)
        ) as RowShape[];
        if (affectedRows.length === 0) return;

        const beforeRows = cloneCanvasItems(affectedRows);

        // Apply to all rows with sequential letters
        let currentCharCode = startLetter.toUpperCase().charCodeAt(0);
        rowIds.forEach((rowId) => {
          const letter = String.fromCharCode(currentCharCode);
          renameRowFromLetter(gridId, rowId, letter);
          currentCharCode++;
        });

        updateShapes([...shapes], false, undefined, false);

        const context: ShapeContext = {
          topLevel: [],
          nested: affectedRows.map((row) => ({
            id: row.id,
            type: "container",
            parentId: gridId,
          })),
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
            shapes: affectedRows,
            selectedShapes: selectedShapes,
            context,
          }
        );

        SeatMapCollaboration.broadcastShapeChange(action);
      },
      [shapes, selectedShapes, updateShapes]
    );

    if (
      selectionAnalysis.type === "mixed-seats" ||
      selectionAnalysis.type === "mixed-containers" ||
      selectionAnalysis.type === "mixed"
    ) {
      return (
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-4">Mixed selection</div>
          <div className="text-xs text-gray-500">
            Select items in the same grid for specific editing options.
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "grid"
                ? "border-b-2 border-blue-500 text-blue-400 bg-gray-800"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setActiveTab("row")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "row"
                ? "border-b-2 border-yellow-500 text-yellow-400 bg-gray-800"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Row
          </button>
          <button
            onClick={() => setActiveTab("seat")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "seat"
                ? "border-b-2 border-purple-500 text-purple-400 bg-gray-800"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Seat
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "grid" && (
            <GridPropertiesTab
              selectionAnalysis={selectionAnalysis}
              selectedShapes={selectedShapes}
              onGridUpdate={handleGridUpdate}
              onSelectAll={handleSelectAllInGrid}
              onExtractGrid={handleExtractGrid}
              onAddRow={handleAddRow}
            />
          )}
          {activeTab === "row" && (
            <RowPropertiesTab
              selectionAnalysis={selectionAnalysis}
              selectedShapes={selectedShapes}
              onGridUpdate={handleGridUpdate}
              onRowUpdate={handleRowUpdate}
              onMultipleRowUpdate={handleMultipleRowUpdates}
              onSelectAll={handleSelectAllInRow}
              onAddSeatToRow={handleAddSeatToRow}
              onRenameRowSequence={handleRenameRowSequence}
            />
          )}
          {activeTab === "seat" && (
            <SeatPropertiesTab
              selectionAnalysis={selectionAnalysis}
              selectedShapes={selectedShapes}
              onGridUpdate={handleGridUpdate}
              onSeatUpdate={handleSeatUpdate}
              onReverseSeatLabels={handleReverseSeatLabels}
              onRenumberSeats={handleRenumberSeats}
            />
          )}
        </div>
      </div>
    );
  }
);

AreaModeProperties.displayName = "AreaModeProperties";
