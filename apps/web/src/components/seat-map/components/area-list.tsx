import React, { useMemo } from "react";
import {
  Users,
  Grid3X3,
  Hash,
  Circle as CircleIcon,
  DollarSign,
  Settings,
} from "lucide-react";
import { AreaModeContainer, GridShape, RowShape, SeatShape } from "../types";
import { useSeatMapStore } from "../store/seat-map-store";

export const AreaList = () => {
  const shapes = useSeatMapStore((state) => state.shapes);
  const setSelectedShapes = useSeatMapStore((state) => state.setSelectedShapes);

  const container = shapes.find(
    (shape): shape is AreaModeContainer => shape.id === "area-mode-container-id"
  );

  // ✅ Updated to work with new structure
  const containerChildrenCount = container?.children.length ?? 0;
  const containerGridsJson = JSON.stringify(
    container?.children.map((grid) => ({
      id: grid.id,
      rowCount: grid.children.length,
      seatCount: grid.children.reduce(
        (total, row) => total + row.children.length,
        0
      ),
    })) ?? []
  );

  const seatStats = useMemo(() => {
    if (!container || container.children.length === 0) {
      return {
        totalSeats: 0,
        totalGrids: 0,
        totalRows: 0,
        gridDetails: [],
      };
    }

    const grids = container.children as GridShape[];

    // ✅ Calculate totals from the new structure
    const totalGrids = grids.length;
    const totalRows = grids.reduce(
      (total, grid) => total + grid.children.length,
      0
    );
    const totalSeats = grids.reduce((total, grid) => {
      return (
        total +
        grid.children.reduce((gridTotal, row) => {
          return gridTotal + row.children.length;
        }, 0)
      );
    }, 0);

    const gridDetails = grids.map((grid) => {
      const rows = grid.children as RowShape[];
      const gridSeatCount = rows.reduce(
        (total, row) => total + row.children.length,
        0
      );

      const rowDetails = rows.map((row) => {
        const seats = row.children as SeatShape[];
        return {
          id: row.id,
          name: row.rowName || `Row ${rows.indexOf(row) + 1}`,
          seatCount: seats.length,
          seatSpacing: row.seatSpacing || grid.seatSettings.seatSpacing,
        };
      });

      return {
        id: grid.id,
        name: grid.gridName,
        seatCount: gridSeatCount,
        rowCount: rows.length,
        rows: rowDetails,
        createdAt: grid.createdAt,
        price: grid.seatSettings.price,
        rowSpacing: grid.seatSettings.rowSpacing,
        seatSpacing: grid.seatSettings.seatSpacing,
        seatRadius: grid.seatSettings.seatRadius,
        seatColor: grid.seatSettings.seatColor,
      };
    });

    return {
      totalSeats,
      totalGrids,
      totalRows,
      gridDetails,
    };
  }, [shapes, containerChildrenCount, containerGridsJson]);

  const handleGridSelect = (gridId: string) => {
    if (!container) return;

    const grid = container.children.find((g) => g.id === gridId) as GridShape;
    if (!grid) return;

    // ✅ Get all seats from all rows in the grid
    const allSeats: SeatShape[] = [];
    grid.children.forEach((row: RowShape) => {
      allSeats.push(...row.children);
    });

    setSelectedShapes(allSeats);
  };

  return (
    <div
      className="flex-1 border-b border-gray-700 overflow-y-auto [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:bg-gray-900
        [&::-webkit-scrollbar-track]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-gray-700
        [&::-webkit-scrollbar-thumb]:rounded-full
        dark:[&::-webkit-scrollbar-track]:bg-neutral-700
        dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
    >
      {/* Header */}
      <div className="p-3 cursor-pointer hover:bg-gray-800 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Seat Management
          </h3>
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-300">
          <div className="flex items-center space-x-4">
            <span>{seatStats.totalSeats} seats</span>
            <span>{seatStats.totalGrids} grids</span>
            <span>{seatStats.totalRows} rows</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <div className="px-3 pb-3 border-t border-gray-800">
        {seatStats.gridDetails.length > 0 ? (
          <div className="space-y-3 mt-3">
            {seatStats.gridDetails.map((grid, gridIndex) => (
              <div
                key={grid.id}
                className="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => handleGridSelect(grid.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {grid.name}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span>{grid.seatCount} seats</span>
                    <span>•</span>
                    <span>{grid.rowCount} rows</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Price: ${grid.price}</span>
                    <span>Revenue: ${grid.seatCount * grid.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-xs text-gray-400 text-center py-4">
            No seat grids created yet
          </div>
        )}
      </div>
    </div>
  );
};

AreaList.displayName = "AreaList";
