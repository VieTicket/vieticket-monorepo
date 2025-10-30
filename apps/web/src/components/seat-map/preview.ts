import * as PIXI from "pixi.js";
import {
  previewContainer,
  previewGraphics,
  setPreviewGraphics,
  currentTool,
} from "./variables";

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
