import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { shapeContainer, shapes, addShape } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { updatePolygonGraphics } from "./polygon-shape";

export { createRectangle } from "./rectangle-shape";
export { createEllipse } from "./ellipse-shape";
export { createText } from "./text-shape";

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

    if (shape.graphics instanceof PIXI.Graphics) {
      if (shape.type === "rectangle" && shape.width && shape.height) {
        shape.graphics.clear();
        shape.graphics
          .roundRect(shape.x, shape.y, shape.width, shape.height, 10)
          .fill(shape.color)
          .stroke({
            width: shape.selected ? 3 : 2,
            color: shape.selected ? 0xfbbf24 : 0x1e40af,
          });
      } else if (shape.type === "ellipse" && shape.radiusX && shape.radiusY) {
        shape.graphics.clear();
        shape.graphics
          .ellipse(shape.x, shape.y, shape.radiusX, shape.radiusY)
          .stroke({
            width: shape.selected ? 3 : 2,
            color: shape.selected ? 0xfbbf24 : 0x047857,
          })
          .fill(shape.color);
      } else if (shape.type === "polygon") {
        updatePolygonGraphics(shape);
      }
    } else if (shape.graphics instanceof PIXI.Text) {
      shape.graphics.style.fill = shape.selected ? 0xfbbf24 : 0x1e40af;
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
  shapes.length = 0;
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
