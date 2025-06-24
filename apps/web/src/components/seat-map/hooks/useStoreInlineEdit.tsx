import { useState, useCallback, useEffect } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

export const useStoreInlineEdit = (
  editId: string,
  initialValue: any,
  onSave: (value: any) => void,
  onCancel?: () => void
) => {
  const { isEditing, editingShapeId, startEditing, stopEditing } =
    useCanvasStore();
  const [editValue, setEditValue] = useState(initialValue);

  useEffect(() => {
    setEditValue(initialValue);
  }, [initialValue]);

  const isCurrentlyEditing = isEditing && editingShapeId === editId;

  const startEdit = useCallback(
    (e?: React.MouseEvent) => {
      // FIXED: More aggressive event stopping
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent?.stopPropagation?.();
        e.nativeEvent?.stopImmediatePropagation?.();
      }
      setEditValue(initialValue);
      startEditing(editId);
    },
    [editId, initialValue, startEditing]
  );

  const saveAndStop = useCallback(() => {
    // FIXED: More flexible validation - allow string values
    if (editValue !== undefined && editValue !== null && editValue !== "") {
      onSave(editValue);
    }
    stopEditing();
  }, [editValue, onSave, stopEditing]);

  const cancelAndStop = useCallback(() => {
    setEditValue(initialValue);
    stopEditing();
    onCancel?.();
  }, [initialValue, stopEditing, onCancel]);

  const eventHandlers = {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startEdit(e);
    },
    onMouseDown: (e: React.MouseEvent) => {
      // FIXED: Prevent all mouse events from bubbling
      e.preventDefault();
      e.stopPropagation();
    },
    onBlur: saveAndStop,
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        saveAndStop();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelAndStop();
      }
    },
    onFocus: (e: React.FocusEvent) => {
      e.stopPropagation();
    },
  };

  return {
    isEditing: isCurrentlyEditing,
    editValue,
    setEditValue,
    eventHandlers,
    startEdit,
    saveAndStop,
    cancelAndStop,
  };
};
