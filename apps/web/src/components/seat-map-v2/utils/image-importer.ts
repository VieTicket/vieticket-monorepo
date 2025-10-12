import * as PIXI from "pixi.js";
import { CanvasItem } from "../types";
import { generateShapeId } from "../shapes";
import { getEventManager } from "../events/event-manager";
import { addShapeToStage } from "../shapes";
import { useSeatMapStore } from "../store/seat-map-store";
import { createSVG } from "../shapes/svg-shape";

export interface ImageShape extends Omit<CanvasItem, "type" | "graphics"> {
  type: "image";
  src: string;
  originalWidth: number;
  originalHeight: number;
  graphics: PIXI.Sprite;
}

/**
 * Imports an image or SVG file to the canvas
 */
export const importImageToCanvas = async (file: File): Promise<CanvasItem> => {
  try {
    if (file.type === "image/svg+xml") {
      // Handle SVG files using PIXI's native SVG support
      return await importSVGToCanvas(file);
    } else {
      // Handle regular image files
      return await importImageAsSprite(file);
    }
  } catch (error) {
    console.error("Failed to import file:", error);
    throw new Error(
      "Failed to import file. Please check the file format and try again."
    );
  }
};

/**
 * Imports SVG files using PIXI's native SVG parsing
 */
const importSVGToCanvas = async (file: File): Promise<CanvasItem> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const svgContent = event.target?.result as string;

        // Clean up the SVG content (remove XML declaration, etc.)
        const cleanSvgContent = svgContent
          .replace(/<\?xml[^>]*\?>/g, "")
          .replace(/<!DOCTYPE[^>]*>/g, "")
          .trim();

        // Create SVG shape
        const centerX = 400; // Default center position
        const centerY = 300;

        const svgShape = createSVG(
          centerX,
          centerY,
          cleanSvgContent,
          `SVG: ${file.name}`
        );

        // Scale down if SVG is too large
        const maxSize = 400;
        if (
          svgShape.originalWidth > maxSize ||
          svgShape.originalHeight > maxSize
        ) {
          const scaleRatio = Math.min(
            maxSize / svgShape.originalWidth,
            maxSize / svgShape.originalHeight
          );
          svgShape.scaleX = scaleRatio;
          svgShape.scaleY = scaleRatio;
          svgShape.graphics.scale.set(scaleRatio, scaleRatio);
        }

        // Add event listeners
        const eventManager = getEventManager();
        if (eventManager) {
          eventManager.addShapeEvents(svgShape);
        }

        // Add to stage
        addShapeToStage(svgShape);

        // Update store
        useSeatMapStore.getState().setSelectedShapes([svgShape]);

        resolve(svgShape);
      } catch (error) {
        reject(new Error(`Failed to parse SVG: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read SVG file"));
    };

    reader.readAsText(file);
  });
};

/**
 * Imports regular image files as sprites using a more reliable method
 */
const importImageAsSprite = async (file: File): Promise<ImageShape> => {
  return new Promise((resolve, reject) => {
    // Create an HTML image element first
    const img = new Image();

    img.onload = async () => {
      try {
        // Create canvas to convert image to texture
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Set canvas dimensions
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Create PIXI texture from canvas
        const texture = PIXI.Texture.from(canvas);

        // Clean up the object URL
        URL.revokeObjectURL(img.src);

        // Create sprite
        const sprite = new PIXI.Sprite(texture);

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        // Scale down if image is too large
        const maxSize = 800;
        let scaleX = 1;
        let scaleY = 1;

        if (originalWidth > maxSize || originalHeight > maxSize) {
          const scaleRatio = Math.min(
            maxSize / originalWidth,
            maxSize / originalHeight
          );
          scaleX = scaleRatio;
          scaleY = scaleRatio;
        }

        sprite.anchor.set(0.5, 0.5);
        const centerX = 400;
        const centerY = 300;

        sprite.position.set(centerX, centerY);
        sprite.scale.set(scaleX, scaleY);
        sprite.eventMode = "static";
        sprite.cursor = "pointer";

        const imageShape: ImageShape = {
          id: generateShapeId(),
          name: `Image: ${file.name}`,
          type: "image",
          graphics: sprite,
          x: centerX,
          y: centerY,
          src: file.name, // Store filename instead of blob URL
          originalWidth,
          originalHeight,
          scaleX,
          scaleY,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          selected: false,
        };

        const eventManager = getEventManager();
        if (eventManager) {
          eventManager.addShapeEvents(imageShape as any);
        }

        addShapeToStage(imageShape as any);
        useSeatMapStore.getState().setSelectedShapes([imageShape as any]);

        resolve(imageShape);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    // Create object URL and set it as image source
    const objectURL = URL.createObjectURL(file);
    img.src = objectURL;
  });
};

/**
 * Alternative method using FileReader for images (backup approach)
 */
const importImageAsSprite_FileReader = async (
  file: File
): Promise<ImageShape> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Create canvas to convert image to texture
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Create PIXI texture from canvas
          const texture = PIXI.Texture.from(canvas);
          const sprite = new PIXI.Sprite(texture);

          const originalWidth = img.width;
          const originalHeight = img.height;

          // Scale down if image is too large
          const maxSize = 800;
          let scaleX = 1;
          let scaleY = 1;

          if (originalWidth > maxSize || originalHeight > maxSize) {
            const scaleRatio = Math.min(
              maxSize / originalWidth,
              maxSize / originalHeight
            );
            scaleX = scaleRatio;
            scaleY = scaleRatio;
          }

          sprite.anchor.set(0.5, 0.5);
          const centerX = 400;
          const centerY = 300;

          sprite.position.set(centerX, centerY);
          sprite.scale.set(scaleX, scaleY);
          sprite.eventMode = "static";
          sprite.cursor = "pointer";

          const imageShape: ImageShape = {
            id: generateShapeId(),
            name: `Image: ${file.name}`,
            type: "image",
            graphics: sprite,
            x: centerX,
            y: centerY,
            src: file.name,
            originalWidth,
            originalHeight,
            scaleX,
            scaleY,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            selected: false,
          };

          const eventManager = getEventManager();
          if (eventManager) {
            eventManager.addShapeEvents(imageShape as any);
          }

          addShapeToStage(imageShape as any);
          useSeatMapStore.getState().setSelectedShapes([imageShape as any]);

          resolve(imageShape);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
};
