import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  RectangleShape,
  EllipseShape,
  TextShape,
  PolygonShape,
  ImageShape,
  SVGShape,
} from "../types";
import { generateShapeId } from "./stageTransform";
import { addShapeToStage } from "../shapes";
import { getEventManager } from "../events/event-manager";
import { useSeatMapStore } from "../store/seat-map-store";
import { shapes } from "../variables";
import { updateSVGGraphics } from "../shapes/svg-shape";
import { updateImageGraphics } from "../shapes/image-shape";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { getSelectionTransform } from "../events/transform-events";

/**
 * Default offset for duplicated items
 */
const DUPLICATE_OFFSET = { x: 20, y: 20 };

/**
 * Duplicates a rectangle shape
 */
const duplicateRectangle = (original: RectangleShape): RectangleShape => {
  const graphics = new PIXI.Graphics();
  graphics
    .roundRect(
      -original.width / 2,
      -original.height / 2,
      original.width,
      original.height,
      original.cornerRadius
    )
    .fill(original.color)
    .stroke({ width: original.strokeWidth, color: original.strokeColor });

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.rotation = original.rotation;
  graphics.scale.set(original.scaleX, original.scaleY);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: RectangleShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name} (Copy)`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  return duplicated;
};

/**
 * Duplicates an ellipse shape
 */
const duplicateEllipse = (original: EllipseShape): EllipseShape => {
  const graphics = new PIXI.Graphics();

  // Create the same gradient if it exists
  const radialGradient = new PIXI.FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: 0xffff00 },
      { offset: 1, color: original.color },
    ],
    textureSpace: "local",
  });

  graphics
    .ellipse(0, 0, original.radiusX, original.radiusY)
    .fill(radialGradient);
  graphics.stroke({ width: original.strokeWidth, color: original.strokeColor });

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.rotation = original.rotation;
  graphics.scale.set(original.scaleX, original.scaleY);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: EllipseShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name} (Copy)`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  return duplicated;
};

/**
 * Duplicates a text shape
 */
const duplicateText = (original: TextShape): TextShape => {
  const textGraphics = new PIXI.Text({
    text: original.text,
    style: {
      fontFamily: original.fontFamily,
      fontSize: original.fontSize,
      fill: original.color,
      align: original.textAlign,
    },
  });

  textGraphics.anchor.set(0.5, 0.5);
  textGraphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );

  textGraphics.rotation = original.rotation;
  textGraphics.scale.set(original.scaleX, original.scaleY);
  textGraphics.eventMode = "static";
  textGraphics.cursor = "pointer";

  const duplicated: TextShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name} (Copy)`,
    graphics: textGraphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  return duplicated;
};

/**
 * Duplicates a polygon shape
 */
const duplicatePolygon = (original: PolygonShape): PolygonShape => {
  const graphics = new PIXI.Graphics();

  // Deep copy the points array
  const duplicatedPoints = original.points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: point.radius,
  }));

  const duplicated: PolygonShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name} (Copy)`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    points: duplicatedPoints,
    selected: false,
  };

  // Update graphics with the new polygon
  updatePolygonGraphics(duplicated);

  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  return duplicated;
};

/**
 * Duplicates an image shape
 */
const duplicateImage = async (original: ImageShape): Promise<ImageShape> => {
  try {
    // Get the original texture from the sprite
    const originalTexture = original.graphics.texture;

    // Create new sprite with the same texture
    const sprite = new PIXI.Sprite(originalTexture);
    sprite.anchor.set(0.5, 0.5);
    sprite.eventMode = "static";
    sprite.cursor = "pointer";

    const duplicated: ImageShape = {
      ...original,
      id: generateShapeId(),
      name: `${original.name} (Copy)`,
      graphics: sprite,
      x: original.x + DUPLICATE_OFFSET.x,
      y: original.y + DUPLICATE_OFFSET.y,
      selected: false,
    };

    // Update graphics
    updateImageGraphics(duplicated);

    return duplicated;
  } catch (error) {
    console.error("Failed to duplicate image:", error);
    throw new Error("Failed to duplicate image");
  }
};

/**
 * Duplicates an SVG shape
 */
