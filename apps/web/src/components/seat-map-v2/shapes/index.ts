import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { shapeContainer, shapes, addShape } from "../variables";
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

    updateShapeSelectionRectangle(shape);
  });
};

export const updateShapeSelectionRectangle = (shape: PixiShape) => {
  if (shape.graphics instanceof PIXI.Graphics) {
    shape.graphics.clear();

    // Save current transform state
    shape.graphics.save();

    // Reset transform to apply our custom transformations
    shape.graphics.resetTransform();

    // Apply transformations in the correct order: translate -> rotate -> scale
    shape.graphics.translateTransform(shape.x, shape.y);

    // Apply rotation if the shape has rotation property
    if (shape.rotation) {
      shape.graphics.rotateTransform(shape.rotation);
    }

    // Apply scaling if the shape has scale properties
    if (shape.scaleX || shape.scaleY) {
      const scaleX = shape.scaleX || 1;
      const scaleY = shape.scaleY || scaleX;
      shape.graphics.scaleTransform(scaleX, scaleY);
    }

    // Draw the shape based on its type
    if (shape.type === "rectangle" && shape.width && shape.height) {
      // Draw rectangle centered at origin since we translated to position
      shape.graphics
        .roundRect(
          -shape.width / 2,
          -shape.height / 2,
          shape.width,
          shape.height,
          10
        )
        .fill(shape.color)
        .stroke({
          width: shape.selected ? 3 : 2,
          color: shape.selected ? 0xfbbf24 : 0x1e40af,
        });
    } else if (shape.type === "ellipse" && shape.radiusX && shape.radiusY) {
      // Draw ellipse centered at origin
      shape.graphics
        .ellipse(0, 0, shape.radiusX, shape.radiusY)
        .stroke({
          width: shape.selected ? 3 : 2,
          color: shape.selected ? 0xfbbf24 : 0x047857,
        })
        .fill(shape.color);
    } else if (shape.type === "polygon" && shape.points) {
      // For polygons, use relative points from center
      const centerX =
        shape.points.reduce((sum, p) => sum + p.x, 0) / shape.points.length;
      const centerY =
        shape.points.reduce((sum, p) => sum + p.y, 0) / shape.points.length;

      // Create relative points from center
      const relativePoints = shape.points.map((point) => ({
        x: point.x - centerX,
        y: point.y - centerY,
        radius: shape.cornerRadius || 10,
      }));

      shape.graphics
        .roundShape(relativePoints, shape.cornerRadius || 10)
        .fill(shape.color)
        .stroke({
          width: shape.selected ? 3 : 2,
          color: shape.selected ? 0xfbbf24 : 0x8e44ad,
        });
    }

    // Restore transform state
    shape.graphics.restore();
  } else if (shape.graphics instanceof PIXI.Text) {
    // Handle text selection
    shape.graphics.style.fill = shape.selected ? 0xfbbf24 : 0x1e40af;

    // Apply text transformations if needed
    if (shape.scaleX || shape.scaleY) {
      const scaleX = shape.scaleX || 1;
      const scaleY = shape.scaleY || scaleX;
      shape.graphics.scale.set(scaleX, scaleY);
    }

    if (shape.rotation) {
      shape.graphics.rotation = shape.rotation;
    }
  }
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
