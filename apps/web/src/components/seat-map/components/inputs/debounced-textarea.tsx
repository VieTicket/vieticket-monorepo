"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSeatMapStore } from "../../store/seat-map-store";
import {
  previouslyClickedShape,
  setPreviouslyClickedShape,
} from "../../variables";

interface DebouncedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onUpdate: (value: string) => void;
  className?: string;
  [key: string]: any;
}

export const DebouncedTextarea = React.memo(
  ({
    value,
    onChange,
    onUpdate,
    className,
    ...props
  }: DebouncedTextareaProps) => {
    const [localValue, setLocalValue] = useState(value);
    const debouncedValue = useDebounce(localValue, 300);

    // ✅ Add a ref to track if this is the initial load
    const isInitialMount = React.useRef(true);
    const lastExternalValue = React.useRef(value);

    React.useEffect(() => {
      // ✅ Skip if this is the initial mount or if the value hasn't actually changed
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      // ✅ Skip if the value is the same
      if (debouncedValue === value) {
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
        console.log(`Updating text from "${value}" to "${debouncedValue}"`);
        onUpdate(debouncedValue);
      } else {
        setLocalValue(value);
      }
    }, [debouncedValue, onUpdate]);

    React.useEffect(() => {
      // ✅ Update local value when external value changes
      if (lastExternalValue.current !== value) {
        setLocalValue(value);
        lastExternalValue.current = value;
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const inputValue = e.target.value;
      setLocalValue(inputValue);
      setPreviouslyClickedShape(null);
      onChange(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.currentTarget.blur();
      }
    };

    return (
      <textarea
        {...props}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

DebouncedTextarea.displayName = "DebouncedTextarea";
