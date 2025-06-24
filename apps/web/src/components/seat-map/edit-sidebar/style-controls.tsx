"use client";

import React from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Slider } from "../../ui/slider";
import { Palette } from "lucide-react";
import { Shape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";

interface StyleControlsProps {
  selectedShapes: Shape[];
  batchValues: Record<string, any>;
  onBatchChange: (key: string, value: any) => void;
}

export const StyleControls: React.FC<StyleControlsProps> = ({
  selectedShapes,
  batchValues,
  onBatchChange,
}) => {
  // Create unique IDs for batch editing
  const editId =
    selectedShapes.length === 1
      ? selectedShapes[0].id
      : `batch-${selectedShapes.map((s) => s.id).join("-")}`;

  // FIXED: Safe value parsing functions
  const safeParseFloat = (value: any, defaultValue: number): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const safeFormatValue = (value: any, defaultValue: any): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return String(defaultValue);
    }
    return String(value);
  };

  // Inline editing hooks for each property with safe parsing
  const strokeWidthEdit = useStoreInlineEdit(
    `${editId}-strokeWidth`,
    safeFormatValue(batchValues.strokeWidth, 1),
    (value) => onBatchChange("strokeWidth", safeParseFloat(value, 1))
  );

  const opacityEdit = useStoreInlineEdit(
    `${editId}-opacity`,
    safeFormatValue(Math.round((batchValues.opacity || 1) * 100), 100),
    (value) => onBatchChange("opacity", safeParseFloat(value, 100) / 100)
  );

  const cornerRadiusEdit = useStoreInlineEdit(
    `${editId}-cornerRadius`,
    safeFormatValue(batchValues.cornerRadius, 0),
    (value) => onBatchChange("cornerRadius", safeParseFloat(value, 0))
  );

  const radiusEdit = useStoreInlineEdit(
    `${editId}-radius`,
    safeFormatValue(batchValues.radius, 50),
    (value) => onBatchChange("radius", safeParseFloat(value, 50))
  );

  return (
    <div className="space-y-4 text-white">
      {/* Fill Color */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Palette className="w-3 h-3" />
          Fill Color
        </Label>
        <Input
          type="color"
          value={batchValues.fill || "#ffffff"}
          onChange={(e) => onBatchChange("fill", e.target.value)}
          className="h-10 mt-1"
          title="Fill Color"
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>

      {/* Stroke Color */}
      <div>
        <Label className="text-xs">Stroke Color</Label>
        <Input
          type="color"
          value={batchValues.stroke || "#000000"}
          onChange={(e) => onBatchChange("stroke", e.target.value)}
          className="h-10 mt-1"
          title="Stroke Color"
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      </div>

      {/* Stroke Width with Inline Editing */}
      <div>
        <Label className="text-xs">Stroke Width</Label>
        {strokeWidthEdit.isEditing ? (
          <Input
            type="number"
            min="0"
            max="20"
            step="0.5"
            value={strokeWidthEdit.editValue}
            onChange={(e) => strokeWidthEdit.setEditValue(e.target.value)}
            className="h-8 mt-1"
            autoFocus
            {...strokeWidthEdit.eventHandlers}
          />
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
            {...strokeWidthEdit.eventHandlers}
          >
            <span className="text-gray-300">
              {safeFormatValue(batchValues.strokeWidth, 1)}px
            </span>
          </div>
        )}
      </div>

      {/* Opacity with Inline Editing */}
      <div>
        <Label className="text-xs">Opacity</Label>
        {opacityEdit.isEditing ? (
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={opacityEdit.editValue}
            onChange={(e) => opacityEdit.setEditValue(e.target.value)}
            className="h-8 mt-1"
            placeholder="0-100"
            autoFocus
            {...opacityEdit.eventHandlers}
          />
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
            {...opacityEdit.eventHandlers}
          >
            <span className="text-gray-300">
              {safeFormatValue(
                Math.round((batchValues.opacity || 1) * 100),
                100
              )}
              %
            </span>
          </div>
        )}
        <Slider
          value={[(batchValues.opacity || 1) * 100]}
          onValueChange={(value) => onBatchChange("opacity", value[0] / 100)}
          max={100}
          step={1}
          className="mt-2"
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* Corner Radius (for rectangles) with Inline Editing */}
      {selectedShapes.some((s) => s.type === "rect") && (
        <div>
          <Label className="text-xs">Corner Radius (Rectangles)</Label>
          {cornerRadiusEdit.isEditing ? (
            <Input
              type="number"
              min="0"
              max="50"
              value={cornerRadiusEdit.editValue}
              onChange={(e) => cornerRadiusEdit.setEditValue(e.target.value)}
              className="h-8 mt-1"
              autoFocus
              {...cornerRadiusEdit.eventHandlers}
            />
          ) : (
            <div
              className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
              {...cornerRadiusEdit.eventHandlers}
            >
              <span className="text-gray-300">
                {safeFormatValue(batchValues.cornerRadius, 0)}px
              </span>
            </div>
          )}
        </div>
      )}

      {/* Radius (for circles) with Inline Editing */}
      {selectedShapes.some((s) => s.type === "circle") && (
        <div>
          <Label className="text-xs">Radius (Circles)</Label>
          {radiusEdit.isEditing ? (
            <Input
              type="number"
              min="1"
              max="200"
              value={radiusEdit.editValue}
              onChange={(e) => radiusEdit.setEditValue(e.target.value)}
              className="h-8 mt-1"
              autoFocus
              {...radiusEdit.eventHandlers}
            />
          ) : (
            <div
              className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
              {...radiusEdit.eventHandlers}
            >
              <span className="text-gray-300">
                {safeFormatValue(batchValues.radius, 50)}px
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
