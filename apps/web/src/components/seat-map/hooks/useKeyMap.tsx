import { useCallback, useEffect, useRef } from "react";
import {
  useCanvasStore,
  useAreaMode,
} from "@/components/seat-map/store/main-store";
import { usePanZoom } from "./usePanZoom";

export const useKeyMap = () => {
  // Get all the references to store functions and state
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

  const { isInAreaMode, selectedRowIds, selectedSeatIds } = useAreaMode();
  const { centerCanvas, fitToScreen, zoomIn, zoomOut, setBoundedPan } =
    usePanZoom();

  // Store all these references in a ref to access their latest values
  // without having to add them as dependencies to the useCallback
  const storeRef = useRef({
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
    isInAreaMode,
    selectedRowIds,
    selectedSeatIds,
  });

  // Keep the ref updated with the latest values
  useEffect(() => {
    storeRef.current = {
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
      isInAreaMode,
      selectedRowIds,
      selectedSeatIds,
    };
  }, [
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
    isInAreaMode,
    selectedRowIds,
    selectedSeatIds,
  ]);

  const getToolMapping = useCallback((key: string) => {
    if (storeRef.current.isInAreaMode) {
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
  }, []);

  // This handleKeyDown callback will now never change
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const store = storeRef.current;
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    const preventDefault = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (store.isEditing) {
      const activeElement = document.activeElement;
      const isTextarea = activeElement && activeElement.tagName === "TEXTAREA";
      const isInput = activeElement && activeElement.tagName === "INPUT";

      switch (e.key) {
        case "Escape":
          store.stopEditing();
          preventDefault();
          return;
        case "Enter":
          if (isTextarea) {
            if (!isShift) {
              return;
            }
            return;
          } else if (isInput) {
            store.stopEditing();
            preventDefault();
            return;
          }
          break;

        default:
          return;
      }
    }

    if (!isCtrl && !isShift && !isAlt && !store.isEditing) {
      if (["1", "2", "3", "4", "5"].includes(e.key)) {
        const toolToSelect = getToolMapping(e.key);
        if (toolToSelect) {
          store.setCurrentTool(toolToSelect as any);
          preventDefault();
          return;
        }
      }

      switch (e.key) {
        case "Escape":
          store.clearSelection();
          store.setCurrentTool("select");
          preventDefault();
          return;
        case "Delete":
        case "Backspace":
          if (store.isInAreaMode) {
            // Handle deletion in area mode
            if (
              store.selectedRowIds.length > 0 ||
              store.selectedSeatIds.length > 0
            ) {
              const areaActions = useCanvasStore.getState();
              areaActions.deleteSelectedAreaItems();
              preventDefault();
            }
          } else {
            // Handle deletion in regular mode (existing code)
            if (store.selectedShapeIds.length > 0) {
              store.deleteSelectedShapes();
              preventDefault();
            }
          }
          return;
        case "Enter":
          if (store.selectedShapeIds.length === 1) {
            store.startEditing(store.selectedShapeIds[0]);
            preventDefault();
          }
          return;
      }
    }

    if (isCtrl && !isShift && !isAlt) {
      switch (e.key) {
        case "z":
        case "Z":
          if (store.canUndo() && !store.isEditing) {
            store.undo();
            preventDefault();
          }
          return;
        case "y":
        case "Y":
          if (store.canRedo() && !store.isEditing) {
            store.redo();
            preventDefault();
          }
          return;
        case "a":
        case "A":
          if (!store.isEditing) {
            store.selectAll();
            preventDefault();
          }
          return;
        case "d":
        case "D":
          if (store.selectedShapeIds.length > 0 && !store.isEditing) {
            store.duplicateSelectedShapes();
            preventDefault();
          }
          return;
        case "s":
        case "S":
          store.saveToHistory();
          preventDefault();
          return;
        case "0":
          store.centerCanvas();
          preventDefault();
          return;
      }
    }

    if (isCtrl && isShift && !isAlt) {
      switch (e.key) {
        case "Z":
          if (store.canRedo() && !store.isEditing) {
            store.redo();
            preventDefault();
          }
          return;
        case "D":
          if (!store.isEditing) {
            store.clearSelection();
            preventDefault();
          }
          return;
      }
    }

    if (
      store.currentTool === "select" &&
      !isCtrl &&
      !isShift &&
      !isAlt &&
      !store.isEditing
    ) {
      const panStep = 50;

      switch (e.key) {
        case "ArrowUp":
          store.setBoundedPan(store.pan.x, store.pan.y + panStep);
          preventDefault();
          return;
        case "ArrowDown":
          store.setBoundedPan(store.pan.x, store.pan.y - panStep);
          preventDefault();
          return;
        case "ArrowLeft":
          store.setBoundedPan(store.pan.x + panStep, store.pan.y);
          preventDefault();
          return;
        case "ArrowRight":
          store.setBoundedPan(store.pan.x - panStep, store.pan.y);
          preventDefault();
          return;
      }
    }

    if (isCtrl && !isShift && !isAlt) {
      switch (e.key) {
        case "ArrowUp":
          store.zoomIn();
          preventDefault();
          return;
        case "ArrowDown":
          store.zoomOut();
          preventDefault();
          return;
      }
    }
  }, []); // No dependencies - will never change

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
    []
  );

  return {
    handleKeyDown,
    getShortcuts,
  };
};
