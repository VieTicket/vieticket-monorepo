"use client";

import React from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Type } from "lucide-react";
import { Shape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";

interface TextControlsProps {
  selectedShapes: Shape[];
  batchValues: Record<string, any>;
  onBatchChange: (key: string, value: any) => void;
}

export const TextControls: React.FC<TextControlsProps> = ({
  selectedShapes,
  batchValues,
  onBatchChange,
}) => {
  const hasTextShapes = selectedShapes.some((s) => s.type === "text");

  const editId =
    selectedShapes.length === 1
      ? selectedShapes[0].id
      : `batch-${selectedShapes.map((s) => s.id).join("-")}`;

  const fontSizeEdit = useStoreInlineEdit(
    `${editId}-fontSize`,
    batchValues.fontSize || 16,
    (value) => onBatchChange("fontSize", parseFloat(value) || 16)
  );

  const fontFamilyEdit = useStoreInlineEdit(
    `${editId}-fontFamily`,
    batchValues.fontFamily || "Arial",
    (value) => onBatchChange("fontFamily", value)
  );

  const alignEdit = useStoreInlineEdit(
    `${editId}-align`,
    batchValues.align || "left",
    (value) => onBatchChange("align", value)
  );

  if (!hasTextShapes) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No text shapes selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-white">
      {/* Text Color */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Type className="w-3 h-3" />
          Text Color
        </Label>
        <Input
          type="color"
          value={batchValues.textFill || "#000000"}
          onChange={(e) => onBatchChange("textFill", e.target.value)}
          className="h-10 mt-1"
          title="Text Color"
        />
      </div>

      {/* Font Size with Inline Editing */}
      <div>
        <Label className="text-xs">Font Size</Label>
        {fontSizeEdit.isEditing ? (
          <Input
            type="number"
            min="8"
            max="72"
            value={fontSizeEdit.editValue}
            onChange={(e) => fontSizeEdit.setEditValue(e.target.value)}
            className="h-8 mt-1"
            autoFocus
            {...fontSizeEdit.eventHandlers}
          />
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
            {...fontSizeEdit.eventHandlers}
          >
            <span className="text-gray-300">
              {batchValues.fontSize || 16}px
            </span>
          </div>
        )}
      </div>

      {/* Font Family with Inline Editing */}
      <div>
        <Label className="text-xs">Font Family</Label>
        {fontFamilyEdit.isEditing ? (
          <Select
            value={fontFamilyEdit.editValue}
            onValueChange={(value) => {
              console.log("Selected font family:", value);
              fontFamilyEdit.setEditValue(value);
              fontFamilyEdit.saveAndStop();
            }}
            open={fontFamilyEdit.isEditing}
            onOpenChange={(open) => {
              if (!open) {
                fontFamilyEdit.cancelAndStop();
              }
            }}
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Arial">Arial</SelectItem>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
              <SelectItem value="Georgia">Georgia</SelectItem>
              <SelectItem value="Verdana">Verdana</SelectItem>
              <SelectItem value="Courier New">Courier New</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
            {...fontFamilyEdit.eventHandlers}
          >
            <span className="text-gray-300">
              {batchValues.fontFamily || "Arial"}
            </span>
          </div>
        )}
      </div>

      {/* Text Alignment with Inline Editing */}
      <div>
        <Label className="text-xs">Alignment</Label>
        {alignEdit.isEditing ? (
          <Select
            value={alignEdit.editValue}
            onValueChange={(value) => {
              alignEdit.setEditValue(value);
              alignEdit.saveAndStop();
            }}
            open={alignEdit.isEditing}
            onOpenChange={(open) => {
              if (!open) {
                alignEdit.cancelAndStop();
              }
            }}
          >
            <SelectTrigger className="h-8 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors capitalize"
            {...alignEdit.eventHandlers}
          >
            <span className="text-gray-300">{batchValues.align || "left"}</span>
          </div>
        )}
      </div>
    </div>
  );
};
