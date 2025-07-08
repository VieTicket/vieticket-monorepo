import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Edit3 } from "lucide-react";
import { RowShape, SeatShape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";

interface PropertiesTabProps {
  selectedRows: RowShape[];
  selectedSeats: SeatShape[];
  singleRow: RowShape | null;
  singleSeat: SeatShape | null;
  batchValues: Record<string, any>;
  handlers: any;
}

export function PropertiesTab({
  selectedRows,
  selectedSeats,
  singleRow,
  singleSeat,
  batchValues,
  handlers,
}: PropertiesTabProps) {
  // Inline edit hooks for single row
  const rowNameEdit = useStoreInlineEdit(
    `row-name-${singleRow?.id}`,
    singleRow?.name || "",
    (value) => handlers.handleSingleRowUpdate({ name: value })
  );

  const seatRadiusEdit = useStoreInlineEdit(
    `seat-radius-${singleRow?.id}`,
    singleRow?.seatRadius || 8,
    (value) => handlers.handleSingleRowUpdate({ seatRadius: parseInt(value) || 8 })
  );

  const seatSpacingEdit = useStoreInlineEdit(
    `seat-spacing-${singleRow?.id}`,
    singleRow?.seatSpacing || 20,
    (value) => handlers.handleSingleRowUpdate({ seatSpacing: parseInt(value) || 20 })
  );

  // Inline edit hooks for single seat
  const seatNumberEdit = useStoreInlineEdit(
    `seat-number-${singleSeat?.id}`,
    singleSeat?.number || 1,
    (value) => handlers.handleSingleSeatUpdate({ number: parseInt(value) || 1 })
  );

  const seatLabelEdit = useStoreInlineEdit(
    `seat-label-${singleSeat?.id}`,
    singleSeat?.seatLabel || "",
    (value) => handlers.handleSingleSeatUpdate({ seatLabel: value })
  );

  const seatPriceEdit = useStoreInlineEdit(
    `seat-price-${singleSeat?.id}`,
    singleSeat?.price || 0,
    (value) => handlers.handleSingleSeatUpdate({ price: parseFloat(value) || 0 })
  );

  // Inline edit hooks for batch editing
  const batchSeatRadiusEdit = useStoreInlineEdit(
    `batch-seat-radius`,
    batchValues.seatRadius || 8,
    (value) => handlers.handleBatchRowUpdate("seatRadius", parseInt(value) || 8)
  );

  const batchSeatSpacingEdit = useStoreInlineEdit(
    `batch-seat-spacing`,
    batchValues.seatSpacing || 20,
    (value) => handlers.handleBatchRowUpdate("seatSpacing", parseInt(value) || 20)
  );

  const batchSeatPriceEdit = useStoreInlineEdit(
    `batch-seat-price`,
    batchValues.price || "",
    (value) => handlers.handleBatchSeatUpdate("price", parseFloat(value) || 0)
  );

  return (
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Row Name</Label>
              {rowNameEdit.isEditing ? (
                <input
                  type="text"
                  value={rowNameEdit.editValue}
                  onChange={(e) => rowNameEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  autoFocus
                  {...rowNameEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...rowNameEdit.eventHandlers}
                >
                  {singleRow.name || "Click to edit"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Seat Radius</Label>
              {seatRadiusEdit.isEditing ? (
                <input
                  type="number"
                  value={seatRadiusEdit.editValue}
                  onChange={(e) => seatRadiusEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  min="4"
                  max="20"
                  autoFocus
                  {...seatRadiusEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatRadiusEdit.eventHandlers}
                >
                  {singleRow.seatRadius}px
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Seat Spacing</Label>
              {seatSpacingEdit.isEditing ? (
                <input
                  type="number"
                  value={seatSpacingEdit.editValue}
                  onChange={(e) => seatSpacingEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  min="10"
                  max="50"
                  autoFocus
                  {...seatSpacingEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatSpacingEdit.eventHandlers}
                >
                  {singleRow.seatSpacing}px
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select
                value={singleRow.rowCategory || "standard"}
                onValueChange={(value) =>
                  handlers.handleSingleRowUpdate({ rowCategory: value as any })
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Seat Number</Label>
              {seatNumberEdit.isEditing ? (
                <input
                  type="number"
                  value={seatNumberEdit.editValue}
                  onChange={(e) => seatNumberEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  min="1"
                  autoFocus
                  {...seatNumberEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatNumberEdit.eventHandlers}
                >
                  {singleSeat.number}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Seat Label</Label>
              {seatLabelEdit.isEditing ? (
                <input
                  type="text"
                  value={seatLabelEdit.editValue}
                  onChange={(e) => seatLabelEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  placeholder="Custom label"
                  autoFocus
                  {...seatLabelEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatLabelEdit.eventHandlers}
                >
                  {singleSeat.seatLabel || "Click to add label"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Price</Label>
              {seatPriceEdit.isEditing ? (
                <input
                  type="number"
                  value={seatPriceEdit.editValue}
                  onChange={(e) => seatPriceEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  autoFocus
                  {...seatPriceEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...seatPriceEdit.eventHandlers}
                >
                  ${singleSeat.price || 0}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select
                value={singleSeat.category || "standard"}
                onValueChange={(value) =>
                  handlers.handleSingleSeatUpdate({ category: value as any })
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
                  handlers.handleSingleSeatUpdate({ status: value as any })
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
          </div>
        )}

        {/* Batch Editing */}
        {selectedRows.length > 1 && (
          <div className="space-y-4">
            <div className="text-xs text-gray-400 mb-2">Batch Edit Rows</div>

            <div className="space-y-2">
              <Label className="text-xs">Seat Radius</Label>
              {batchSeatRadiusEdit.isEditing ? (
                <input
                  type="number"
                  value={batchSeatRadiusEdit.editValue}
                  onChange={(e) => batchSeatRadiusEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  min="4"
                  max="20"
                  autoFocus
                  {...batchSeatRadiusEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...batchSeatRadiusEdit.eventHandlers}
                >
                  {batchValues.seatRadius || 8}px
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Seat Spacing</Label>
              {batchSeatSpacingEdit.isEditing ? (
                <input
                  type="number"
                  value={batchSeatSpacingEdit.editValue}
                  onChange={(e) => batchSeatSpacingEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  min="10"
                  max="50"
                  autoFocus
                  {...batchSeatSpacingEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...batchSeatSpacingEdit.eventHandlers}
                >
                  {batchValues.seatSpacing || 20}px
                </div>
              )}
            </div>
          </div>
        )}

        {selectedSeats.length > 1 && (
          <div className="space-y-4">
            <div className="text-xs text-gray-400 mb-2">Batch Edit Seats</div>

            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select
                value={batchValues.category || ""}
                onValueChange={(value) =>
                  handlers.handleBatchSeatUpdate("category", value)
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
              {batchSeatPriceEdit.isEditing ? (
                <input
                  type="number"
                  value={batchSeatPriceEdit.editValue}
                  onChange={(e) => batchSeatPriceEdit.setEditValue(e.target.value)}
                  className="h-8 bg-gray-700 border-gray-600 text-white px-2 rounded w-full"
                  step="0.01"
                  min="0"
                  placeholder="Set price for all"
                  autoFocus
                  {...batchSeatPriceEdit.eventHandlers}
                />
              ) : (
                <div
                  className="h-8 bg-gray-700 border border-gray-600 text-white px-2 rounded flex items-center cursor-pointer hover:bg-gray-600"
                  {...batchSeatPriceEdit.eventHandlers}
                >
                  {batchValues.price ? `$${batchValues.price}` : "Click to set price for all"}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}