"use client";

import React, { useState, useCallback } from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { Edit3, Save, Type } from "lucide-react";
import { Shape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";

interface SingleShapeEditorProps {
  shape: Shape;
  onUpdate: (updates: Partial<Shape>) => void;
  onSave: () => void;
}

const safeFormatValue = (value: any, defaultValue: any): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return String(defaultValue);
  }
  return String(value);
};

export const SingleShapeEditor: React.FC<SingleShapeEditorProps> = ({
  shape,
  onUpdate,
  onSave,
}) => {
  const [localValues, setLocalValues] = useState({
    name: shape.name || "",
    x: shape.x,
    y: shape.y,
  });

  const handleChange = useCallback(
    (key: keyof typeof localValues, value: any) => {
      setLocalValues((prev) => ({ ...prev, [key]: value }));
      onUpdate({ [key]: value });
    },
    [onUpdate]
  );

  // FIX: Helper functions for text truncation
  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getLineCount = (text: string) => {
    if (!text) return 1;
    return text.split("\n").length;
  };

  const isTextShape = shape.type === "text";

  const nameEdit = useStoreInlineEdit(
    `${shape.id}-name`,
    localValues.name,
    (value) => handleChange("name", value)
  );

  const xEdit = useStoreInlineEdit(`${shape.id}-x`, localValues.x, (value) =>
    handleChange("x", parseFloat(value) || 0)
  );

  const yEdit = useStoreInlineEdit(`${shape.id}-y`, localValues.y, (value) =>
    handleChange("y", parseFloat(value) || 0)
  );

  return (
    <div className="space-y-4 text-white">
      {/* FIX: Shape Name with different handling for text shapes */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          {isTextShape ? (
            <Type className="w-3 h-3" />
          ) : (
            <Edit3 className="w-3 h-3" />
          )}
          {isTextShape ? "Text Content" : "Shape Name"}
        </Label>
        {nameEdit.isEditing ? (
          // FIX: Use textarea for text shapes, input for others
          isTextShape ? (
            <Textarea
              value={nameEdit.editValue}
              onChange={(e) => nameEdit.setEditValue(e.target.value)}
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
                    nameEdit.setEditValue(newValue);

                    setTimeout(() => {
                      textarea.selectionStart = textarea.selectionEnd =
                        start + 1;
                    }, 0);
                  } else {
                    // Regular Enter saves the text
                    e.preventDefault();
                    e.stopPropagation();
                    nameEdit.saveAndStop();
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  nameEdit.cancelAndStop();
                }
              }}
              onBlur={nameEdit.saveAndStop}
            />
          ) : (
            <Input
              type="text"
              value={nameEdit.editValue}
              onChange={(e) => nameEdit.setEditValue(e.target.value)}
              className="h-8 mt-1"
              placeholder="Enter shape name..."
              autoFocus
              {...nameEdit.eventHandlers}
            />
          )
        ) : (
          <div
            className="mt-1 px-3 py-2 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-start transition-colors min-h-[40px] max-h-[80px] overflow-hidden"
            {...nameEdit.eventHandlers}
            title={
              localValues.name ||
              (isTextShape ? "New Text" : "Click to edit name...")
            } // Full text on hover
          >
            <div className="text-gray-300 whitespace-pre-wrap break-words overflow-hidden text-ellipsis w-full">
              {/* FIX: Different truncation logic for text shapes */}
              {isTextShape ? (
                localValues.name ? (
                  // For text shapes, show truncated version with line info
                  getLineCount(localValues.name) > 3 ? (
                    localValues.name.split("\n").slice(0, 3).join("\n") +
                    "\n..."
                  ) : localValues.name.length > 100 ? (
                    truncateText(localValues.name, 100)
                  ) : (
                    localValues.name
                  )
                ) : (
                  <span className="text-gray-500 italic">New Text</span>
                )
              ) : localValues.name ? (
                truncateText(localValues.name, 50)
              ) : (
                <span className="text-gray-500 italic">
                  Click to edit name...
                </span>
              )}
            </div>
          </div>
        )}
        {/* FIX: Add helper text for text shapes */}
        {isTextShape && (
          <div className="text-xs text-gray-400 mt-1">
            Click to edit •{" "}
            <kbd className="bg-gray-700 px-1 rounded">Shift+Enter</kbd> for new
            line • <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> to save
          </div>
        )}
      </div>

      {/* Position with inline editing */}
      <div>
        <Label className="text-xs">Position</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <Label className="text-xs text-gray-400">X</Label>
            {xEdit.isEditing ? (
              <Input
                type="number"
                value={xEdit.editValue}
                onChange={(e) => xEdit.setEditValue(e.target.value)}
                className="h-8"
                step="1"
                autoFocus
                {...xEdit.eventHandlers}
              />
            ) : (
              <div
                className="h-8 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
                {...xEdit.eventHandlers}
              >
                <span className="text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                  {safeFormatValue(Math.round(localValues.x), 0)}
                </span>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-400">Y</Label>
            {yEdit.isEditing ? (
              <Input
                type="number"
                value={yEdit.editValue}
                onChange={(e) => yEdit.setEditValue(e.target.value)}
                className="h-8"
                step="1"
                autoFocus
                {...yEdit.eventHandlers}
              />
            ) : (
              <div
                className="h-8 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
                {...yEdit.eventHandlers}
              >
                <span className="text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap">
                  {safeFormatValue(Math.round(localValues.y), 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FIX: Add dimensions for text shapes */}
      {isTextShape && (
        <div>
          <Label className="text-xs text-gray-400">Dimensions</Label>
          <div className="text-xs text-gray-500 mt-1">
            {Math.round((shape as any).width || 200)}px ×{" "}
            {Math.round((shape as any).height || 24)}px
            {getLineCount(localValues.name || "New Text") > 1 && (
              <span className="ml-2">
                ({getLineCount(localValues.name || "New Text")} lines)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Shape Type */}
      <div>
        <Label className="text-xs text-gray-400">Shape Type</Label>
        <div className="text-sm mt-1 capitalize text-blue-400">
          {shape.type}
        </div>
      </div>

      {/* Shape ID */}
      <div>
        <Label className="text-xs text-gray-400">Shape ID</Label>
        <div className="text-xs mt-1 font-mono text-gray-300 break-all overflow-hidden text-ellipsis">
          {/* FIX: Truncate long IDs */}
          {shape.id.length > 20 ? (
            <span title={shape.id}>{shape.id.substring(0, 20)}...</span>
          ) : (
            shape.id
          )}
        </div>
      </div>

      {/* FIX: Add text-specific properties display */}
      {isTextShape && (
        <>
          <div>
            <Label className="text-xs text-gray-400">Font Size</Label>
            <div className="text-xs text-gray-500 mt-1">
              {(shape as any).fontSize || 16}px
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Font Family</Label>
            <div className="text-xs text-gray-500 mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {(shape as any).fontFamily || "Arial"}
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Alignment</Label>
            <div className="text-xs text-gray-500 mt-1 capitalize">
              {(shape as any).align || "left"}
            </div>
          </div>
        </>
      )}

      <Button onClick={onSave} className="w-full mt-4" size="sm">
        <Save className="w-3 h-3 mr-1" />
        Save Changes
      </Button>
    </div>
  );
};
