import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { shapeContainer, shapes, addShape, setShapes } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { updatePolygonGraphics } from "./polygon-shape";

export { createRectangle } from "./rectangle-shape";
export { createEllipse } from "./ellipse-shape";
export { createText } from "./text-shape";
export { updatePolygonGraphics } from "./polygon-shape";

export const addShapeToStage = (shape: PixiShape) => {
  if (shapeContainer) {
    shapeContainer.addChild(shape.graphics);
    addShape(shape);
  }
};

export const updateShapeSelection = (shapeId: string) => {
  shapes.forEach((shape) => {
    if (shape.id === shapeId) {
      shape.selected = !shape.selected;
    } else {
      shape.selected = false;
    }
  });
};

export const deleteShape = (shapeId: string) => {
  const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  if (shapeIndex !== -1) {
    const shape = shapes[shapeIndex];
    if (shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
      shape.graphics.destroy();
    }
    shapes.splice(shapeIndex, 1);
    useSeatMapStore.getState().updateShapes(shapes);
  }
};

export const deleteShapes = () => {
  shapes.forEach((shape) => {
    if (shapeContainer && shape.selected) {
      shapeContainer.removeChild(shape.graphics);
      shape.graphics.destroy();
    }
  });
  setShapes(shapes.filter((shape) => !shape.selected));
  useSeatMapStore.getState().deleteShapes();
};

export const clearCanvas = () => {
  shapes.forEach((shape) => {
    if (shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
      shape.graphics.destroy();
    }
  });
  shapes.length = 0;

  useSeatMapStore.getState().updateShapes(shapes);
  useSeatMapStore.getState().setSelectedShapes([]);
};
