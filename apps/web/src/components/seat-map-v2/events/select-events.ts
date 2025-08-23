import * as PIXI from "pixi.js";
import { CanvasItem } from "../types";
import { currentTool, setPreviouslyClickedShape, shapes } from "../variables";
import { updateShapeSelection } from "../shapes/index";
import { useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "./transform-events";

export const handleShapeSelection = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  const isMultiSelect = event.ctrlKey || event.metaKey;
  if (isMultiSelect) {
    shape.selected = !shape.selected;
  } else {
    shapes.forEach((s) => {
      s.selected = s.id === shape.id ? !s.selected : false;
    });
  }
  const selectedShapes = shapes.filter((s) => s.selected);
  useSeatMapStore.getState().setSelectedShapes(selectedShapes);
  useSeatMapStore.getState().updateShapes(shapes);
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(selectedShapes);
  }
};

export const onStageClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool === "select") {
    shapes.forEach((shape) => {
      shape.selected = false;
    });

    setPreviouslyClickedShape(null);
    useSeatMapStore.getState().setSelectedShapes([]);
    useSeatMapStore.getState().updateShapes(shapes);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection([]);
    }
  }
};
