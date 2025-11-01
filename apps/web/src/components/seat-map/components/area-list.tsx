import React, { useMemo } from "react";
import {
  Users,
  Grid3X3,
  Hash,
  Circle as CircleIcon,
  DollarSign,
  Settings,
} from "lucide-react";
import { AreaModeContainer, SeatShape } from "../types";
import { useSeatMapStore } from "../store/seat-map-store";

export const AreaList = () => {
  const shapes = useSeatMapStore((state) => state.shapes);
  const setSelectedShapes = useSeatMapStore((state) => state.setSelectedShapes);

  const container = shapes.find(
    (shape): shape is AreaModeContainer =>
      shape.type === "container" && shape.id === "area-mode-container-id"
  );

  const seatStats = useMemo(() => {
    if (!container || !container.grids) {
      return {
        totalSeats: 0,
        totalGrids: 0,
        totalRows: 0,
        gridDetails: [],
      };
    }
    const totalSeats = container.children.length;
    const totalGrids = container.grids.filter((grid) => {
      return grid.rows.some((row) => row.seats.length > 0);
    }).length;
    const totalRows = container.grids
      .filter((grid) => {
        return grid.rows.some((row) => row.seats.length > 0);
      })
      .reduce((sum, grid) => sum + grid.rows.length, 0);
    const gridDetails = container.grids.map((grid) => {
      const gridRows = grid.rows.filter((row) => row.seats.length > 0);
      if (gridRows.length === 0) {
        return undefined;
      }
      const gridSeats = container.children.filter(
        (child): child is SeatShape =>
          child.type === "ellipse" &&
          "gridId" in child &&
          (child as SeatShape).gridId === grid.id
      );

      const rowDetails = grid.rows.map((row) => {
        const rowSeats = gridSeats.filter((seat) => seat.rowId === row.id);
        return {
          id: row.id,
          name: row.name || `Row ${grid.rows.indexOf(row) + 1}`,
          seatCount: rowSeats.length,
          bend: row.bend || 0,
          seatSpacing: row.seatSpacing || grid.seatSettings.seatSpacing,
        };
      });

      return {
        id: grid.id,
        name: grid.name,
        seatCount: gridSeats.length,
        rowCount: grid.rows.length,
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
  }, [shapes]);

  const handleGridSelect = (gridId: string) => {
    if (!container) return;

    const gridSeats = container.children.filter(
      (child): child is SeatShape =>
        child.type === "ellipse" &&
        "gridId" in child &&
        (child as SeatShape).gridId === gridId
    );

    setSelectedShapes(gridSeats);
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
            <span className="flex items-center">
              <CircleIcon className="w-3 h-3 mr-1 text-green-400" />
              {seatStats.totalSeats} seats
            </span>
            <span className="flex items-center">
              <Grid3X3 className="w-3 h-3 mr-1 text-blue-400" />
              {seatStats.totalGrids} grids
            </span>
            <span className="flex items-center">
              <Hash className="w-3 h-3 mr-1 text-yellow-400" />
              {seatStats.totalRows} rows
            </span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <div className="px-3 pb-3 border-t border-gray-800">
        {seatStats.gridDetails.length > 0 ? (
          <div className="space-y-3 mt-3">
            {seatStats.gridDetails.map((grid, gridIndex) =>
              grid ? (
                <div
                  key={grid.id}
                  className="bg-gray-800 rounded-lg border border-gray-700"
                >
                  {/* Grid header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-750"
                    onClick={() => handleGridSelect(grid.id)}
                  >
                    <h4 className="text-xs font-medium text-white flex items-center">
                      <Grid3X3 className="w-3 h-3 mr-2 text-blue-400" />
                      {grid.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="flex items-center text-green-400">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {grid.price || 0}
                      </span>
                      <span className="text-gray-400">
                        {new Date(grid.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Grid stats */}
                  <div className="px-3 pb-2">
                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                      <div className="bg-gray-700 rounded px-2 py-1">
                        <div className="text-gray-400">Seats</div>
                        <div className="text-green-400 font-medium">
                          {grid.seatCount}
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded px-2 py-1">
                        <div className="text-gray-400">Rows</div>
                        <div className="text-blue-400 font-medium">
                          {grid.rowCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-xs mt-3 py-4">
            No seat grids created yet
            <div className="mt-1 text-gray-600">
              Use the Seat Grid tool to create seating arrangements
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

AreaList.displayName = "AreaList";
