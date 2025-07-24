/**
 * Why Client-Side Canvas Capture is Better Than Server-Side:
 *
 * 1. SSR Issues with Canvas Libraries:
 *    - `createCanvas` from 'canvas' requires native dependencies
 *    - fabric.js also has SSR compatibility issues
 *    - These libraries don't work in Vercel/serverless environments
 *
 * 2. Konva-Specific Features:
 *    - Our seat map uses Konva-specific features (transformations, groups, etc.)
 *    - Server-side libraries would require completely rewriting the rendering logic
 *    - We'd lose visual fidelity and exact representation
 *
 * 3. Real-Time Accuracy:
 *    - Client-side capture shows exactly what the user sees
 *    - Server-side rendering might have slight differences in fonts, spacing, etc.
 *
 * 4. Performance:
 *    - Client-side capture is faster (no network round-trip)
 *    - Server resources aren't used for image generation
 */

import { Shape } from "@/types/seat-map-types";

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculate the bounding box that encompasses all shapes in the seat map
 * @param shapes - Array of shapes to analyze
 * @returns BoundingBox object with coordinates and dimensions
 */
export function calculateShapesBoundingBox(shapes: Shape[]): BoundingBox {
  if (shapes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 400,
      maxY: 300,
      width: 400,
      height: 300,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach((shape) => {
    let shapeMinX = shape.x;
    let shapeMinY = shape.y;
    let shapeMaxX = shape.x;
    let shapeMaxY = shape.y;

    switch (shape.type) {
      case "rect":
        shapeMaxX = shape.x + shape.width;
        shapeMaxY = shape.y + shape.height;
        break;

      case "circle":
        shapeMinX = shape.x - shape.radius;
        shapeMinY = shape.y - shape.radius;
        shapeMaxX = shape.x + shape.radius;
        shapeMaxY = shape.y + shape.radius;
        break;

      case "text":
        const textWidth =
          shape.width ||
          Math.max(
            100,
            (shape.name?.length || 10) * (shape.fontSize || 16) * 0.6
          );
        const textHeight = shape.height || (shape.fontSize || 16) * 1.2;
        shapeMaxX = shape.x + textWidth;
        shapeMaxY = shape.y + textHeight;
        break;

      case "polygon":
        if (shape.points && shape.points.length > 0) {
          const pointsMinX = Math.min(
            ...shape.points.map((p) => shape.x + p.x)
          );
          const pointsMinY = Math.min(
            ...shape.points.map((p) => shape.y + p.y)
          );
          const pointsMaxX = Math.max(
            ...shape.points.map((p) => shape.x + p.x)
          );
          const pointsMaxY = Math.max(
            ...shape.points.map((p) => shape.y + p.y)
          );

          shapeMinX = pointsMinX;
          shapeMinY = pointsMinY;
          shapeMaxX = pointsMaxX;
          shapeMaxY = pointsMaxY;
        }
        break;
    }

    minX = Math.min(minX, shapeMinX);
    minY = Math.min(minY, shapeMinY);
    maxX = Math.max(maxX, shapeMaxX);
    maxY = Math.max(maxY, shapeMaxY);
  });

  // Add some padding around the shapes
  const padding = 100;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Capture the seat map stage as an image blob (optimized version)
 * @param stage - Konva Stage instance
 * @param shapes - Array of shapes to determine the capture area
 * @returns Promise<Blob> - The captured image as a blob
 */
export async function captureSeatMapImageOptimized(
  stage: any,
  shapes: Shape[]
): Promise<Blob> {
  if (!stage) {
    throw new Error("Stage reference is required for image capture");
  }

  try {
    const boundingBox = calculateShapesBoundingBox(shapes);

    // Store original stage properties
    const originalProps = {
      x: stage.x(),
      y: stage.y(),
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
    };

    // Calculate optimal dimensions (max 1920x1080 for better performance)
    const maxWidth = 1920;
    const maxHeight = 1080;
    const scaleX = maxWidth / boundingBox.width;
    const scaleY = maxHeight / boundingBox.height;
    const scale = Math.min(scaleX, scaleY, 2); // Max 2x scale

    const finalWidth = Math.min(boundingBox.width * scale, maxWidth);
    const finalHeight = Math.min(boundingBox.height * scale, maxHeight);

    // Position the stage
    const offsetX =
      -boundingBox.minX * scale + (finalWidth - boundingBox.width * scale) / 2;
    const offsetY =
      -boundingBox.minY * scale +
      (finalHeight - boundingBox.height * scale) / 2;

    // Apply transformations
    stage.scale({ x: scale, y: scale });
    stage.position({ x: offsetX, y: offsetY });
    stage.batchDraw();

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 100));

    // FIX: Use toCanvas() method which is the correct Konva API
    const canvas = stage.toCanvas({
      x: 0,
      y: 0,
      width: finalWidth,
      height: finalHeight,
      pixelRatio: 2, // For better quality
    });

    // FIX: Use the canvas.toBlob method properly
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        "image/png",
        0.9
      );
    });

    // Restore original state
    stage.scale({ x: originalProps.scaleX, y: originalProps.scaleY });
    stage.position({ x: originalProps.x, y: originalProps.y });
    stage.batchDraw();

    return blob;
  } catch (error) {
    console.error("Error capturing seat map image:", error);
    throw new Error("Failed to capture seat map image");
  }
}

/**
 * Legacy capture method using toDataURL (as fallback)
 * @param stage - Konva Stage instance
 * @param shapes - Array of shapes to determine the capture area
 * @returns Promise<Blob> - The captured image as a blob
 */
export async function captureSeatMapImage(
  stage: any,
  shapes: Shape[]
): Promise<Blob> {
  if (!stage) {
    throw new Error("Stage reference is required for image capture");
  }

  try {
    // Calculate the bounding box of all shapes
    const boundingBox = calculateShapesBoundingBox(shapes);

    // Store original stage properties
    const originalProps = {
      x: stage.x(),
      y: stage.y(),
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
    };

    // Calculate scale to fit the content nicely in the image
    const targetWidth = 800;
    const targetHeight = 600;
    const scaleX = targetWidth / boundingBox.width;
    const scaleY = targetHeight / boundingBox.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down if needed

    // Calculate final dimensions
    const finalWidth = Math.min(boundingBox.width * scale, targetWidth);
    const finalHeight = Math.min(boundingBox.height * scale, targetHeight);

    // Position the stage to center the content
    const offsetX =
      -boundingBox.minX * scale + (finalWidth - boundingBox.width * scale) / 2;
    const offsetY =
      -boundingBox.minY * scale +
      (finalHeight - boundingBox.height * scale) / 2;

    // Apply transformations
    stage.scale({ x: scale, y: scale });
    stage.position({ x: offsetX, y: offsetY });
    stage.batchDraw();

    // Wait a bit for the stage to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Capture the image using toDataURL (legacy method)
    const dataURL = stage.toDataURL({
      x: 0,
      y: 0,
      width: finalWidth,
      height: finalHeight,
      mimeType: "image/png",
      quality: 0.9,
      pixelRatio: 2, // For better quality
    });

    // Restore original stage properties
    stage.scale({ x: originalProps.scaleX, y: originalProps.scaleY });
    stage.position({ x: originalProps.x, y: originalProps.y });
    stage.batchDraw();

    // Convert data URL to blob
    const response = await fetch(dataURL);
    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error("Error capturing seat map image:", error);
    throw new Error("Failed to capture seat map image");
  }
}

/**
 * Convert a blob to a File object for uploading
 * @param blob - The blob to convert
 * @param filename - The desired filename
 * @returns File object
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}
