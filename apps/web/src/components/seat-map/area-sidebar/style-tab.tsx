import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Palette } from "lucide-react";
import { RowShape, SeatShape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface StyleTabProps {
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
  singleRow: RowShape | null;
  singleSeat: SeatShape | null;
  batchValues: Record<string, any>;
  handlers: any;
}

export function StyleTab({
  selectedRows,
  selectedSeats,
  singleRow,
  singleSeat,
  batchValues,
  handlers,
}: StyleTabProps) {
  // Determine current values for editing
  const currentFill =
    singleRow?.fill || singleSeat?.fill || batchValues.fill || "#4CAF50";
  const currentStroke =
    singleRow?.stroke || singleSeat?.stroke || batchValues.stroke || "#2E7D32";
  const currentStrokeWidth =
    singleRow?.strokeWidth ||
    singleSeat?.strokeWidth ||
    batchValues.strokeWidth ||
    1;

  // FIX: Add debounced callbacks for color changes
  const debouncedFillChange = useDebouncedCallback(
    (value: string) => {
      if (singleRow) {
        handlers.handleSingleRowUpdate({ fill: value });
      } else if (singleSeat) {
        handlers.handleSingleSeatUpdate({ fill: value });
      } else if (selectedRows.length > 1) {
        handlers.handleBatchRowUpdate("fill", value);
      } else if (selectedSeats.length > 1) {
        handlers.handleBatchSeatUpdate("fill", value);
      }
    },
    300 // 300ms delay
  );

  const debouncedStrokeChange = useDebouncedCallback(
    (value: string) => {
      if (singleRow) {
        handlers.handleSingleRowUpdate({ stroke: value });
      } else if (singleSeat) {
        handlers.handleSingleSeatUpdate({ stroke: value });
      } else if (selectedRows.length > 1) {
        handlers.handleBatchRowUpdate("stroke", value);
      } else if (selectedSeats.length > 1) {
        handlers.handleBatchSeatUpdate("stroke", value);
      }
    },
    300 // 300ms delay
  );

  // Inline edit hook for stroke width (keep as click-to-edit)
  const strokeWidthEdit = useStoreInlineEdit(
    `stroke-width-${singleRow?.id || singleSeat?.id || "batch"}`,
    currentStrokeWidth,
    (value) => {
      const numValue = parseInt(value) || 1;
      if (singleRow) {
        handlers.handleSingleRowUpdate({ strokeWidth: numValue });
      } else if (singleSeat) {
        handlers.handleSingleSeatUpdate({ strokeWidth: numValue });
      } else if (selectedRows.length > 1) {
        handlers.handleBatchRowUpdate("strokeWidth", numValue);
      } else if (selectedSeats.length > 1) {
        handlers.handleBatchSeatUpdate("strokeWidth", numValue);
      }
    }
  );

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Palette className="w-4 h-4 mr-2" />
          Style
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FIX: Fill Color with Debounced Input */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Fill Color
          </Label>
          <Input
            type="color"
            value={currentFill}
            onChange={(e) => {
              debouncedFillChange(e.target.value);
            }}
            className="border-gray-600 h-10 mt-1"
            title="Fill Color"
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
        </div>

        {/* FIX: Stroke Color with Debounced Input */}
        <div className="space-y-2">
          <Label className="text-xs">Stroke Color</Label>
          <Input
            type="color"
            value={currentStroke}
            onChange={(e) => {
              debouncedStrokeChange(e.target.value);
            }}
            className="border-gray-600 h-10 mt-1"
            title="Stroke Color"
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
        </div>

        {/* Stroke Width - Keep as click-to-edit */}
        <div className="space-y-2">
          <Label className="text-xs">Stroke Width</Label>
          {strokeWidthEdit.isEditing ? (
            <Input
              type="number"
              value={strokeWidthEdit.editValue}
              onChange={(e) => strokeWidthEdit.setEditValue(e.target.value)}
              className="h-8 mt-1"
              min="1"
              max="5"
              autoFocus
              {...strokeWidthEdit.eventHandlers}
            />
          ) : (
            <div
              className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
              {...strokeWidthEdit.eventHandlers}
            >
              <span className="text-gray-300">{currentStrokeWidth}px</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
