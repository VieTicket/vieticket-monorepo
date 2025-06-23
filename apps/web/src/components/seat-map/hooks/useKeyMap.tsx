import { useCallback, useEffect } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { usePanZoom } from "./usePanZoom";

export const useKeyMap = () => {
  const {
    // Canvas operations
    zoom,
    pan,
    setZoom,
    currentTool,
    setCurrentTool,

    // Shape operations
    selectedShapeIds,
    deleteSelectedShapes,
    undo,
    redo,
    canUndo,
    canRedo,
    duplicateSelectedShapes,

    // Selection operations
    selectAll,
    clearSelection,

    // Editing operations
    isEditing,
    editingShapeId,
    startEditing,
    stopEditing,

    // Save/Load operations
    saveToHistory,
  } = useCanvasStore();

  const { centerCanvas, fitToScreen, zoomIn, zoomOut, setBoundedPan } =
    usePanZoom();

  // useKeyMap.tsx - Update the handleKeyDown function
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // Prevent default for handled shortcuts
      const preventDefault = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      // Special handling when editing
      if (isEditing) {
        switch (e.key) {
          case "Escape":
            stopEditing();
            preventDefault();
            return;
          case "Enter":
            if (!isShift) {
              stopEditing();
              preventDefault();
              return;
            }
            break;
          // Don't handle other shortcuts while editing (except Escape and Enter)
          default:
            return;
        }
      }

      // Tool shortcuts (no modifiers) - DISABLED WHEN EDITING
      if (!isCtrl && !isShift && !isAlt && !isEditing) {
        switch (e.key) {
          case "1":
            setCurrentTool("select");
            preventDefault();
            return;
          case "2":
            setCurrentTool("rect");
            preventDefault();
            return;
          case "3":
            setCurrentTool("circle");
            preventDefault();
            return;
          case "4":
            setCurrentTool("text");
            preventDefault();
            return;
          case "5":
            setCurrentTool("polygon");
            preventDefault();
            return;
          case "Escape":
            clearSelection();
            setCurrentTool("select");
            preventDefault();
            return;
          case "Delete":
          case "Backspace":
            if (selectedShapeIds.length > 0) {
              deleteSelectedShapes();
              preventDefault();
            }
            return;
          case "Enter":
            // Start editing if single shape selected
            if (selectedShapeIds.length === 1) {
              startEditing(selectedShapeIds[0]);
              preventDefault();
            }
            return;
        }
      }

      // Ctrl/Cmd shortcuts - STILL WORK WHEN EDITING (except tool shortcuts)
      if (isCtrl && !isShift && !isAlt) {
        switch (e.key) {
          case "z":
          case "Z":
            if (canUndo() && !isEditing) {
              // Disable undo while editing
              undo();
              preventDefault();
            }
            return;
          case "y":
          case "Y":
            if (canRedo() && !isEditing) {
              // Disable redo while editing
              redo();
              preventDefault();
            }
            return;
          case "a":
          case "A":
            if (!isEditing) {
              // Disable select all while editing
              selectAll();
              preventDefault();
            }
            return;
          case "d":
          case "D":
            if (selectedShapeIds.length > 0 && !isEditing) {
              // Disable duplicate while editing
              duplicateSelectedShapes();
              preventDefault();
            }
            return;
          case "s":
          case "S":
            saveToHistory();
            preventDefault();
            return;
          case "0":
            centerCanvas();
            preventDefault();
            return;
        }
      }

      // Ctrl/Cmd + Shift shortcuts
      if (isCtrl && isShift && !isAlt) {
        switch (e.key) {
          case "Z":
            if (canRedo() && !isEditing) {
              // Disable redo while editing
              redo();
              preventDefault();
            }
            return;
          case "D":
            if (!isEditing) {
              // Disable clear selection while editing
              clearSelection();
              preventDefault();
            }
            return;
        }
      }

      // Navigation shortcuts (only in select mode and not editing)
      if (
        currentTool === "select" &&
        !isCtrl &&
        !isShift &&
        !isAlt &&
        !isEditing
      ) {
        const panStep = 50;

        switch (e.key) {
          case "ArrowUp":
            setBoundedPan(pan.x, pan.y + panStep);
            preventDefault();
            return;
          case "ArrowDown":
            setBoundedPan(pan.x, pan.y - panStep);
            preventDefault();
            return;
          case "ArrowLeft":
            setBoundedPan(pan.x + panStep, pan.y);
            preventDefault();
            return;
          case "ArrowRight":
            setBoundedPan(pan.x - panStep, pan.y);
            preventDefault();
            return;
        }
      }

      // Zoom shortcuts with Ctrl
      if (isCtrl && !isShift && !isAlt) {
        switch (e.key) {
          case "ArrowUp":
            zoomIn();
            preventDefault();
            return;
          case "ArrowDown":
            zoomOut();
            preventDefault();
            return;
        }
      }
    },
    [
      zoom,
      pan,
      setZoom,
      currentTool,
      setCurrentTool,
      selectedShapeIds,
      deleteSelectedShapes,
      undo,
      redo,
      canUndo,
      canRedo,
      clearSelection,
      saveToHistory,
      centerCanvas,
      fitToScreen,
      zoomIn,
      zoomOut,
      isEditing,
      editingShapeId,
      startEditing,
      stopEditing,
      setBoundedPan,
    ]
  );

  // Auto-bind keyboard events
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getShortcuts = useCallback(() => {
    return {
      tools: {
        1: "Select Tool",
        2: "Rectangle Tool",
        3: "Circle Tool",
        4: "Text Tool",
        5: "Polygon Tool",
      },
      actions: {
        "Ctrl+Z": "Undo",
        "Ctrl+Y / Ctrl+Shift+Z": "Redo",
        "Ctrl+A": "Select All",
        "Ctrl+D": "Duplicate",
        "Delete/Backspace": "Delete Selected",
        Enter: "Start Editing (if one shape selected)",
        Escape: "Cancel Edit / Clear Selection & Select Tool",
      },
      editing: {
        Enter: "Save Edit",
        Escape: "Cancel Edit",
      },
      navigation: {
        "Ctrl+0": "Center Canvas",
        "Arrow Keys": "Pan Canvas (Select Mode)",
        "Ctrl+Arrow Up/Down": "Zoom In/Out",
      },
      file: {
        "Ctrl+S": "Save",
      },
    };
  }, []);

  return {
    handleKeyDown,
    getShortcuts,
  };
};
