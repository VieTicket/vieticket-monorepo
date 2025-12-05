import * as PIXI from "pixi.js";
import {
  previewContainer,
  previewGraphics,
  setPreviewGraphics,
  currentTool,
  areaModeContainer,
} from "./variables";
import { calculateGridDimensions } from "./shapes/grid-shape";

export const createPreviewGraphics = () => {
  if (previewGraphics) {
    previewGraphics.destroy();
  }
  const graphics = new PIXI.Graphics();
  setPreviewGraphics(graphics);
  if (previewContainer) {
    previewContainer.addChild(graphics);
  }
};

export const updatePreviewShape = (
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
) => {
  if (!previewGraphics) return;

  previewGraphics.clear();
  previewGraphics.stroke({ width: 2, color: 0x666666, alpha: 0.8 });
  previewGraphics.fill({ color: 0x666666, alpha: 0.2 });

  if (currentTool === "select") {
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);

    // Draw selection rectangle with dashed border effect
    previewGraphics
      .rect(x, y, width, height)
      .fill({ color: 0x0066cc, alpha: 0.1 })
      .stroke({ width: 2, color: 0x0066cc, alpha: 0.8 });
  } else if (currentTool === "rectangle") {
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    previewGraphics
      .roundRect(x, y, width, height, 10)
      .fill(0x3b82f6)
      .stroke(0x1e40af);
  } else if (currentTool === "seat-grid") {
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    previewGraphics.rect(x, y, width, height).fill(0x00bcd4);
  } else if (currentTool === "ellipse") {
    const radiusX = Math.abs(currentX - startX) / 2;
    const radiusY = Math.abs(currentY - startY) / 2;
    const centerX = (startX + currentX) / 2;
    const centerY = (startY + currentY) / 2;
    previewGraphics
      .ellipse(centerX, centerY, radiusX, radiusY)
      .fill(0x10b981)
      .stroke(0x047857);

    previewGraphics.poly([
      { x: startX, y: startY },
      { x: currentX, y: startY },
      { x: currentX, y: currentY },
      { x: startX, y: currentY },
    ]);
  }
};

export const clearPreview = () => {
  if (previewGraphics) {
    previewGraphics.clear();
  }
};

export const createPolygonPreview = () => {
  if (previewGraphics) {
    previewGraphics.destroy();
  }
  const graphics = new PIXI.Graphics();
  setPreviewGraphics(graphics);
  if (previewContainer) {
    previewContainer.addChild(graphics);
  }
};

export const updatePolygonPreview = (
  points: Array<{ x: number; y: number }>,
  isNearFirstPoint: boolean = false
) => {
  if (!previewGraphics || points.length < 2) return;

  previewGraphics.clear();

  // Draw polygon outline
  const strokeColor = isNearFirstPoint ? 0x00ff00 : 0x666666; // Green when near first point
  const fillColor = 0x666666;

  previewGraphics.stroke({ width: 2, color: strokeColor, alpha: 0.8 });
  previewGraphics.fill({ color: fillColor, alpha: 0.2 });

  // Draw the polygon lines
  previewGraphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    previewGraphics.lineTo(points[i].x, points[i].y);
  }

  // If near first point and we have enough points, close the shape
  if (isNearFirstPoint && points.length >= 3) {
    previewGraphics.closePath();
  }

  previewGraphics.stroke();
  previewGraphics.fill();

  // Draw points as small circles
  points.forEach((point, index) => {
    const isFirstPoint = index === 0;
    const pointColor = isFirstPoint ? 0x00ff00 : 0xff0000;
    const pointSize = isFirstPoint ? 6 : 4;

    previewGraphics!
      .circle(point.x, point.y, pointSize)
      .fill(pointColor)
      .stroke({ width: 1, color: 0xffffff });
  });
};

export const clearPolygonPreview = () => {
  if (previewGraphics) {
    previewGraphics.clear();
  }
};
// Add to preview.ts

let freeShapePreviewGraphics: PIXI.Graphics | null = null;

export const createFreeShapePreview = () => {
  if (!previewContainer) return;

  clearFreeShapePreview();

  freeShapePreviewGraphics = new PIXI.Graphics();
  previewContainer.addChild(freeShapePreviewGraphics);
};

