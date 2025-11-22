"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSeatMapStore } from "../../store/seat-map-store";
import {
  previouslyClickedShape,
  setPreviouslyClickedShape,
  setWasDragged,
  setWasTransformed,
  wasDragged,
  wasTransformed,
} from "../../variables";
import { formatNumber, parseNumber } from "../utils/number-utils";

interface DebouncedInputProps {
  value: number;
  onChange: (value: string) => void;
  onUpdate: (value: number) => void;
  isFloat?: boolean;
  className?: string;
  [key: string]: any;
}

export const DebouncedInput = React.memo(
  ({
    value,
    onChange,
    onUpdate,
    isFloat = false,
    className,
    ...props
  }: DebouncedInputProps) => {
    const [localValue, setLocalValue] = useState(() =>
      formatNumber(value, isFloat)
    );
    const debouncedValue = useDebounce(localValue, 300);

    // ✅ Add a ref to track if this is the initial load
    const isInitialMount = React.useRef(true);
    const lastExternalValue = React.useRef(value);

    React.useEffect(() => {
      const numericValue = parseNumber(debouncedValue);

      // ✅ Skip if this is the initial mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // ✅ For integer inputs, check if the rounded values are the same
      // This prevents updates when floating point precision causes display differences
      const currentDisplayValue = isFloat ? value : Math.round(value);
      const newDisplayValue = isFloat ? numericValue : Math.round(numericValue);

      if (newDisplayValue === currentDisplayValue || isNaN(numericValue)) {
        return;
      }

      // ✅ Skip if the user was dragging or transforming
      if (wasDragged || wasTransformed) {
        setLocalValue(formatNumber(value, isFloat));
        return;
      }

      const selectedItems = useSeatMapStore.getState().selectedShapes;
      const currentShape = selectedItems.length === 1 ? selectedItems[0] : null;
      console.log(
        !previouslyClickedShape,
        currentShape &&
          previouslyClickedShape &&
          previouslyClickedShape.id === currentShape.id
      );
      if (
        !previouslyClickedShape ||
        (currentShape && previouslyClickedShape.id === currentShape.id)
      ) {
        // ✅ Only update if the value has actually changed from user input
        console.log(`Updating value from ${value} to ${numericValue}`);
        onUpdate(numericValue);
      } else {
        setLocalValue(formatNumber(value, isFloat));
      }
    }, [debouncedValue, onUpdate, isFloat]);

    React.useEffect(() => {
      // ✅ Update local value when external value changes (like when selecting different shapes)
      // But only if the display value actually changes
      const currentDisplayValue = formatNumber(
        lastExternalValue.current,
        isFloat
      );
      const newDisplayValue = formatNumber(value, isFloat);

      if (currentDisplayValue !== newDisplayValue) {
        setLocalValue(newDisplayValue);
        lastExternalValue.current = value;
      }
    }, [value, isFloat]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      setWasDragged(false);
      setWasTransformed(false);
      setPreviouslyClickedShape(null);
      setLocalValue(inputValue);
      onChange(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    return (
      <input
        {...props}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

DebouncedInput.displayName = "DebouncedInput";
