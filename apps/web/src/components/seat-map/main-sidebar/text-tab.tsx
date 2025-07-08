"use client";

import React from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Type, Edit3 } from "lucide-react";
import { Shape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useTextMeasure } from "@/hooks/useTextMeasure";

interface TextTabProps {
  selectedShapes: Shape[];
  batchValues: Record<string, any>;
  onBatchChange: (key: string, value: any) => void;
}

export const TextTab: React.FC<TextTabProps> = ({
  selectedShapes,
  batchValues,
  onBatchChange,
}) => {
  const hasTextShapes = selectedShapes.some((s) => s.type === "text");
  const { measureText } = useTextMeasure();

  const editId =
    selectedShapes.length === 1
      ? selectedShapes[0].id
      : `batch-${selectedShapes.map((s) => s.id).join("-")}`;

  // FIX: Add debounced callback for text color changes
  const debouncedTextColorChange = useDebouncedCallback(
    (value: string) => onBatchChange("fill", value),
    300 // 300ms delay
  );

  // FIX: Add debounced callback for text content changes with auto-resizing
  const debouncedTextContentChange = useDebouncedCallback(
    (value: string) => {
      // Update the text content
      onBatchChange("name", value);

      // Auto-resize the text width/height based on content
      const fontSize = batchValues.fontSize || 16;
      const fontFamily = batchValues.fontFamily || "Arial";
      const fontStyle = batchValues.fontStyle || "normal";

      const dimensions = measureText(value, fontSize, fontFamily, fontStyle);

      // Update dimensions
      onBatchChange("width", dimensions.width);
      onBatchChange("height", dimensions.height);
    },
    300 // 300ms delay
  );

  const fontSizeEdit = useStoreInlineEdit(
    `${editId}-fontSize`,
    batchValues.fontSize || 16,
    (value) => {
      const newFontSize = parseFloat(value) || 16;
      onBatchChange("fontSize", newFontSize);

      // Auto-resize when font size changes
      const text = batchValues.name || "New Text";
      const fontFamily = batchValues.fontFamily || "Arial";
      const fontStyle = batchValues.fontStyle || "normal";

      const dimensions = measureText(text, newFontSize, fontFamily, fontStyle);
      onBatchChange("width", dimensions.width);
      onBatchChange("height", dimensions.height);
    }
  );

  const fontFamilyEdit = useStoreInlineEdit(
    `${editId}-fontFamily`,
    batchValues.fontFamily || "Arial",
    (value) => {
      onBatchChange("fontFamily", value);

      // Auto-resize when font family changes
      const text = batchValues.name || "New Text";
      const fontSize = batchValues.fontSize || 16;
      const fontStyle = batchValues.fontStyle || "normal";

      const dimensions = measureText(text, fontSize, value, fontStyle);
      onBatchChange("width", dimensions.width);
      onBatchChange("height", dimensions.height);
    }
  );

  const alignEdit = useStoreInlineEdit(
    `${editId}-align`,
    batchValues.align || "left",
    (value) => onBatchChange("align", value)
  );

  // FIX: Add text content editing with multi-line support
  const textContentEdit = useStoreInlineEdit(
    `${editId}-textContent`,
    batchValues.name || "New Text",
    (value) => debouncedTextContentChange(value)
  );

  // FIX: Helper function to truncate text for display (only for preview, not the actual text)
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // FIX: Helper function to count lines in text
  const getLineCount = (text: string) => {
    return text.split("\n").length;
  };

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
      {/* FIX: Text Content with Multi-Line Support */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Edit3 className="w-3 h-3" />
          Text Content
        </Label>
        {textContentEdit.isEditing ? (
          <Textarea
            value={textContentEdit.editValue}
            onChange={(e) => textContentEdit.setEditValue(e.target.value)}
            className="mt-1 min-h-[60px] max-h-[120px] bg-gray-800 border-gray-600 text-white resize-none overflow-y-auto"
            placeholder="Enter text content..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  const textarea = e.target as HTMLTextAreaElement;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const value = textarea.value;
                  const newValue =
                    value.substring(0, start) + "\n" + value.substring(end);
                  textContentEdit.setEditValue(newValue);

                  // Set cursor position after the new line
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                  }, 0);
                } else {
                  // Regular Enter saves the text
                  e.preventDefault();
                  e.stopPropagation();
                  textContentEdit.saveAndStop();
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                textContentEdit.cancelAndStop();
              }
              // Allow other keys to propagate normally
            }}
            onBlur={textContentEdit.saveAndStop}
          />
        ) : (
          <div
            className="mt-1 px-3 py-2 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-start transition-colors min-h-[40px] max-h-[80px] overflow-hidden"
            onClick={textContentEdit.eventHandlers.onClick}
            onMouseDown={textContentEdit.eventHandlers.onMouseDown}
            title={batchValues.name || "New Text"} // Full text on hover
          >
            <div className="text-gray-300 whitespace-pre-wrap break-words overflow-hidden text-ellipsis w-full">
              {/* FIX: Only truncate for display, preserve line breaks */}
              {getLineCount(batchValues.name || "New Text") > 3
                ? // If more than 3 lines, show first 3 lines + "..."
                  batchValues.name?.split("\n").slice(0, 3).join("\n") + "\n..."
                : batchValues.name?.length > 100
                  ? // If single/few lines but very long, truncate
                    truncateText(batchValues.name || "New Text", 100)
                  : batchValues.name || "New Text"}
            </div>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1">
          Click to edit •{" "}
          <kbd className="bg-gray-700 px-1 rounded">Shift+Enter</kbd> for new
          line • <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to save
        </div>
      </div>

      {/* FIX: Text Color with Debouncing */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Type className="w-3 h-3" />
          Text Color
        </Label>
        <Input
          type="color"
          value={batchValues.fill || "#000000"}
          onChange={(e) => {
            debouncedTextColorChange(e.target.value);
          }}
          className="border-gray-600 h-10 mt-1"
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
            <span className="text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
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
              <SelectItem value="Courier">Courier</SelectItem>
              <SelectItem value="monospace">Monospace</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
            {...fontFamilyEdit.eventHandlers}
          >
            <span className="text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
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
              <SelectItem value="justify">Justify</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors capitalize"
            {...alignEdit.eventHandlers}
          >
            <span className="text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
              {batchValues.align || "left"}
            </span>
          </div>
        )}
      </div>

      {/* Text Dimensions (Read-only) */}
      <div>
        <Label className="text-xs text-gray-400">Dimensions</Label>
        <div className="text-xs text-gray-500 mt-1">
          {Math.round(batchValues.width || 200)}px ×{" "}
          {Math.round(batchValues.height || 24)}px
          {getLineCount(batchValues.name || "New Text") > 1 && (
            <span className="ml-2">
              ({getLineCount(batchValues.name || "New Text")} lines)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
