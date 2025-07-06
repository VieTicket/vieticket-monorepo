import { useCallback, useEffect } from "react";
import {
  useCanvasStore,
  useAreaMode,
} from "@/components/seat-map/store/main-store";
import { usePanZoom } from "./usePanZoom";

export const useKeyMap = () => {
  const {
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
    duplicateSelectedShapes,

    selectAll,
    clearSelection,

    isEditing,
    editingShapeId,
    startEditing,
    stopEditing,

    saveToHistory,
  } = useCanvasStore();

  const { isInAreaMode } = useAreaMode();

  const { centerCanvas, fitToScreen, zoomIn, zoomOut, setBoundedPan } =
    usePanZoom();

  const getToolMapping = useCallback(
    (key: string) => {
      if (isInAreaMode) {
        switch (key) {
          case "1":
            return "select";
          case "2":
            return "seat-grid";
          case "3":
            return "seat-row";
          default:
            return null;
        }
      } else {
        switch (key) {
          case "1":
            return "select";
          case "2":
            return "rect";
          case "3":
            return "circle";
          case "4":
            return "polygon";
          case "5":
            return "text";
          default:
            return null;
        }
      }
    },
    [isInAreaMode]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      const preventDefault = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      if (isEditing) {
        const activeElement = document.activeElement;
        const isTextarea =
          activeElement && activeElement.tagName === "TEXTAREA";
        const isInput = activeElement && activeElement.tagName === "INPUT";

        switch (e.key) {
          case "Escape":
            stopEditing();
            preventDefault();
            return;
          case "Enter":
            if (isTextarea) {
              if (!isShift) {
                return;
              }

              return;
            } else if (isInput) {
              stopEditing();
              preventDefault();
              return;
            }
            break;

          default:
            return;
        }
      }

      if (!isCtrl && !isShift && !isAlt && !isEditing) {
        if (["1", "2", "3", "4", "5"].includes(e.key)) {
          const toolToSelect = getToolMapping(e.key);
          if (toolToSelect) {
            setCurrentTool(toolToSelect as any);
            preventDefault();
            return;
          }
        }

        switch (e.key) {
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
            if (selectedShapeIds.length === 1) {
              startEditing(selectedShapeIds[0]);
              preventDefault();
            }
            return;
        }
      }

      if (isCtrl && !isShift && !isAlt) {
        switch (e.key) {
          case "z":
          case "Z":
            if (canUndo() && !isEditing) {
              undo();
              preventDefault();
            }
            return;
          case "y":
          case "Y":
            if (canRedo() && !isEditing) {
              redo();
              preventDefault();
            }
            return;
          case "a":
          case "A":
            if (!isEditing) {
              selectAll();
              preventDefault();
            }
            return;
          case "d":
          case "D":
            if (selectedShapeIds.length > 0 && !isEditing) {
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

      if (isCtrl && isShift && !isAlt) {
        switch (e.key) {
          case "Z":
            if (canRedo() && !isEditing) {
              redo();
              preventDefault();
            }
            return;
          case "D":
            if (!isEditing) {
              clearSelection();
              preventDefault();
            }
            return;
        }
      }

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
      duplicateSelectedShapes,
      selectAll,
      getToolMapping,
      isInAreaMode,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getShortcuts = useCallback(
    () => ({
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
    }),
    [isInAreaMode]
  );

  return {
    handleKeyDown,
    getShortcuts,
  };
};