export const updateFreeShapePreview = (
  points: Array<{ x: number; y: number }>,
  showCloseIndicator: boolean = false
) => {
  if (!freeShapePreviewGraphics || points.length < 1) return;

  freeShapePreviewGraphics.clear();

  if (points.length < 2) {
    // Just show a dot for the first point
    freeShapePreviewGraphics.circle(points[0].x, points[0].y, 3).fill(0x0099ff);
    return;
  }

  // Draw the path
  freeShapePreviewGraphics.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    freeShapePreviewGraphics.lineTo(points[i].x, points[i].y);
  }

  freeShapePreviewGraphics.stroke({
    width: 2,
    color: 0x0099ff,
    alpha: 0.8,
  });

  // Show close indicator
  if (showCloseIndicator && points.length > 2) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    freeShapePreviewGraphics
      .moveTo(lastPoint.x, lastPoint.y)
      .lineTo(firstPoint.x, firstPoint.y)
      .stroke({
        width: 2,
        color: 0x00ff00,
        alpha: 0.6,
      });

    // Highlight first point
    freeShapePreviewGraphics.circle(firstPoint.x, firstPoint.y, 8).stroke({
      width: 2,
      color: 0x00ff00,
      alpha: 0.8,
    });
  }

  // Show current points
  points.forEach((point, index) => {
    freeShapePreviewGraphics!
      .circle(point.x, point.y, index === 0 ? 5 : 3)
      .fill(index === 0 ? 0x00ff00 : 0x0099ff);
  });
};

export const clearFreeShapePreview = () => {
  if (freeShapePreviewGraphics && previewContainer) {
    previewContainer.removeChild(freeShapePreviewGraphics);
    freeShapePreviewGraphics = null;
  }
};

let seatGridPreviewGraphics: PIXI.Graphics | null = null;

export const createSeatGridPreview = () => {
  if (!previewContainer) return;

  clearSeatGridPreview();

  seatGridPreviewGraphics = new PIXI.Graphics();
  previewContainer.addChild(seatGridPreviewGraphics);
};

// ✅ Update seat grid preview with actual seat visualization
export const updateSeatGridPreview = (
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
) => {
  if (!seatGridPreviewGraphics || !areaModeContainer) return;

  seatGridPreviewGraphics.clear();

  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  // Only show preview if the area is large enough
  if (width < 40 || height < 40) {
    // Show just a transparent rectangle outline for small areas
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);

    seatGridPreviewGraphics
      .rect(x, y, width, height)
      .stroke({ width: 2, color: 0x00bcd4, alpha: 0.8 });
    return;
  }

  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);

  // Get seat settings from area mode container
  const seatSettings = areaModeContainer.defaultSeatSettings;
  const seatRadius = seatSettings.seatRadius;
  const seatSpacing = seatSettings.seatSpacing;
  const rowSpacing = seatSettings.rowSpacing;

  // Calculate grid dimensions
  const { rows, seatsPerRow } = calculateGridDimensions(
    width,
    height,
    seatSpacing,
    rowSpacing
  );

  // Draw transparent background rectangle
  seatGridPreviewGraphics
    .rect(x, y, width, height)
    .fill({ color: 0x00bcd4, alpha: 0.1 })
    .stroke({ width: 2, color: 0x00bcd4, alpha: 0.8 });

  const seatStartX = x + seatRadius;
  const seatStartY = y + seatRadius;

  // Draw seat previews
  for (let row = 0; row < rows; row++) {
    for (let seat = 0; seat < seatsPerRow; seat++) {
      const seatX = seatStartX + seat * seatSpacing;
      const seatY = seatStartY + row * rowSpacing;

      // Draw seat circle
      seatGridPreviewGraphics
        .circle(seatX, seatY, seatRadius)
        .fill({ color: seatSettings.seatColor, alpha: 0.7 })
        .stroke({ width: 1, color: seatSettings.seatStrokeColor, alpha: 0.8 });
    }
  }
};

// ✅ Clear seat grid preview
export const clearSeatGridPreview = () => {
  if (seatGridPreviewGraphics && previewContainer) {
    previewContainer.removeChild(seatGridPreviewGraphics);
    seatGridPreviewGraphics.destroy();
    seatGridPreviewGraphics = null;
  }
};
