"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  useAreaMode,
  useAreaActions,
  useCanvasStore,
} from "./store/main-store";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
import {
  Trash2,
  Settings,
  Merge,
  Edit3,
  Palette,
  RotateCw,
} from "lucide-react";
import { RowShape, SeatShape } from "@/types/seat-map-types";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface AreaSidebarProps {
  inSidebar?: boolean;
}

export default function AreaSidebar({ inSidebar = false }: AreaSidebarProps) {
  const { isInAreaMode, selectedRowIds, selectedSeatIds, zoomedArea } =
    useAreaMode();
  const {
    updateRow,
    updateSeat,
    deleteRow,
    deleteSeat,
    clearAreaSelections,
    selectRow,
    selectSeat,
  } = useAreaActions();
  const { updateShape, saveToHistory } = useCanvasStore();

  const [activeTab, setActiveTab] = useState<
    "properties" | "style" | "transform"
  >("properties");
  const [batchValues, setBatchValues] = useState<Record<string, any>>({});
  const [isMerging, setIsMerging] = useState(false);

  // Get selected items
  const selectedRows = useMemo(() => {
    return (
      zoomedArea?.rows?.filter((row) => selectedRowIds.includes(row.id)) || []
    );
  }, [zoomedArea?.rows, selectedRowIds]);

  const selectedSeats = useMemo(() => {
    const seats: SeatShape[] = [];
    zoomedArea?.rows?.forEach((row) => {
      row.seats?.forEach((seat) => {
        if (selectedSeatIds.includes(seat.id)) {
          seats.push(seat);
        }
      });
    });
    return seats;
  }, [zoomedArea?.rows, selectedSeatIds]);

  const totalSelected = selectedRows.length + selectedSeats.length;
  const selectionType = selectedRows.length > 0 ? "rows" : "seats";

  // Calculate common values for batch editing
  useEffect(() => {
    if (selectedRows.length > 1) {
      const commonValues: Record<string, any> = {};

      // Row-specific common values
      const seatRadii = selectedRows.map((r) => r.seatRadius);
      if (seatRadii.every((r) => r === seatRadii[0])) {
        commonValues.seatRadius = seatRadii[0];
      }

      const seatSpacings = selectedRows.map((r) => r.seatSpacing);
      if (seatSpacings.every((s) => s === seatSpacings[0])) {
        commonValues.seatSpacing = seatSpacings[0];
      }

      const rotations = selectedRows.map((r) => r.rotation);
      if (rotations.every((r) => r === rotations[0])) {
        commonValues.rotation = rotations[0];
      }

      const colors = selectedRows.map((r) => r.rowColor).filter(Boolean);
      if (colors.length > 0 && colors.every((c) => c === colors[0])) {
        commonValues.rowColor = colors[0];
      }

      setBatchValues(commonValues);
    } else if (selectedSeats.length > 1) {
      const commonValues: Record<string, any> = {};

      // Seat-specific common values
      const radii = selectedSeats.map((s) => s.radius);
      if (radii.every((r) => r === radii[0])) {
        commonValues.radius = radii[0];
      }

      const categories = selectedSeats.map((s) => s.category);
      if (categories.every((c) => c === categories[0])) {
        commonValues.category = categories[0];
      }

      const prices = selectedSeats
        .map((s) => s.price)
        .filter((p) => p !== undefined);
      if (prices.length > 0 && prices.every((p) => p === prices[0])) {
        commonValues.price = prices[0];
      }

      const colors = selectedSeats.map((s) => s.fill).filter(Boolean);
      if (colors.length > 0 && colors.every((c) => c === colors[0])) {
        commonValues.fill = colors[0];
      }

      setBatchValues(commonValues);
    }
  }, [selectedRows, selectedSeats]);

  // Handle single item editing
  const handleSingleRowUpdate = useCallback(
    (updates: Partial<RowShape>) => {
      if (selectedRows.length === 1) {
        updateRow(selectedRows[0].id, updates);
        saveToHistory();
      }
    },
    [selectedRows, updateRow, saveToHistory]
  );

  const handleSingleSeatUpdate = useCallback(
    (updates: Partial<SeatShape>) => {
      if (selectedSeats.length === 1) {
        updateSeat(selectedSeats[0].id, updates);
        saveToHistory();
      }
    },
    [selectedSeats, updateSeat, saveToHistory]
  );

  // Handle batch editing
  const handleBatchRowUpdate = useCallback(
    (key: string, value: any) => {
      selectedRows.forEach((row) => {
        updateRow(row.id, { [key]: value });
      });
      setBatchValues((prev) => ({ ...prev, [key]: value }));
      saveToHistory();
    },
    [selectedRows, updateRow, saveToHistory]
  );

  const handleBatchSeatUpdate = useCallback(
    (key: string, value: any) => {
      selectedSeats.forEach((seat) => {
        updateSeat(seat.id, { [key]: value });
      });
      setBatchValues((prev) => ({ ...prev, [key]: value }));
      saveToHistory();
    },
    [selectedSeats, updateSeat, saveToHistory]
  );

  // Handle merging
  const handleMergeRows = useCallback(() => {
    if (selectedRows.length < 2) return;

    const primaryRow = selectedRows[0];
    const rowsToMerge = selectedRows.slice(1);

    // Collect all seats from rows to merge
    const allSeats: SeatShape[] = [...primaryRow.seats];
    let maxSeatNumber = Math.max(...primaryRow.seats.map((s) => s.number));

    rowsToMerge.forEach((row) => {
      row.seats.forEach((seat) => {
        allSeats.push({
          ...seat,
          id: `${primaryRow.id}_seat_${maxSeatNumber + 1}`,
          number: maxSeatNumber + 1,
          row: primaryRow.name,
        });
        maxSeatNumber++;
      });
    });

    // Update primary row with all seats
    updateRow(primaryRow.id, {
      seats: allSeats,
      name: `${primaryRow.name} (Merged)`,
    });

    // Delete the other rows
    rowsToMerge.forEach((row) => {
      deleteRow(row.id);
    });

    // Select only the merged row
    clearAreaSelections();
    selectRow(primaryRow.id, false);

    setIsMerging(false);
    saveToHistory();
  }, [
    selectedRows,
    updateRow,
    deleteRow,
    clearAreaSelections,
    selectRow,
    saveToHistory,
  ]);

  const handleMergeSeats = useCallback(() => {
    if (selectedSeats.length < 2) return;

    const primarySeat = selectedSeats[0];
    const seatsToMerge = selectedSeats.slice(1);

    // Update primary seat properties (you can customize this logic)
    updateSeat(primarySeat.id, {
      seatLabel: `${primarySeat.number} (Merged)`,
      // Could also combine prices, categories, etc.
    });

    // Delete the other seats
    seatsToMerge.forEach((seat) => {
      deleteSeat(seat.id);
    });

    // Select only the merged seat
    clearAreaSelections();
    selectSeat(primarySeat.id, false);

    setIsMerging(false);
    saveToHistory();
  }, [
    selectedSeats,
    updateSeat,
    deleteSeat,
    clearAreaSelections,
    selectSeat,
    saveToHistory,
  ]);

  // Handle area-wide updates
  const handleAreaUpdate = useCallback(
    (updates: Partial<any>) => {
      if (zoomedArea) {
        updateShape(zoomedArea.id, updates);
        saveToHistory();
      }
    },
    [zoomedArea, updateShape, saveToHistory]
  );

  const debouncedColorChange = useDebouncedCallback(
    (key: string, value: string) => {
      if (singleRow) {
        handleSingleRowUpdate({ [key]: value });
      } else if (singleSeat) {
        handleSingleSeatUpdate({ [key]: value });
      } else if (selectedRows.length > 1) {
        handleBatchRowUpdate(key, value);
      } else if (selectedSeats.length > 1) {
        handleBatchSeatUpdate(key, value);
      }
    },
    300
  );

  const debouncedAreaColorChange = useDebouncedCallback(
    (key: string, value: string) => handleAreaUpdate({ [key]: value }),
    300
  );

  if (!isInAreaMode || totalSelected === 0) {
    return (
      <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Area Properties</h2>
          <Badge variant="secondary" className="text-xs">
            {isInAreaMode ? "No selection" : "Not in area mode"}
          </Badge>
        </div>
        <div className="text-center text-gray-400 py-8">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {isInAreaMode
              ? "Select rows or seats to edit properties"
              : "Enter area mode to edit rows and seats"}
          </p>
        </div>
      </div>
    );
  }

  const singleRow = selectedRows.length === 1 ? selectedRows[0] : null;
  const singleSeat = selectedSeats.length === 1 ? selectedSeats[0] : null;

  return (
    <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Area Editor</h2>
        <Badge variant="secondary" className="text-xs">
          {totalSelected} {selectionType}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 text-white mb-4">
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "properties"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("properties")}
        >
          Properties
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "style"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("style")}
        >
          Style
        </button>
        <button
          className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "transform"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("transform")}
        >
          Transform
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "properties" && (
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Edit3 className="w-4 h-4 mr-2" />
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Single Row Editing */}
              {singleRow && (
                <div>
                  <div className="space-y-2">
                    <Label className="text-xs">Row Name</Label>
                    <Input
                      value={singleRow.name}
                      onChange={(e) =>
                        handleSingleRowUpdate({ name: e.target.value })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Seat Radius</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        value={[singleRow.seatRadius]}
                        onValueChange={(value) =>
                          handleSingleRowUpdate({ seatRadius: value[0] })
                        }
                        max={20}
                        min={4}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs w-8">
                        {singleRow.seatRadius}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Seat Spacing</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        value={[singleRow.seatSpacing]}
                        onValueChange={(value) =>
                          handleSingleRowUpdate({ seatSpacing: value[0] })
                        }
                        max={50}
                        min={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs w-8">
                        {singleRow.seatSpacing}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={singleRow.rowCategory || "standard"}
                      onValueChange={(value) =>
                        handleSingleRowUpdate({ rowCategory: value as any })
                      }
                    >
                      <SelectTrigger className="h-8 bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="accessible">Accessible</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Single Seat Editing */}
              {singleSeat && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Seat Number</Label>
                    <Input
                      type="number"
                      value={singleSeat.number}
                      onChange={(e) =>
                        handleSingleSeatUpdate({
                          number: parseInt(e.target.value),
                        })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Seat Label</Label>
                    <Input
                      value={singleSeat.seatLabel || ""}
                      onChange={(e) =>
                        handleSingleSeatUpdate({ seatLabel: e.target.value })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                      placeholder="Custom label"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      value={singleSeat.price || ""}
                      onChange={(e) =>
                        handleSingleSeatUpdate({
                          price: parseFloat(e.target.value),
                        })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={singleSeat.category || "standard"}
                      onValueChange={(value) =>
                        handleSingleSeatUpdate({ category: value as any })
                      }
                    >
                      <SelectTrigger className="h-8 bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="accessible">Accessible</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={singleSeat.status}
                      onValueChange={(value) =>
                        handleSingleSeatUpdate({ status: value as any })
                      }
                    >
                      <SelectTrigger className="h-8 bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Batch Editing */}
              {selectedRows.length > 1 && (
                <>
                  <div className="text-xs text-gray-400 mb-2">
                    Batch Edit Rows
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Seat Radius</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        value={[batchValues.seatRadius || 8]}
                        onValueChange={(value) =>
                          handleBatchRowUpdate("seatRadius", value[0])
                        }
                        max={20}
                        min={4}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs w-8">
                        {batchValues.seatRadius || 8}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Seat Spacing</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        value={[batchValues.seatSpacing || 20]}
                        onValueChange={(value) =>
                          handleBatchRowUpdate("seatSpacing", value[0])
                        }
                        max={50}
                        min={10}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs w-8">
                        {batchValues.seatSpacing || 20}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {selectedSeats.length > 1 && (
                <>
                  <div className="text-xs text-gray-400 mb-2">
                    Batch Edit Seats
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={batchValues.category || ""}
                      onValueChange={(value) =>
                        handleBatchSeatUpdate("category", value)
                      }
                    >
                      <SelectTrigger className="h-8 bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="accessible">Accessible</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      value={batchValues.price || ""}
                      onChange={(e) =>
                        handleBatchSeatUpdate(
                          "price",
                          parseFloat(e.target.value)
                        )
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                      placeholder="Set price for all"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "style" && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* FIX: Fill Color with Debouncing */}
              <div className="space-y-2">
                <Label className="text-xs">Fill Color</Label>
                <Input
                  type="color"
                  value={
                    singleRow?.rowColor ||
                    singleSeat?.fill ||
                    batchValues.fill ||
                    "#4CAF50"
                  }
                  onChange={(e) => {
                    debouncedColorChange("fill", e.target.value);
                  }}
                  className="h-8 bg-gray-700 border-gray-600"
                />
              </div>

              {/* FIX: Stroke Color with Debouncing */}
              <div className="space-y-2">
                <Label className="text-xs">Stroke Color</Label>
                <Input
                  type="color"
                  value={
                    singleRow?.stroke ||
                    singleSeat?.stroke ||
                    batchValues.stroke ||
                    "#2E7D32"
                  }
                  onChange={(e) => {
                    debouncedColorChange("stroke", e.target.value);
                  }}
                  className="h-8 bg-gray-700 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Stroke Width</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[
                      singleRow?.strokeWidth ||
                        singleSeat?.strokeWidth ||
                        batchValues.strokeWidth ||
                        1,
                    ]}
                    onValueChange={(value) => {
                      if (singleRow) {
                        handleSingleRowUpdate({ strokeWidth: value[0] });
                      } else if (singleSeat) {
                        handleSingleSeatUpdate({ strokeWidth: value[0] });
                      } else if (selectedRows.length > 1) {
                        handleBatchRowUpdate("strokeWidth", value[0]);
                      } else if (selectedSeats.length > 1) {
                        handleBatchSeatUpdate("strokeWidth", value[0]);
                      }
                    }}
                    max={5}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">
                    {singleRow?.strokeWidth ||
                      singleSeat?.strokeWidth ||
                      batchValues.strokeWidth ||
                      1}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "transform" && (
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <RotateCw className="w-4 h-4 mr-2" />
                Transform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Only show rotation for rows */}
              {(singleRow || selectedRows.length > 1) && (
                <div className="space-y-2">
                  <Label className="text-xs">Rotation</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[singleRow?.rotation || batchValues.rotation || 0]}
                      onValueChange={(value) => {
                        if (singleRow) {
                          handleSingleRowUpdate({ rotation: value[0] });
                        } else if (selectedRows.length > 1) {
                          handleBatchRowUpdate("rotation", value[0]);
                        }
                      }}
                      max={360}
                      min={0}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs w-12">
                      {singleRow?.rotation || batchValues.rotation || 0}°
                    </span>
                  </div>
                </div>
              )}

              {/* Position controls for single items */}
              {singleRow && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Position X</Label>
                    <Input
                      type="number"
                      value={singleRow.startX}
                      onChange={(e) =>
                        handleSingleRowUpdate({
                          startX: parseFloat(e.target.value),
                        })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Position Y</Label>
                    <Input
                      type="number"
                      value={singleRow.startY}
                      onChange={(e) =>
                        handleSingleRowUpdate({
                          startY: parseFloat(e.target.value),
                        })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                    />
                  </div>
                </>
              )}

              {singleSeat && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Position X</Label>
                    <Input
                      type="number"
                      value={singleSeat.x}
                      onChange={(e) =>
                        handleSingleSeatUpdate({
                          x: parseFloat(e.target.value),
                        })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Position Y</Label>
                    <Input
                      type="number"
                      value={singleSeat.y}
                      onChange={(e) =>
                        handleSingleSeatUpdate({
                          y: parseFloat(e.target.value),
                        })
                      }
                      className="h-8 bg-gray-700 border-gray-600"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Area-wide Settings */}
        {zoomedArea && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Area Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Default Seat Radius</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[zoomedArea.defaultSeatRadius || 8]}
                    onValueChange={(value) =>
                      handleAreaUpdate({ defaultSeatRadius: value[0] })
                    }
                    max={20}
                    min={4}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">
                    {zoomedArea.defaultSeatRadius || 8}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Default Seat Spacing</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[zoomedArea.defaultSeatSpacing || 20]}
                    onValueChange={(value) =>
                      handleAreaUpdate({ defaultSeatSpacing: value[0] })
                    }
                    max={50}
                    min={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">
                    {zoomedArea.defaultSeatSpacing || 20}
                  </span>
                </div>
              </div>

              {/* FIX: Default Seat Color with Debouncing */}
              <div className="space-y-2">
                <Label className="text-xs">Default Seat Color</Label>
                <Input
                  type="color"
                  value={zoomedArea.defaultSeatColor || "#4CAF50"}
                  onChange={(e) => {
                    debouncedAreaColorChange(
                      "defaultSeatColor",
                      e.target.value
                    );
                  }}
                  className="h-8 bg-gray-700 border-gray-600"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {/* Merge Button */}
              {totalSelected > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsMerging(true)}
                >
                  <Merge className="w-4 h-4 mr-2" />
                  Merge
                </Button>
              )}

              {/* Delete Button */}
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  selectedRows.forEach((row) => deleteRow(row.id));
                  selectedSeats.forEach((seat) => deleteSeat(seat.id));
                  clearAreaSelections();
                  saveToHistory();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Selection Summary */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Selection Summary</Label>
              {selectedRows.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedRows.map((row) => (
                    <Badge key={row.id} variant="outline" className="text-xs">
                      {row.name} ({row.seats.length} seats)
                    </Badge>
                  ))}
                </div>
              )}
              {selectedSeats.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedSeats.slice(0, 8).map((seat) => (
                    <Badge key={seat.id} variant="outline" className="text-xs">
                      {seat.row}-{seat.number}
                    </Badge>
                  ))}
                  {selectedSeats.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedSeats.length - 8} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merge Confirmation Modal */}
      {isMerging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Merge</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to merge {totalSelected} {selectionType}?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsMerging(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={
                  selectedRows.length > 0 ? handleMergeRows : handleMergeSeats
                }
                className="flex-1"
              >
                Merge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
