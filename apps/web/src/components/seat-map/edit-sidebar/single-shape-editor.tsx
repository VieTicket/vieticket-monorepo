"use client";

import React, { useState, useCallback } from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Edit3, Save } from "lucide-react";
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
      {/* Shape Name */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Edit3 className="w-3 h-3" />
          Shape Name
        </Label>
        {nameEdit.isEditing ? (
          <Input
            type="text"
            value={nameEdit.editValue}
            onChange={(e) => nameEdit.setEditValue(e.target.value)}
            className="h-8 mt-1"
            placeholder="Enter shape name..."
            autoFocus
            {...nameEdit.eventHandlers}
          />
        ) : (
          <div
            className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
            {...nameEdit.eventHandlers}
          >
            {localValues.name || "Click to edit name..."}
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
                <span className="text-gray-300">
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
                <span className="text-gray-300">
                  {safeFormatValue(Math.round(localValues.y), 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rest of your component... */}
      <div>
        <Label className="text-xs text-gray-400">Shape Type</Label>
        <div className="text-sm mt-1 capitalize text-blue-400">
          {shape.type}
        </div>
      </div>

      <div>
        <Label className="text-xs text-gray-400">Shape ID</Label>
        <div className="text-xs mt-1 font-mono text-gray-300 break-all">
          {shape.id}
        </div>
      </div>

      <Button onClick={onSave} className="w-full mt-4" size="sm">
        <Save className="w-3 h-3 mr-1" />
        Save Changes
      </Button>
    </div>
  );
};
