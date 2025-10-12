import { addShapeToStage, generateShapeId } from ".";
import { getEventManager } from "../events/event-manager";
import { ImageShape } from "../types";
import * as PIXI from "pixi.js";

/**
 * Gets the actual rendered bounds of an image shape
 */
export const getImageBounds = (
  shape: ImageShape
): { width: number; height: number } => {
  try {
    if (shape.graphics instanceof PIXI.Sprite) {
      const texture = shape.graphics.texture;
      return {
        width: texture.width || shape.originalWidth,
        height: texture.height || shape.originalHeight,
      };
    }
  } catch (error) {
    console.warn("Failed to get image bounds from graphics:", error);
  }

  return {
    width: shape.originalWidth,
    height: shape.originalHeight,
  };
};

/**
 * Updates image shape graphics
 */
export const updateImageGraphics = (shape: ImageShape) => {
  if (!(shape.graphics instanceof PIXI.Sprite)) {
    return;
  }

  const sprite = shape.graphics;

  // Update transform properties
  sprite.position.set(shape.x, shape.y);
  sprite.scale.set(shape.scaleX || 1, shape.scaleY || 1);
  sprite.rotation = shape.rotation || 0;
  sprite.alpha = shape.opacity || 1;
  sprite.visible = shape.visible;

  // Update selection appearance
  if (shape.selected) {
    sprite.tint = 0xffff99; // Light yellow tint for selection
  } else {
    sprite.tint = 0xffffff; // Normal tint
  }
};

/**
 * Resizes an image shape while maintaining aspect ratio
 */
export const resizeImage = (
  shape: ImageShape,
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

  updateImageGraphics(shape);
};

/**
 * Gets the current scaled dimensions of an image
 */
export const getImageDimensions = (
  shape: ImageShape
): { width: number; height: number } => {
  return {
    width: shape.originalWidth * (shape.scaleX || 1),
    height: shape.originalHeight * (shape.scaleY || 1),
  };
};

/**
 * Creates a copy of an image shape
 */
export const duplicateImage = async (
  originalShape: ImageShape
): Promise<ImageShape> => {
  try {
    // Get the original texture from the sprite
    const originalTexture = originalShape.graphics.texture;

    // Create new sprite with the same texture
    const sprite = new PIXI.Sprite(originalTexture);

    sprite.anchor.set(0.5, 0.5);
    sprite.eventMode = "static";
    sprite.cursor = "pointer";

    // Create new shape with offset position
    const duplicatedShape: ImageShape = {
      ...originalShape,
      id: generateShapeId(),
      name: `${originalShape.name} (Copy)`,
      x: originalShape.x + 20,
      y: originalShape.y + 20,
      graphics: sprite,
      selected: false,
    };

    // Update graphics
    updateImageGraphics(duplicatedShape);

    // Add event listeners
    const eventManager = getEventManager();
    if (eventManager) {
      eventManager.addShapeEvents(duplicatedShape as any);
    }

    // Add to stage
    addShapeToStage(duplicatedShape as any);

    return duplicatedShape;
  } catch (error) {
    console.error("Failed to duplicate image:", error);
    throw new Error("Failed to duplicate image");
  }
};
