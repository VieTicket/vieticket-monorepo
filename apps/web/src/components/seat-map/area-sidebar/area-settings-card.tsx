import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Settings } from "lucide-react";
import { useAreaMode } from "../store/main-store";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

interface AreaSettingsCardProps {
  handlers: any;
  // For polygon mode
  shape?: any;
}

export function AreaSettingsCard({ handlers, shape }: AreaSettingsCardProps) {
  const { zoomedArea } = useAreaMode();

  // Use shape if provided (for polygon mode), otherwise use zoomedArea
  const targetArea = shape || zoomedArea;

  // Extract area settings with proper fallbacks
  const defaultSeatRadius = targetArea?.defaultSeatRadius || 8;
  const defaultSeatSpacing = targetArea?.defaultSeatSpacing || 20;
  const defaultRowSpacing = targetArea?.defaultRowSpacing || 30;
  const defaultSeatCategory = targetArea?.defaultSeatCategory || "standard";
  const defaultSeatColor = targetArea?.defaultSeatColor || "#4CAF50";
  const defaultPrice = targetArea?.defaultPrice || 50;

  // Debounced callback for color changes
  const debouncedColorChange = useDebouncedCallback(
    (value: string) => {
      handlers.handleAreaUpdate({ defaultSeatColor: value });
    },
    300 // 300ms delay
  );

  // Debounced callback for price changes
  const debouncedPriceChange = useDebouncedCallback(
    (value: string) => {
      const numValue = parseInt(value) || 0;
      handlers.handleAreaUpdate({ defaultPrice: numValue });
    },
    300 // 300ms delay
  );

  // Inline edit hooks for area settings
  const defaultSeatRadiusEdit = useStoreInlineEdit(
    `area-default-seat-radius-${targetArea?.id}`,
    defaultSeatRadius,
    (value) => {
      const numValue = parseInt(value) || 8;
      handlers.handleAreaUpdate({ defaultSeatRadius: numValue });
    }
  );

  const defaultSeatSpacingEdit = useStoreInlineEdit(
    `area-default-seat-spacing-${targetArea?.id}`,
    defaultSeatSpacing,
    (value) => {
      const numValue = parseInt(value) || 20;
      handlers.handleAreaUpdate({ defaultSeatSpacing: numValue });
    }
  );

  const defaultRowSpacingEdit = useStoreInlineEdit(
    `area-default-row-spacing-${targetArea?.id}`,
    defaultRowSpacing,
    (value) => {
      const numValue = parseInt(value) || 30;
      handlers.handleAreaUpdate({ defaultRowSpacing: numValue });
    }
  );

  const handleCategoryChange = (category: string) => {
    handlers.handleAreaUpdate({
      defaultSeatCategory: category as
        | "standard"
        | "premium"
        | "accessible"
        | "restricted",
    });
  };

  // Reset edit values when area changes
  useEffect(() => {
    defaultSeatRadiusEdit.setEditValue(defaultSeatRadius.toString());
    defaultSeatSpacingEdit.setEditValue(defaultSeatSpacing.toString());
    defaultRowSpacingEdit.setEditValue(defaultRowSpacing.toString());
  }, [targetArea?.id]);

  if (!targetArea) return null;

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center">
          <Settings className="w-4 h-4 mx-2" />
          Area Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Default Seat Radius */}
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

        {/* Default Seat Spacing */}
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

        {/* Default Row Spacing */}
        <div className="space-y-2">
          <Label className="text-xs">Default Row Spacing</Label>
          {defaultRowSpacingEdit.isEditing ? (
            <Input
              type="number"
              value={defaultRowSpacingEdit.editValue}
              onChange={(e) =>
                defaultRowSpacingEdit.setEditValue(e.target.value)
              }
              className="h-8 mt-1"
              min="15"
              max="60"
              autoFocus
              {...defaultRowSpacingEdit.eventHandlers}
            />
          ) : (
            <div
              className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
              {...defaultRowSpacingEdit.eventHandlers}
            >
              <span className="text-gray-300">{defaultRowSpacing}px</span>
            </div>
          )}
        </div>

        {/* Default Seat Color */}
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

        {/* Default Seat Category */}
        <div className="space-y-2">
          <Label className="text-xs">Default Seat Category</Label>
          <Select
            value={defaultSeatCategory}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="h-8 mt-1 border-gray-600 bg-gray-800">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 text-white border-gray-700">
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="accessible">Accessible</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Price */}
        <div className="space-y-2">
          <Label className="text-xs">Default Price</Label>
          <Input
            type="number"
            value={defaultPrice}
            onChange={(e) => debouncedPriceChange(e.target.value)}
            className="h-8 mt-1 border-gray-600 bg-gray-800 text-white"
            min="0"
            step="5"
          />
        </div>
      </CardContent>
    </Card>
  );
}
