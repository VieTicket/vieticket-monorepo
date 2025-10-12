import * as PIXI from "pixi.js";
import { SVGShape } from "../types";
import { generateShapeId } from "./index";

/**
 * Color mapping for CSS color keywords that PIXI.js doesn't understand
 */
const CSS_COLOR_MAP: Record<string, string> = {
  currentColor: "#000000", // Default to black
  inherit: "#000000",
  transparent: "rgba(0,0,0,0)",
  // Add more CSS color keywords as needed
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

  // Replace CSS color keywords with hex values
  Object.entries(CSS_COLOR_MAP).forEach(([keyword, hexValue]) => {
    const regex = new RegExp(`(fill|stroke)="${keyword}"`, "gi");
    processedContent = processedContent.replace(regex, `$1="${hexValue}"`);

    // Also handle attribute values without quotes
    const regex2 = new RegExp(`(fill|stroke)=${keyword}`, "gi");
    processedContent = processedContent.replace(regex2, `$1="${hexValue}"`);
  });

  // Remove or replace problematic attributes
  processedContent = processedContent
    // Remove data attributes that might cause issues
    .replace(/\s+data-[^=]*="[^"]*"/gi, "")
    // Remove aria attributes
    .replace(/\s+aria-[^=]*="[^"]*"/gi, "")
    // Remove class attributes (PIXI doesn't use CSS)
    .replace(/\s+class="[^"]*"/gi, "")
    // Remove style attributes (inline styles might conflict)
    .replace(/\s+style="[^"]*"/gi, "")
    // Ensure stroke-width has a default value if missing
    .replace(/stroke-width=""/g, 'stroke-width="1"')
    // Handle viewBox to ensure proper scaling
    .replace(/viewBox="([^"]*)"/, (match, viewBoxValue) => {
      // Keep viewBox as is - PIXI.js handles this
      return match;
    });

  // If no fill or stroke is specified, add default values
  if (
    !processedContent.includes("fill=") &&
    !processedContent.includes("stroke=")
  ) {
    // Add default stroke to make it visible
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
    // Basic validation - check if it's valid XML-like structure
    if (!svgContent.includes("<svg")) {
      return false;
    }

    // Check for unsupported features that might cause issues
    const unsupportedFeatures = [
      "<defs>", // Definitions might not be fully supported
      "<use>", // Use elements might not work
      "<foreignObject>", // Foreign objects not supported
      "<script>", // Scripts not supported
      "<style>", // CSS styles not supported
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
    // Validate the SVG content first
    if (!validateSVGContent(svgContent)) {
      throw new Error("Invalid SVG content");
    }

    // Preprocess the SVG content
    const processedSVG = preprocessSVGContent(svgContent);

    console.log("Original SVG:", svgContent);
    console.log("Processed SVG:", processedSVG);

    // Use PIXI's native SVG parsing with processed content
    graphics.svg(processedSVG);

    // Get the bounds to determine size
    const bounds = graphics.getLocalBounds();
    const originalWidth = Math.max(bounds.width || 100, 10); // Minimum size of 10
    const originalHeight = Math.max(bounds.height || 100, 10);

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
      svgContent: processedSVG, // Store the processed version
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

    // Create a more informative fallback
    graphics.clear();

    // Draw a placeholder icon
    graphics
      .circle(0, 0, 30)
      .fill(0xffffff)
      .stroke({ width: 2, color: 0xff0000 });

    // Add an "X" to indicate error
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
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
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

  // Clear and redraw
  graphics.clear();

  try {
    graphics.svg(shape.svgContent);

    // Update original dimensions based on actual rendered size
    const actualBounds = getSVGBounds(shape);
    shape.originalWidth = actualBounds.width;
    shape.originalHeight = actualBounds.height;
  } catch (error) {
    console.error("Failed to update SVG graphics:", error);
    // Fallback to error indicator
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

    // Set fallback dimensions
    shape.originalWidth = 60;
    shape.originalHeight = 60;
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
  try {
    // Preprocess the new content
    const processedContent = preprocessSVGContent(newSvgContent);
    shape.svgContent = processedContent;

    // Temporarily clear to get new bounds
    shape.graphics.clear();

    shape.graphics.svg(processedContent);
    const bounds = shape.graphics.getLocalBounds();
    shape.originalWidth = Math.max(bounds.width || shape.originalWidth, 10);
    shape.originalHeight = Math.max(bounds.height || shape.originalHeight, 10);

    updateSVGGraphics(shape);
  } catch (error) {
    console.error("Failed to update SVG content:", error);
    // Keep the old content if update fails
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
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${color}" stroke-width="2"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="${color}" opacity="0.3"/>
  </svg>`;

  return createSVG(x, y, svgContent, name || "Simple SVG");
};
