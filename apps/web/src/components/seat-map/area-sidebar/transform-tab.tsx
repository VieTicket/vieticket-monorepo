import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { RotateCw } from "lucide-react";
import { RowShape, SeatShape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";

interface TransformTabProps {
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
  singleRow: RowShape | null;
  singleSeat: SeatShape | null;
  batchValues: Record<string, any>;
  handlers: any;
}

export function TransformTab({
  selectedRows,
  selectedSeats,
  singleRow,
  singleSeat,
  batchValues,
  handlers,
}: TransformTabProps) {
  // Inline edit hooks for rotation
  const rotationEdit = useStoreInlineEdit(
    `rotation-${singleRow?.id || "batch"}`,
    singleRow?.rotation || batchValues.rotation || 0,
    (value) => {
      const numValue = parseInt(value) || 0;
      if (singleRow) {
        handlers.handleSingleRowUpdate({ rotation: numValue });
      } else if (selectedRows.length > 1) {
        handlers.handleBatchRowUpdate("rotation", numValue);
      }
    }
  );

  // Inline edit hooks for single row position
  const rowStartXEdit = useStoreInlineEdit(
    `row-startx-${singleRow?.id}`,
    singleRow?.startX || 0,
    (value) =>
      handlers.handleSingleRowUpdate({ startX: parseFloat(value) || 0 })
  );

  const rowStartYEdit = useStoreInlineEdit(
    `row-starty-${singleRow?.id}`,
    singleRow?.startY || 0,
    (value) =>
      handlers.handleSingleRowUpdate({ startY: parseFloat(value) || 0 })
  );

  // Inline edit hooks for single seat position
  const seatXEdit = useStoreInlineEdit(
    `seat-x-${singleSeat?.id}`,
    singleSeat?.x || 0,
    (value) => handlers.handleSingleSeatUpdate({ x: parseFloat(value) || 0 })
  );

  const seatYEdit = useStoreInlineEdit(
    `seat-y-${singleSeat?.id}`,
    singleSeat?.y || 0,
    (value) => handlers.handleSingleSeatUpdate({ y: parseFloat(value) || 0 })
  );

  return (
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
            {rotationEdit.isEditing ? (
              <input
                type="number"
                value={rotationEdit.editValue}
                onChange={(e) => rotationEdit.setEditValue(e.target.value)}
                className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                min="0"
                max="360"
                autoFocus
                {...rotationEdit.eventHandlers}
              />
            ) : (
              <div
                className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                {...rotationEdit.eventHandlers}
              >
                {singleRow?.rotation || batchValues.rotation || 0}°
              </div>
            )}
          </div>
        )}

        {singleRow && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Position X</Label>
              {rowStartXEdit.isEditing ? (
                <input
                  type="number"
                  value={Math.round(rowStartXEdit.editValue)}
                  onChange={(e) => rowStartXEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  step="0.1"
                  autoFocus
                  {...rowStartXEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...rowStartXEdit.eventHandlers}
                >
                  {Math.round(singleRow.startX)}px
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Position Y</Label>
              {rowStartYEdit.isEditing ? (
                <input
                  type="number"
                  value={Math.round(rowStartYEdit.editValue)}
                  onChange={(e) => rowStartYEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  step="0.1"
                  autoFocus
                  {...rowStartYEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...rowStartYEdit.eventHandlers}
                >
                  {Math.round(singleRow.startY)}px
                </div>
              )}
            </div>
          </>
        )}

        {singleSeat && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Position X</Label>
              {seatXEdit.isEditing ? (
                <input
                  type="number"
                  value={seatXEdit.editValue}
                  onChange={(e) => seatXEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  step="0.1"
                  autoFocus
                  {...seatXEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatXEdit.eventHandlers}
                >
                  {singleSeat.x}px
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Position Y</Label>
              {seatYEdit.isEditing ? (
                <input
                  type="number"
                  value={seatYEdit.editValue}
                  onChange={(e) => seatYEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  step="0.1"
                  autoFocus
                  {...seatYEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatYEdit.eventHandlers}
                >
                  {singleSeat.y}px
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
