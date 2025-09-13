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

  if (currentTool === "rectangle") {
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    previewGraphics
      .roundRect(x, y, width, height, 10)
      .fill(0x3b82f6)
      .stroke(0x1e40af);
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

export const createFreeShapePreview = () => {
  if (!previewContainer) return;

  clearFreeShapePreview();

  const graphics = new PIXI.Graphics();
  previewContainer.addChild(graphics);
  setPreviewGraphics(graphics);
};

export const updateFreeShapePreview = (
  points: Array<{ x: number; y: number }>,
  shouldClose: boolean = false
) => {
  if (!previewGraphics || points.length === 0) return;

  previewGraphics.clear();

  if (points.length === 1) {
    // Just draw a point
    previewGraphics.circle(points[0].x, points[0].y, 3).fill(0x3b82f6);
    return;
  }

  // Draw the preview path
  previewGraphics.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    previewGraphics.lineTo(points[i].x, points[i].y);
  }

  // If should close and we have enough points, show closing line
  if (shouldClose && points.length >= 3) {
    previewGraphics.lineTo(points[0].x, points[0].y);
    previewGraphics
      .fill({ color: 0x3b82f6, alpha: 0.3 })
      .stroke({ width: 2, color: 0x1e40af });
  } else {
    previewGraphics.stroke({ width: 2, color: 0x3b82f6 });
  }

  // Draw points
  points.forEach((point, index) => {
    const color = index === 0 ? 0x10b981 : 0x3b82f6; // First point green, others blue
    previewGraphics!
      .circle(point.x, point.y, 4)
      .fill(color)
      .stroke({ width: 1, color: 0xffffff });
  });
};

export const clearFreeShapePreview = () => {
  if (previewGraphics) {
    previewGraphics.clear();
    if (previewContainer) {
      previewContainer.removeChild(previewGraphics);
    }
    previewGraphics.destroy();
    setPreviewGraphics(null);
  }
};
