"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSeatMapStore } from "../../store/seat-map-store";
import {
  previouslyClickedShape,
  setPreviouslyClickedShape,
} from "../../variables";

interface ColorPickerProps {
  label?: string;
  value: number;
  onChange: (color: number) => void;
  compact?: boolean;
}

export const ColorPicker = React.memo(
  ({ label, value, onChange, compact = false }: ColorPickerProps) => {
    const [localColorValue, setLocalColorValue] = useState(
      `#${value.toString(16).padStart(6, "0")}`
    );

    const debouncedColorValue = useDebounce(localColorValue, 300);

    React.useEffect(() => {
      const debouncedColorNumber = parseInt(debouncedColorValue.slice(1), 16);
      if (debouncedColorNumber !== value && !isNaN(debouncedColorNumber)) {
        const selectedItems = useSeatMapStore.getState().selectedShapes;
        const currentShape =
          selectedItems.length === 1 ? selectedItems[0] : null;

        if (
          !previouslyClickedShape ||
          (currentShape && previouslyClickedShape.id === currentShape.id)
        ) {
          onChange(debouncedColorNumber);
        } else {
          setLocalColorValue(`#${value.toString(16).padStart(6, "0")}`);
        }
      }
    }, [debouncedColorValue, onChange, value]);

    React.useEffect(() => {
      setLocalColorValue(`#${value.toString(16).padStart(6, "0")}`);
    }, [value]);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalColorValue(e.target.value);
      setPreviouslyClickedShape(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    if (compact) {
      return (
        <input
          type="color"
          value={localColorValue}
          onChange={handleColorChange}
          onKeyDown={handleKeyDown}
          className="w-full h-6 border border-gray-600 rounded text-xs"
        />
      );
    }

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium mb-1">{label}</label>
        )}
        <input
          type="color"
          value={localColorValue}
          onChange={handleColorChange}
          onKeyDown={handleKeyDown}
          className="w-full h-8 border border-gray-600 rounded"
        />
      </div>
    );
  }
);

ColorPicker.displayName = "ColorPicker";
