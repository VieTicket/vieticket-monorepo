import * as PIXI from "pixi.js";
import {
  CanvasItem,
  RectangleShape,
  EllipseShape,
  TextShape,
  PolygonShape,
} from "../../types";
import { updatePolygonGraphics } from "../../shapes/polygon-shape";

export const updateShapeGraphics = (
  shape: CanvasItem,
  updates: Partial<CanvasItem>
) => {
  if (shape.type === "rectangle") {
    if (
      (updates as RectangleShape).width !== undefined ||
      (updates as RectangleShape).height !== undefined ||
      (updates as RectangleShape).cornerRadius !== undefined ||
      (updates as RectangleShape).color !== undefined ||
      (updates as RectangleShape).strokeColor !== undefined
    ) {
      const graphics = shape.graphics as PIXI.Graphics;
      graphics.clear();
      graphics
        .roundRect(
          -shape.width / 2,
          -shape.height / 2,
          shape.width,
          shape.height,
          shape.cornerRadius
        )
        .fill(shape.color)
        .stroke({ width: shape.strokeWidth, color: shape.strokeColor });
    }
  } else if (shape.type === "ellipse") {
    if (
      (updates as EllipseShape).radiusX !== undefined ||
      (updates as EllipseShape).radiusY !== undefined ||
      (updates as EllipseShape).color !== undefined ||
      (updates as EllipseShape).strokeColor !== undefined
    ) {
      const graphics = shape.graphics as PIXI.Graphics;
      graphics.clear();
      graphics
        .ellipse(0, 0, shape.radiusX, shape.radiusY)
        .fill(shape.color)
        .stroke({ width: shape.strokeWidth, color: shape.strokeColor });
    }
  } else if (shape.type === "text") {
    if (
      (updates as TextShape).text !== undefined ||
      (updates as TextShape).fontSize !== undefined ||
      (updates as TextShape).fontFamily !== undefined ||
      (updates as TextShape).color !== undefined
    ) {
      const textGraphics = shape.graphics as PIXI.Text;
      textGraphics.text = shape.text;
      textGraphics.style.fontSize = shape.fontSize;
      textGraphics.style.fontFamily = shape.fontFamily;
      textGraphics.style.fill = shape.color;
    }
  } else if (shape.type === "polygon") {
    if (
      (updates as PolygonShape).points !== undefined ||
      (updates as PolygonShape).cornerRadius !== undefined ||
      (updates as PolygonShape).color !== undefined ||
      (updates as PolygonShape).strokeColor !== undefined
    ) {
      updatePolygonGraphics(shape);
    }
  }
};
