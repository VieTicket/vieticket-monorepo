import { useCallback, useEffect, useRef } from "react";
import { Tool } from "../types";
import { useSeatMapStore } from "../store/seat-map-store";
import { performUndo, performRedo, canUndo, canRedo } from "../utils/undo-redo";
import { duplicateSelectedShapes } from "../utils/duplication";
import { deleteShapes } from "../shapes";
import { clearCanvas } from "../shapes";
import {
  handleZoomIn,
  handleZoomOut,
  handleResetView,
} from "../events/zoom-events";
import {
  currentTool,
  setCurrentTool,
  pan,
  setPan,
  selectedContainer,
  isAreaMode,
} from "../variables";
import { mirrorHorizontally, mirrorVertically } from "../utils/mirroring";
import { getGuideLines } from "../guide-lines";

export const useKeyMap = (setSelectedTool: (tool: Tool) => void) => {
  const selectedShapes = useSeatMapStore((state) => state.selectedShapes);
  const selectAll = useSeatMapStore((state) => state.selectAll);
  const clearSelection = useSeatMapStore((state) => state.clearSelection);
  const shapes = useSeatMapStore((state) => state.shapes);
  const areaModeContainer = shapes.find(
    (shape) => shape.id === "area-mode-container"
  );

  const storeRef = useRef({
    selectedShapes,
    selectAll,
    clearSelection,
    shapes,
    currentTool,
    selectedContainer,
    pan,
  });

  useEffect(() => {
    storeRef.current = {
      selectedShapes,
      selectAll,
      clearSelection,
      shapes,
      currentTool,
      selectedContainer,
      pan,
    };
  }, [selectedShapes, selectAll, clearSelection, shapes]);

  const getToolMapping = useCallback(
    (key: string): Tool | null => {
      switch (key) {
        case "1":
          return "select";
        case "2":
          return "pan";
        case "3":
          return isAreaMode ? "seat-grid" : "rectangle";
        case "4":
          return "ellipse";
        case "5":
          return "polygon";
        case "6":
          return "text";
        default:
          return null;
      }
    },
    [areaModeContainer]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const store = storeRef.current;
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      const activeElement = document.activeElement;
      const isInInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("role") === "textbox" ||
          activeElement.getAttribute("contenteditable") === "true");

      const preventDefault = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      if (isInInput) {
        switch (e.key) {
          case "Escape":
            (activeElement as HTMLElement).blur();
            preventDefault();
            return;
          default:
            return;
        }
      }

      if (!isCtrl && !isShift && !isAlt) {
        if (["1", "2", "3", "4", "5", "6"].includes(e.key)) {
          const toolToSelect = getToolMapping(e.key);
          if (toolToSelect) {
            setCurrentTool(toolToSelect);
            setSelectedTool(toolToSelect);
            const guideLines = getGuideLines();
            if (guideLines) {
              guideLines.clearAll();
            }
            preventDefault();
            return;
          }
        }

        switch (e.key) {
          case "Escape":
            store.clearSelection();
            setCurrentTool("select");
            setSelectedTool("select");
            preventDefault();
            return;
          case "Delete":
          case "Backspace":
            if (store.selectedShapes.length > 0) {
              deleteShapes();
              preventDefault();
            }
            return;
        }
      }

      if (isCtrl && !isShift && !isAlt) {
        switch (e.key) {
          case "z":
          case "Z":
            if (canUndo()) {
              performUndo();
              preventDefault();
            }
            return;
          case "y":
          case "Y":
            if (canRedo()) {
              performRedo();
              preventDefault();
            }
            return;
          case "a":
          case "A":
            store.selectAll();
            preventDefault();
            return;
          case "d":
          case "D":
            if (store.selectedShapes.length > 0) {
              duplicateSelectedShapes();
              preventDefault();
            }
            return;
          case "0":
            handleResetView();
            preventDefault();
            return;
          case "n":
          case "N":
            if (store.shapes.length > 0) {
              if (
                confirm(
                  "Are you sure you want to create a new canvas? All unsaved changes will be lost."
                )
              ) {
                clearCanvas();
              }
            }
            preventDefault();
            return;
        }
      }

      if (isCtrl && isShift && !isAlt) {
        switch (e.key) {
          case "Z":
            if (canRedo()) {
              performRedo();
              preventDefault();
            }
            return;
          case "D":
            store.clearSelection();
            preventDefault();
            return;
          case "H":
            if (store.selectedShapes.length > 0) {
              mirrorHorizontally();
              preventDefault();
            }
            return;
          case "V":
            if (store.selectedShapes.length > 0) {
              mirrorVertically();
              preventDefault();
            }
            return;
        }
      }

      if (store.currentTool === "select" && !isCtrl && !isShift && !isAlt) {
        const panStep = 50;

        switch (e.key) {
          case "ArrowUp":
            setPan({ x: store.pan.x, y: store.pan.y + panStep });
            preventDefault();
            return;
          case "ArrowDown":
            setPan({ x: store.pan.x, y: store.pan.y - panStep });
            preventDefault();
            return;
          case "ArrowLeft":
            setPan({ x: store.pan.x + panStep, y: store.pan.y });
            preventDefault();
            return;
          case "ArrowRight":
            setPan({ x: store.pan.x - panStep, y: store.pan.y });
            preventDefault();
            return;
        }
      }

      if (isCtrl && !isShift && !isAlt) {
        switch (e.key) {
          case "=":
          case "+":
            handleZoomIn();
            preventDefault();
            return;
          case "-":
          case "_":
            handleZoomOut();
            preventDefault();
            return;
        }
      }

      if (isCtrl && !isShift && !isAlt) {
        switch (e.key) {
          case "ArrowUp":
            handleZoomIn();
            preventDefault();
            return;
          case "ArrowDown":
            handleZoomOut();
            preventDefault();
            return;
        }
      }

      if (e.key === "Escape" && store.currentTool === "polygon") {
        const { cancelPolygonDrawing } = require("../events/polygon-events");
        cancelPolygonDrawing();
        preventDefault();
        return;
      }
    },
    [getToolMapping]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getShortcuts = useCallback(
    () => ({
      tools: {
        "1": "Select Tool",
        "2": "Pan Tool",
        "3": "Rectangle Tool",
        "4": "Ellipse Tool",
        "5": "Polygon Tool",
        "6": "Text Tool",
      },
      actions: {
        "Ctrl+Z": "Undo",
        "Ctrl+Y / Ctrl+Shift+Z": "Redo",
        "Ctrl+A": "Select All",
        "Ctrl+D": "Duplicate",
        "Delete/Backspace": "Delete Selected",
        Escape: "Clear Selection & Select Tool",
        "Ctrl+N": "New Canvas",
      },
      transformations: {
        "Ctrl+Shift+H": "Mirror Horizontally",
        "Ctrl+Shift+V": "Mirror Vertically",
      },
      navigation: {
        "Ctrl+0": "Center Canvas",
        "Arrow Keys": "Pan Canvas (Select Mode)",
        "Ctrl+Arrow Up/Down": "Zoom In/Out",
        "Ctrl + / Ctrl -": "Zoom In/Out",
      },
      selection: {
        "Ctrl+Shift+D": "Clear Selection",
      },
    }),
    []
  );

  return {
    handleKeyDown,
    getShortcuts,
  };
};
