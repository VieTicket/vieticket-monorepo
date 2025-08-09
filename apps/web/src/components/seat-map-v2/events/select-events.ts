import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { currentTool, shapes } from "../variables";
import { updateShapeSelection } from "../shapes/index";
import { useSeatMapStore } from "../store/seat-map-store";

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
  }
};

export const onStageClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool === "select") {
    // Deselect all shapes when clicking on empty stage
    shapes.forEach((shape) => {
      shape.selected = false;
      updateShapeSelection(shape.id);
    });

    useSeatMapStore.getState().setSelectedShapes([]);
    useSeatMapStore.getState().updateShapes(shapes);
  }
};
