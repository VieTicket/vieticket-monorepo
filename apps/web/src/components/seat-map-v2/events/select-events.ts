import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  RectangleShape,
  EllipseShape,
  TextShape,
  PolygonShape,
} from "../types";
import {
  currentTool,
  setIsNestedShapeSelected,
  setPreviouslyClickedShape,
  shapes,
} from "../variables";
import { clearAllSelections, findTopmostChildAtPoint } from "../shapes/index";
import { useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "./transform-events";
import { findShapeInContainer } from "../shapes/index";

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
    clearAllSelections();
    setPreviouslyClickedShape(null);
    setIsNestedShapeSelected(false);
    useSeatMapStore.getState().setSelectedShapes([]);
    useSeatMapStore.getState().updateShapes(shapes);

    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection([]);
    }
  }
};

export const handleDoubleClick = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  for (const selectedShape of selectedShapes) {
    if (selectedShape.type === "container") {
      const container = selectedShape as ContainerGroup;
      const localPoint = event.getLocalPosition(container.graphics);
      const hitChild = findTopmostChildAtPoint(container, localPoint);

      if (hitChild) {
        clearAllSelections();

        hitChild.selected = true;

        useSeatMapStore.getState().setSelectedShapes([hitChild]);
        useSeatMapStore.getState().updateShapes([...shapes]);

        const selectionTransform = getSelectionTransform();
        if (selectionTransform) {
          selectionTransform.updateSelection([hitChild]);
        }

        setPreviouslyClickedShape(hitChild);
        return;
      }
    }
  }
  handleShapeSelection(event, shape);
};
