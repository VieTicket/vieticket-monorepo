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
    if (editValue !== undefined && editValue !== null) {
      onSave(editValue);
    }
    stopEditing();
  }, [editValue, onSave, stopEditing]);

  const cancelAndStop = useCallback(() => {
    setEditValue(initialValue);
    stopEditing();
    onCancel?.();
  }, [initialValue, stopEditing, onCancel]);

  // FIX: Update event handlers to better handle multi-line text
  const eventHandlers = {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startEdit(e);
    },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onBlur: saveAndStop,
    onKeyDown: (e: React.KeyboardEvent) => {
      // FIX: Don't interfere with textarea's own key handling
      const isTextarea = (e.target as HTMLElement).tagName === "TEXTAREA";

      if (isTextarea) {
        // For textareas, let the textarea handle its own key events
        // Only handle Escape to cancel
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          cancelAndStop();
        }
        // Don't handle other keys for textareas
        return;
      }

      // For other inputs (not textareas)
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
