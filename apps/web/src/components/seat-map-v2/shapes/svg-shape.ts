import * as PIXI from "pixi.js";
import { SVGShape } from "../types";
import { generateShapeId } from "./index";

/**
 * Color mapping for CSS color keywords that PIXI.js doesn't understand
 */
const CSS_COLOR_MAP: Record<string, string> = {
  currentColor: "#000000",
  inherit: "#000000",
  transparent: "rgba(0,0,0,0)",

  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff",
  yellow: "#ffff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  gray: "#808080",
  grey: "#808080",
};

/**
 * Preprocesses SVG content to make it compatible with PIXI.js
 */
const preprocessSVGContent = (svgContent: string): string => {
  let processedContent = svgContent;

  Object.entries(CSS_COLOR_MAP).forEach(([keyword, hexValue]) => {
    const regex = new RegExp(`(fill|stroke)="${keyword}"`, "gi");
    processedContent = processedContent.replace(regex, `$1="${hexValue}"`);

    const regex2 = new RegExp(`(fill|stroke)=${keyword}`, "gi");
    processedContent = processedContent.replace(regex2, `$1="${hexValue}"`);
  });

  processedContent = processedContent

    .replace(/\s+data-[^=]*="[^"]*"/gi, "")

    .replace(/\s+aria-[^=]*="[^"]*"/gi, "")

    .replace(/\s+class="[^"]*"/gi, "")

    .replace(/\s+style="[^"]*"/gi, "")

    .replace(/stroke-width=""/g, 'stroke-width="1"')

    .replace(/viewBox="([^"]*)"/, (match, viewBoxValue) => {
      return match;
    });

  if (
    !processedContent.includes("fill=") &&
    !processedContent.includes("stroke=")
  ) {
    processedContent = processedContent.replace(
      /<path\s+/,
      '<path stroke="#000000" fill="none" '
    );
    processedContent = processedContent.replace(
      /<circle\s+/,
      '<circle stroke="#000000" fill="none" '
    );
    processedContent = processedContent.replace(
      /<rect\s+/,
      '<rect stroke="#000000" fill="none" '
    );
    processedContent = processedContent.replace(
      /<ellipse\s+/,
      '<ellipse stroke="#000000" fill="none" '
    );
    processedContent = processedContent.replace(
      /<line\s+/,
      '<line stroke="#000000" '
    );
    processedContent = processedContent.replace(
      /<polyline\s+/,
      '<polyline stroke="#000000" fill="none" '
    );
    processedContent = processedContent.replace(
      /<polygon\s+/,
      '<polygon stroke="#000000" fill="none" '
    );
  }

  return processedContent;
};

/**
 * Validates SVG content for PIXI.js compatibility
 */
const validateSVGContent = (svgContent: string): boolean => {
  try {
    if (!svgContent.includes("<svg")) {
      return false;
    }

    const unsupportedFeatures = [
      "<defs>",
      "<use>",
      "<foreignObject>",
      "<script>",
      "<style>",
    ];

    const hasUnsupportedFeatures = unsupportedFeatures.some((feature) =>
      svgContent.toLowerCase().includes(feature.toLowerCase())
    );

    if (hasUnsupportedFeatures) {
      console.warn(
        "SVG contains features that might not be supported by PIXI.js"
      );
    }

    return true;
  } catch (error) {
    return false;
  }
};

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
    if (!validateSVGContent(svgContent)) {
      throw new Error("Invalid SVG content");
    }

    const processedSVG = preprocessSVGContent(svgContent);

    console.log("Original SVG:", svgContent);
    console.log("Processed SVG:", processedSVG);

    graphics.svg(processedSVG);

    const bounds = graphics.getLocalBounds();
    const originalWidth = Math.max(bounds.width || 100, 10);
    const originalHeight = Math.max(bounds.height || 100, 10);

    graphics.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );

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
      svgContent: processedSVG,
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

    graphics.clear();

    graphics
      .circle(0, 0, 30)
      .fill(0xffffff)
      .stroke({ width: 2, color: 0xff0000 });

    graphics
      .moveTo(-15, -15)
      .lineTo(15, 15)
      .moveTo(15, -15)
      .lineTo(-15, 15)
      .stroke({ width: 3, color: 0xff0000 });

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
      svgContent: `<svg xmlns="http:
        <circle cx="30" cy="30" r="30" fill="white" stroke="red" stroke-width="2"/>
        <path d="M15 15 L45 45 M45 15 L15 45" stroke="red" stroke-width="3"/>
      </svg>`,
      originalWidth: 60,
      originalHeight: 60,
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
 * Gets the actual rendered bounds of an SVG shape
 */
export const getSVGBounds = (
  shape: SVGShape
): { width: number; height: number } => {
  try {
    if (shape.graphics instanceof PIXI.Graphics) {
      const bounds = shape.graphics.getLocalBounds();
      return {
        width: Math.max(bounds.width || shape.originalWidth, 10),
        height: Math.max(bounds.height || shape.originalHeight, 10),
      };
    }
  } catch (error) {
    console.warn("Failed to get SVG bounds from graphics:", error);
  }

  return {
    width: shape.originalWidth,
    height: shape.originalHeight,
  };
};

/**
 * Updates SVG shape graphics and recalculates bounds
 */
export const updateSVGGraphics = (shape: SVGShape) => {
  if (!(shape.graphics instanceof PIXI.Graphics)) {
    return;
  }

  const graphics = shape.graphics;

  graphics.clear();

  try {
    graphics.svg(shape.svgContent);

    const bounds = graphics.getLocalBounds();
    const actualBounds = getSVGBounds(shape);

    shape.originalWidth = actualBounds.width;
    shape.originalHeight = actualBounds.height;

    graphics.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  } catch (error) {
    console.error("Failed to update SVG graphics:", error);

    graphics
      .circle(0, 0, 30)
      .fill(0xffffff)
      .stroke({ width: 2, color: 0xff0000 });

    graphics
      .moveTo(-15, -15)
      .lineTo(15, 15)
      .moveTo(15, -15)
      .lineTo(-15, 15)
      .stroke({ width: 3, color: 0xff0000 });

    shape.originalWidth = 60;
    shape.originalHeight = 60;

    graphics.pivot.set(0, 0);
  }

  graphics.position.set(shape.x, shape.y);
  graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
  graphics.rotation = shape.rotation || 0;
  graphics.alpha = shape.opacity || 1;
  graphics.visible = shape.visible;

  if (shape.selected) {
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
      newWidth = newHeight * aspectRatio;
    } else {
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
  try {
    const processedContent = preprocessSVGContent(newSvgContent);
    shape.svgContent = processedContent;

    shape.graphics.clear();

    shape.graphics.svg(processedContent);
    const bounds = shape.graphics.getLocalBounds();
    shape.originalWidth = Math.max(bounds.width || shape.originalWidth, 10);
    shape.originalHeight = Math.max(bounds.height || shape.originalHeight, 10);

    updateSVGGraphics(shape);
  } catch (error) {
    console.error("Failed to update SVG content:", error);

    updateSVGGraphics(shape);
  }
};

/**
 * Creates a simple SVG from basic parameters (useful for fallbacks)
 */
export const createSimpleSVG = (
  x: number,
  y: number,
  width: number = 100,
  height: number = 100,
  color: string = "#000000",
  name?: string
): SVGShape => {
  const svgContent = `<svg xmlns="http:
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="2"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="${color}" opacity="0.3"/>
  </svg>`;

  return createSVG(x, y, svgContent, name || "Simple SVG");
};
