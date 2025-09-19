import * as PIXI from "pixi.js";
import { SVGShape } from "../types";
import { generateShapeId } from "./index";

/**
 * Creates an SVG shape from SVG content string
 */
export const createSVG = (
  x: number,
  y: number,
  svgContent: string,
  name?: string
): SVGShape => {
  const graphics = new PIXI.Graphics();

  try {
    // Use PIXI's native SVG parsing
    graphics.svg(svgContent);

    // Get the bounds to determine size
    const bounds = graphics.getLocalBounds();
    const originalWidth = bounds.width || 100;
    const originalHeight = bounds.height || 100;

    // Set position
    graphics.position.set(x, y);
    graphics.eventMode = "static";
    graphics.cursor = "pointer";

    const svgShape: SVGShape = {
      id: generateShapeId(),
      name: name || `SVG Shape`,
      type: "svg",
      graphics,
      x,
      y,
      svgContent,
      originalWidth,
      originalHeight,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      selected: false,
    };

    return svgShape;
  } catch (error) {
    console.error("Failed to parse SVG:", error);

    // Fallback: create a simple rectangle as placeholder
    graphics.rect(-50, -25, 100, 50).fill(0xff0000);
    graphics.position.set(x, y);
    graphics.eventMode = "static";
    graphics.cursor = "pointer";

    const svgShape: SVGShape = {
      id: generateShapeId(),
      name: name || `Invalid SVG`,
      type: "svg",
      graphics,
      x,
      y,
      svgContent: `<rect x="-50" y="-25" width="100" height="50" fill="red" />`,
      originalWidth: 100,
      originalHeight: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      selected: false,
    };

    return svgShape;
  }
};

/**
 * Updates SVG shape graphics
 */
export const updateSVGGraphics = (shape: SVGShape) => {
  if (!(shape.graphics instanceof PIXI.Graphics)) {
    return;
  }

  const graphics = shape.graphics;

  // Clear and redraw
  graphics.clear();

  try {
    graphics.svg(shape.svgContent);
  } catch (error) {
    console.error("Failed to update SVG graphics:", error);
    // Fallback to simple rectangle
    graphics.rect(-50, -25, 100, 50).fill(0xff0000);
  }

  // Apply transforms
  graphics.position.set(shape.x, shape.y);
  graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
  graphics.rotation = shape.rotation || 0;
  graphics.alpha = shape.opacity || 1;
  graphics.visible = shape.visible;

  // Update selection appearance
  if (shape.selected) {
    // Add a subtle outline for selection
    graphics.stroke({ width: 2, color: 0x0099ff, alpha: 0.8 });
  }
};

/**
 * Resizes an SVG shape while maintaining aspect ratio
 */
export const resizeSVG = (
  shape: SVGShape,
  newWidth: number,
  newHeight: number,
  maintainAspectRatio: boolean = true
): void => {
  if (maintainAspectRatio) {
    const aspectRatio = shape.originalWidth / shape.originalHeight;

    if (newWidth / newHeight > aspectRatio) {
      // Constrain by height
      newWidth = newHeight * aspectRatio;
    } else {
      // Constrain by width
      newHeight = newWidth / aspectRatio;
    }
  }

  shape.scaleX = newWidth / shape.originalWidth;
  shape.scaleY = newHeight / shape.originalHeight;

  updateSVGGraphics(shape);
};

/**
 * Updates the SVG content of a shape
 */
export const updateSVGContent = (
  shape: SVGShape,
  newSvgContent: string
): void => {
  shape.svgContent = newSvgContent;

  // Temporarily clear to get new bounds
  shape.graphics.clear();

  try {
    shape.graphics.svg(newSvgContent);
    const bounds = shape.graphics.getLocalBounds();
    shape.originalWidth = bounds.width || shape.originalWidth;
    shape.originalHeight = bounds.height || shape.originalHeight;
  } catch (error) {
    console.error("Failed to update SVG content:", error);
  }

  updateSVGGraphics(shape);
};
