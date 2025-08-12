import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { currentTool, shapes } from "../variables";
import { updateShapeSelection } from "../shapes/index";
import { useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "./transform-events";

export const handleShapeSelection = (
  event: PIXI.FederatedPointerEvent,
  shape: PixiShape
) => {
  // Handle multi-selection with Ctrl/Cmd key
  const isMultiSelect = event.ctrlKey || event.metaKey;

  if (isMultiSelect) {
    // Toggle selection for this shape
    shape.selected = !shape.selected;
  } else {
    // Single selection - deselect all others
    shapes.forEach((s) => {
      s.selected = s.id === shape.id ? !s.selected : false;
    });
  }

  const selectedShapes = shapes.filter((s) => s.selected);
  useSeatMapStore.getState().setSelectedShapes(selectedShapes);
  useSeatMapStore.getState().updateShapes(shapes);

  // Update selection transform
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(selectedShapes);
  }
};

export const onShapeClick = (
  event: PIXI.FederatedPointerEvent,
  shape: PixiShape
) => {
  event.stopPropagation();
  if (currentTool === "select") {
    updateShapeSelection(shape.id);

    const selectedShapes = shapes.filter((s) => s.selected);
    useSeatMapStore.getState().setSelectedShapes(selectedShapes);
    useSeatMapStore.getState().updateShapes(shapes);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection(selectedShapes);
    }
  }
};

export const onStageClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool === "select") {
    shapes.forEach((shape) => {
      shape.selected = false;
    });

    useSeatMapStore.getState().setSelectedShapes([]);
    useSeatMapStore.getState().updateShapes(shapes);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection([]);
    }
  }
};
