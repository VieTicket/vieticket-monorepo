import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { Shape } from "@/types/seat-map-types";

export const useSelectionEvents = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionRect, setSelectionRect] = useState<any>(null);

  const {
    shapes,
    selectedShapeIds,
    clearSelection,
    selectShape,
    selectMultipleShapes,
  } = useCanvasStore();

  const handleSelectionMouseDown = (canvasCoords: any, e: any) => {
    setIsSelecting(true);
    setSelectionStart(canvasCoords);
    setSelectionEnd(canvasCoords);
    setSelectionRect({
      x: canvasCoords.x,
      y: canvasCoords.y,
      width: 0,
      height: 0,
    });

    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      clearSelection();
    }
  };

  const handleSelectionMouseMove = (canvasCoords: any) => {
    if (!selectionStart) return;

    setSelectionEnd(canvasCoords);

    const rect = {
      x: Math.min(selectionStart.x, canvasCoords.x),
      y: Math.min(selectionStart.y, canvasCoords.y),
      width: Math.abs(canvasCoords.x - selectionStart.x),
      height: Math.abs(canvasCoords.y - selectionStart.y),
    };

    setSelectionRect(rect);
  };

  const handleSelectionMouseUp = (e: any) => {
    if (!selectionRect) {
      resetSelectionState();
      return;
    }

    const shapesInSelection = shapes.filter((shape) =>
      isShapeInRectangle(shape, selectionRect)
    );

    if (shapesInSelection.length > 0) {
      const shapeIds = shapesInSelection.map((shape) => shape.id);
      const multiSelect = e.evt.ctrlKey || e.evt.metaKey;

      if (multiSelect) {
        shapeIds.forEach((id) => {
          if (!selectedShapeIds.includes(id)) {
            selectShape(id, true);
          }
        });
      } else {
        selectMultipleShapes(shapeIds);
      }
    }

    resetSelectionState();
  };

  const resetSelectionState = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionRect(null);
  };

  const isShapeInRectangle = (
    shape: Shape,
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const innerBounds = getLargestInnerRectangle(shape);

    return !(
      innerBounds.right < rect.x ||
      innerBounds.left > rect.x + rect.width ||
      innerBounds.bottom < rect.y ||
      innerBounds.top > rect.y + rect.height
    );
  };

  const getLargestInnerRectangle = (shape: Shape) => {
    let bounds = {
      left: shape.x,
      top: shape.y,
      right: shape.x,
      bottom: shape.y,
    };

    switch (shape.type) {
      case "rect":
        const cornerRadius = shape.cornerRadius || 0;
        const rectRotation = shape.rotation || 0;

        if (rectRotation !== 0) {
          // For rotated rectangles, find the largest axis-aligned rectangle inside
          const center = {
            x: shape.x + shape.width / 2,
            y: shape.y + shape.height / 2,
          };

          // Calculate the inscribed rectangle for a rotated rectangle
          const angleRad = Math.abs((rectRotation * Math.PI) / 180);
          const cos = Math.cos(angleRad);
          const sin = Math.sin(angleRad);

          // For a rotated rectangle, the largest inner axis-aligned rectangle
          // has dimensions that depend on the rectRotation angle
          let innerWidth, innerHeight;

          if (angleRad <= Math.PI / 4) {
            // For small angles, use the projection method
            innerWidth = shape.width * cos - shape.height * sin;
            innerHeight = shape.height * cos - shape.width * sin;
          } else {
            // For larger angles, swap dimensions
            innerWidth = shape.height * cos - shape.width * sin;
            innerHeight = shape.width * cos - shape.height * sin;
          }

          // Ensure positive dimensions and apply minimum constraints
          innerWidth = Math.max(innerWidth, shape.width * 0.3); // At least 30% of original
          innerHeight = Math.max(innerHeight, shape.height * 0.3);

          // Apply corner radius reduction if present
          if (cornerRadius > 0) {
            const radiusReduction = Math.min(
              cornerRadius * 0.6,
              Math.min(innerWidth, innerHeight) * 0.2
            );
            innerWidth -= radiusReduction * 2;
            innerHeight -= radiusReduction * 2;
          }

          bounds.left = center.x - innerWidth / 2;
          bounds.right = center.x + innerWidth / 2;
          bounds.top = center.y - innerHeight / 2;
          bounds.bottom = center.y + innerHeight / 2;
        } else {
          // Non-rotated rectangle
          if (cornerRadius > 0) {
            // For rounded rectangles, the inner rectangle excludes the rounded corner areas
            // The effective clickable area is reduced by approximately the corner radius
            const radiusReduction = Math.min(
              cornerRadius * 0.7, // 70% of corner radius
              Math.min(shape.width, shape.height) * 0.25 // Max 25% of smallest dimension
            );

            bounds.left = shape.x + radiusReduction;
            bounds.top = shape.y + radiusReduction;
            bounds.right = shape.x + shape.width - radiusReduction;
            bounds.bottom = shape.y + shape.height - radiusReduction;
          } else {
            // Regular rectangle - use full bounds
            bounds.left = shape.x;
            bounds.top = shape.y;
            bounds.right = shape.x + shape.width;
            bounds.bottom = shape.y + shape.height;
          }
        }
        break;

      case "circle":
        // For circles, the largest inner rectangle is a square inscribed in the circle
        const inscribedSide = shape.radius * Math.sqrt(2); // Side length of inscribed square
        const halfSide = inscribedSide / 2;

        bounds.left = shape.x - halfSide;
        bounds.top = shape.y - halfSide;
        bounds.right = shape.x + halfSide;
        bounds.bottom = shape.y + halfSide;
        break;

      case "text":
        const textWidth =
          shape.width ||
          Math.max(
            100,
            (shape.text?.length || 10) * (shape.fontSize || 16) * 0.6
          );
        const textHeight = shape.fontSize || 16;
        const shapeRotation = shape.rotation || 0;

        if (shapeRotation !== 0) {
          // For rotated text, calculate the largest inner rectangle
          const center = {
            x: shape.x + textWidth / 2,
            y: shape.y + textHeight / 2,
          };

          const angleRad = Math.abs((shapeRotation * Math.PI) / 180);
          const cos = Math.cos(angleRad);
          const sin = Math.sin(angleRad);

          // Calculate inscribed rectangle dimensions
          let innerWidth = textWidth * cos - textHeight * sin;
          let innerHeight = textHeight * cos - textWidth * sin;

          // Ensure positive dimensions
          innerWidth = Math.max(innerWidth, textWidth * 0.4);
          innerHeight = Math.max(innerHeight, textHeight * 0.4);

          bounds.left = center.x - innerWidth / 2;
          bounds.right = center.x + innerWidth / 2;
          bounds.top = center.y - innerHeight / 2;
          bounds.bottom = center.y + innerHeight / 2;
        } else {
          // Non-rotated text - use full bounds but with small margin for text rendering
          const margin = 2; // Small margin for text rendering
          bounds.left = shape.x + margin;
          bounds.top = shape.y + margin;
          bounds.right = shape.x + textWidth - margin;
          bounds.bottom = shape.y + textHeight - margin;
        }
        break;

      case "polygon":
        if (shape.points && shape.points.length >= 2) {
          // For polygons, find the bounding box of all points first
          let minX = shape.x + shape.points[0];
          let maxX = shape.x + shape.points[0];
          let minY = shape.y + shape.points[1];
          let maxY = shape.y + shape.points[1];

          for (let i = 2; i < shape.points.length; i += 2) {
            const pointX = shape.x + shape.points[i];
            const pointY = shape.y + shape.points[i + 1];

            minX = Math.min(minX, pointX);
            maxX = Math.max(maxX, pointX);
            minY = Math.min(minY, pointY);
            maxY = Math.max(maxY, pointY);
          }

          // Apply rotation if present
          if (shape.rotation && shape.rotation !== 0) {
            const center = { x: shape.x, y: shape.y };
            const polygonPoints = [];

            for (let i = 0; i < shape.points.length; i += 2) {
              polygonPoints.push({
                x: shape.x + shape.points[i],
                y: shape.y + shape.points[i + 1],
              });
            }

            const rotatedPoints = polygonPoints.map((point) =>
              rotatePoint(point, center, shape.rotation!)
            );

            minX = Math.min(...rotatedPoints.map((p) => p.x));
            maxX = Math.max(...rotatedPoints.map((p) => p.x));
            minY = Math.min(...rotatedPoints.map((p) => p.y));
            maxY = Math.max(...rotatedPoints.map((p) => p.y));

            // For rotated polygons, reduce the inner rectangle by ~20% to account for irregular shapes
            const widthReduction = (maxX - minX) * 0.1;
            const heightReduction = (maxY - minY) * 0.1;

            bounds.left = minX + widthReduction;
            bounds.right = maxX - widthReduction;
            bounds.top = minY + heightReduction;
            bounds.bottom = maxY - heightReduction;
          } else {
            // For non-rotated polygons, use a smaller inner rectangle
            // since polygons are usually not perfect rectangles
            const widthReduction = (maxX - minX) * 0.15; // 15% reduction
            const heightReduction = (maxY - minY) * 0.15;

            bounds.left = minX + widthReduction;
            bounds.right = maxX - widthReduction;
            bounds.top = minY + heightReduction;
            bounds.bottom = maxY - heightReduction;
          }
        }
        break;

      default:
        // For unknown shapes, use a conservative approach
        bounds.left = 0;
        bounds.top = 0;
        bounds.right = 0;
        bounds.bottom = 0;
        break;
    }

    // Ensure bounds are valid (left < right, top < bottom)
    if (bounds.left >= bounds.right) {
      const center = (bounds.left + bounds.right) / 2;
      bounds.left = center - 1;
      bounds.right = center + 1;
    }

    if (bounds.top >= bounds.bottom) {
      const center = (bounds.top + bounds.bottom) / 2;
      bounds.top = center - 1;
      bounds.bottom = center + 1;
    }

    return bounds;
  };

  const getRectangleCorners = (shape: any) => {
    return [
      { x: shape.x, y: shape.y },
      { x: shape.x + shape.width, y: shape.y },
      { x: shape.x + shape.width, y: shape.y + shape.height },
      { x: shape.x, y: shape.y + shape.height },
    ];
  };

  const rotatePoint = (
    point: { x: number; y: number },
    center: { x: number; y: number },
    angleDegrees: number
  ) => {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);

    const translatedX = point.x - center.x;
    const translatedY = point.y - center.y;

    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    return {
      x: rotatedX + center.x,
      y: rotatedY + center.y,
    };
  };

  return {
    isSelecting,
    selectionRect,
    handleSelectionMouseDown,
    handleSelectionMouseMove,
    handleSelectionMouseUp,
    resetSelectionState,
  };
};