const duplicateSVG = (original: SVGShape): SVGShape => {
  const graphics = new PIXI.Graphics();

  try {
    // Use the same SVG content
    graphics.svg(original.svgContent);

    // Get bounds and center the graphics
    const bounds = graphics.getLocalBounds();
    graphics.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  } catch (error) {
    console.error("Failed to duplicate SVG graphics:", error);
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

    graphics.pivot.set(0, 0);
  }

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: SVGShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name} (Copy)`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  // Update graphics with proper transforms
  updateSVGGraphics(duplicated);

  return duplicated;
};

/**
 * Duplicates a container and all its children
 */
const duplicateContainer = async (
  original: ContainerGroup
): Promise<ContainerGroup> => {
  try {
    // Create new container graphics
    const containerGraphics = new PIXI.Container();
    containerGraphics.eventMode = "static";
    containerGraphics.cursor = "pointer";
    containerGraphics.interactiveChildren = true;

    // Create the duplicated container
    const duplicated: ContainerGroup = {
      ...original,
      id: generateShapeId(),
      name: `${original.name} (Copy)`,
      graphics: containerGraphics,
      x: original.x + DUPLICATE_OFFSET.x,
      y: original.y + DUPLICATE_OFFSET.y,
      children: [],
      selected: false,
    };

    // Recursively duplicate all children
    for (const child of original.children) {
      const duplicatedChild = await duplicateShape(child, false);
      if (duplicatedChild) {
        duplicated.children.push(duplicatedChild);
        containerGraphics.addChild(duplicatedChild.graphics);
      }
    }
    // Position the container
    containerGraphics.position.set(duplicated.x, duplicated.y);
    containerGraphics.rotation = duplicated.rotation;
    containerGraphics.scale.set(duplicated.scaleX, duplicated.scaleY);
    containerGraphics.alpha = duplicated.opacity;
    containerGraphics.visible = duplicated.visible;

    return duplicated;
  } catch (error) {
    console.error("Failed to duplicate container:", error);
    throw new Error("Failed to duplicate container");
  }
};

/**
 * Duplicates a single shape based on its type
 */
export const duplicateShape = async (
  shape: CanvasItem,
  enableEventListeners: boolean = true
): Promise<CanvasItem | null> => {
  try {
    let duplicated: CanvasItem;

    switch (shape.type) {
      case "rectangle":
        duplicated = duplicateRectangle(shape as RectangleShape);
        break;
      case "ellipse":
        duplicated = duplicateEllipse(shape as EllipseShape);
        break;
      case "text":
        duplicated = duplicateText(shape as TextShape);
        break;
      case "polygon":
        duplicated = duplicatePolygon(shape as PolygonShape);
        break;
      case "image":
        duplicated = await duplicateImage(shape as ImageShape);
        break;
      case "svg":
        duplicated = duplicateSVG(shape as SVGShape);
        break;
      case "container":
        duplicated = await duplicateContainer(shape as ContainerGroup);
        break;
      default:
        console.warn(`Duplication not implemented for shape: ${shape}`);
        return null;
    }

    const eventManager = getEventManager();
    if (eventManager && enableEventListeners) {
      eventManager.addShapeEvents(duplicated);
    }

    return duplicated;
  } catch (error) {
    console.error("Failed to duplicate shape:", error);
    return null;
  }
};

/**
 * Duplicates multiple selected shapes
 */
export const duplicateSelectedShapes = async (): Promise<CanvasItem[]> => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  if (selectedShapes.length === 0) {
    console.warn("No shapes selected for duplication");
    return [];
  }

  try {
    const duplicatedShapes: CanvasItem[] = [];

    // Duplicate each selected shape
    for (const shape of selectedShapes) {
      const duplicated = await duplicateShape(shape);
      console.log(duplicated);
      if (duplicated) {
        duplicatedShapes.push(duplicated);

        addShapeToStage(duplicated);
      }
    }
    console.log(shapes);

    // Select the duplicated shapes
    useSeatMapStore.getState().setSelectedShapes(duplicatedShapes, false);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform && duplicatedShapes.length > 0) {
      // Clear original selections
      selectedShapes.forEach((shape) => {
        shape.selected = false;
      });

      // Select duplicated shapes
      duplicatedShapes.forEach((shape) => {
        shape.selected = true;
      });
      selectionTransform.updateSelection(duplicatedShapes);
    }

    return duplicatedShapes;
  } catch (error) {
    console.error("Failed to duplicate selected shapes:", error);
    return [];
  }
};

/**
 * Helper function to check if a shape is inside a container
 */
const isShapeInContainer = (shape: CanvasItem): boolean => {
  return shapes.some((rootShape) => {
    if (rootShape.type === "container") {
      const container = rootShape as ContainerGroup;
      return container.children.some((child) => child.id === shape.id);
    }
    return false;
  });
};
