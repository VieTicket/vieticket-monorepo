import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Settings } from "lucide-react";
import { useAreaMode } from "../store/main-store";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface AreaSettingsCardProps {
  handlers: any;
  // FIX: Add optional shape prop for polygon mode
  shape?: any;
}

export function AreaSettingsCard({ handlers, shape }: AreaSettingsCardProps) {
  const { zoomedArea } = useAreaMode();

  // FIX: Use shape if provided (for polygon mode), otherwise use zoomedArea
  const targetArea = shape || zoomedArea;

  // FIX: For polygon shapes, we need to ensure they have area properties
  const defaultSeatRadius =
    targetArea?.defaultSeatRadius || targetArea?.seatRadius || 8;
  const defaultSeatSpacing =
    targetArea?.defaultSeatSpacing || targetArea?.seatSpacing || 20;
  const defaultSeatColor =
    targetArea?.defaultSeatColor || targetArea?.fill || "#4CAF50";

  // FIX: Add debounced callback for color changes
  const debouncedColorChange = useDebouncedCallback(
    (value: string) => {
      const updates = shape
        ? { defaultSeatColor: value, fill: value } // For polygon shapes, update both
        : { defaultSeatColor: value };
      handlers.handleAreaUpdate(updates);
    },
    300 // 300ms delay
  );

  // Inline edit hooks for area settings (keep as click-to-edit for numbers)
  const defaultSeatRadiusEdit = useStoreInlineEdit(
    `area-default-seat-radius-${targetArea?.id}`,
    defaultSeatRadius,
    (value) => {
      const numValue = parseInt(value) || 8;
      const updates = shape
        ? { defaultSeatRadius: numValue, seatRadius: numValue } // For polygon shapes
        : { defaultSeatRadius: numValue };
      handlers.handleAreaUpdate(updates);
    }
  );

  const defaultSeatSpacingEdit = useStoreInlineEdit(
    `area-default-seat-spacing-${targetArea?.id}`,
    defaultSeatSpacing,
    (value) => {
      const numValue = parseInt(value) || 20;
      const updates = shape
        ? { defaultSeatSpacing: numValue, seatSpacing: numValue } // For polygon shapes
        : { defaultSeatSpacing: numValue };
      handlers.handleAreaUpdate(updates);
    }
  );

  if (!targetArea) return null;

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          {shape ? "Polygon Area Settings" : "Area Settings"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Default Seat Radius</Label>
          {defaultSeatRadiusEdit.isEditing ? (
            <Input
              type="number"
              value={defaultSeatRadiusEdit.editValue}
              onChange={(e) =>
                defaultSeatRadiusEdit.setEditValue(e.target.value)
              }
              className="h-8 mt-1"
              min="4"
              max="20"
              autoFocus
              {...defaultSeatRadiusEdit.eventHandlers}
            />
          ) : (
            <div
              className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
              {...defaultSeatRadiusEdit.eventHandlers}
            >
              <span className="text-gray-300">{defaultSeatRadius}px</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Default Seat Spacing</Label>
          {defaultSeatSpacingEdit.isEditing ? (
            <Input
              type="number"
              value={defaultSeatSpacingEdit.editValue}
              onChange={(e) =>
                defaultSeatSpacingEdit.setEditValue(e.target.value)
              }
              className="h-8 mt-1"
              min="10"
              max="50"
              autoFocus
              {...defaultSeatSpacingEdit.eventHandlers}
            />
          ) : (
            <div
              className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
              {...defaultSeatSpacingEdit.eventHandlers}
            >
              <span className="text-gray-300">{defaultSeatSpacing}px</span>
            </div>
          )}
        </div>

        {/* FIX: Default Seat Color with Debounced Input */}
        <div className="space-y-2">
          <Label className="text-xs">Default Seat Color</Label>
          <Input
            type="color"
            value={defaultSeatColor}
            onChange={(e) => {
              debouncedColorChange(e.target.value);
            }}
            className="border-gray-600 h-10 mt-1"
            title="Default Seat Color"
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
