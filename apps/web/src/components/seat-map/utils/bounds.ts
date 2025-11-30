import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  PolygonShape,
  ImageShape,
  SVGShape,
} from "../types";
import { findParentContainer } from "../shapes";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface WorldTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

/**
 * Calculate world transform for an item, accumulating all parent transforms
 */
export const calculateWorldTransform = (item: CanvasItem): WorldTransform => {
  let worldX = item.x;
  let worldY = item.y;
  let worldScaleX = item.scaleX || 1;
  let worldScaleY = item.scaleY || 1;
  let worldRotation = item.rotation || 0;

  let currentContainer = findParentContainer(item);

  while (currentContainer) {
    const containerScaleX = currentContainer.scaleX || 1;
    const containerScaleY = currentContainer.scaleY || 1;
    const containerRotation = currentContainer.rotation || 0;

    // Apply container's scale to the accumulated position
    const scaledX = worldX * containerScaleX;
    const scaledY = worldY * containerScaleY;

    // Apply container's rotation to the scaled position
    if (containerRotation !== 0) {
      const cos = Math.cos(containerRotation);
      const sin = Math.sin(containerRotation);
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;
      worldX = currentContainer.x + rotatedX;
      worldY = currentContainer.y + rotatedY;
    } else {
      worldX = currentContainer.x + scaledX;
      worldY = currentContainer.y + scaledY;
    }

    // Accumulate transforms
    worldScaleX *= containerScaleX;
    worldScaleY *= containerScaleY;
    worldRotation += containerRotation;

    currentContainer = findParentContainer(currentContainer);
  }

  return {
    x: worldX,
    y: worldY,
    scaleX: worldScaleX,
    scaleY: worldScaleY,
    rotation: worldRotation,
  };
};

/**
 * Helper function to calculate corner-based bounds (for rectangle, text, image, svg)
 */
export const calculateCornerBasedBounds = (
  worldTransform: WorldTransform,
  width: number,
  height: number
): BoundingBox => {
  const rotation = worldTransform.rotation || 0;

  const corners = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];

  const transformedCorners = corners.map((corner) => {
    if (rotation === 0) {
      return {
        x: worldTransform.x + corner.x,
        y: worldTransform.y + corner.y,
      };
    }

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotatedX = corner.x * cos - corner.y * sin;
    const rotatedY = corner.x * sin + corner.y * cos;

    return {
      x: worldTransform.x + rotatedX,
      y: worldTransform.y + rotatedY,
    };
  });

  const xs = transformedCorners.map((p) => p.x);
  const ys = transformedCorners.map((p) => p.y);

  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    centerX: worldTransform.x,
    centerY: worldTransform.y,
  };
};
/**
 * Calculate polygon bounds with world transform using visual center pivot
 */
export const calculatePolygonBounds = (
  polygon: PolygonShape,
  worldTransform: WorldTransform
): BoundingBox => {
  const transformedPoints = polygon.points.map((point) => {
    const scaledX = point.x * worldTransform.scaleX;
    const scaledY = point.y * worldTransform.scaleY;

    const rotatedX =
      scaledX * Math.cos(worldTransform.rotation) -
      scaledY * Math.sin(worldTransform.rotation);
    const rotatedY =
      scaledX * Math.sin(worldTransform.rotation) +
      scaledY * Math.cos(worldTransform.rotation);

    return {
      x: worldTransform.x + rotatedX,
      y: worldTransform.y + rotatedY,
    };
  });

  const xs = transformedPoints.map((p) => p.x);
  const ys = transformedPoints.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2, // This is now the true visual center
    centerY: (minY + maxY) / 2,
  };
};

/**
 * Calculate bounds for a shape with given world transform - unified method
 */
export const calculateShapeBoundsWithWorldTransform = (
  shape: CanvasItem,
  worldTransform: WorldTransform
): BoundingBox => {
  switch (shape.type) {
    case "svg": {
      const svg = shape as SVGShape;
      try {
        if (svg.graphics instanceof PIXI.Graphics) {
          const localBounds = svg.graphics.getLocalBounds();

          if (localBounds.width > 0 && localBounds.height > 0) {
            // Calculate the scaled dimensions
            const scaledWidth = localBounds.width * worldTransform.scaleX;
            const scaledHeight = localBounds.height * worldTransform.scaleY;

            // Since SVG is centered (pivot is at center), the bounds extend from center
            const halfWidth = scaledWidth / 2;
            const halfHeight = scaledHeight / 2;

            // Calculate corners relative to the center position
            const corners = [
              { x: -halfWidth, y: -halfHeight },
              { x: halfWidth, y: -halfHeight },
              { x: halfWidth, y: halfHeight },
              { x: -halfWidth, y: halfHeight },
            ];

            // Apply rotation if any
            const rotation = worldTransform.rotation;
            const transformedCorners = corners.map((corner) => {
              if (rotation === 0) {
                return {
                  x: worldTransform.x + corner.x,
                  y: worldTransform.y + corner.y,
                };
              }

              const cos = Math.cos(rotation);
              const sin = Math.sin(rotation);
              const rotatedX = corner.x * cos - corner.y * sin;
              const rotatedY = corner.x * sin + corner.y * cos;

              return {
                x: worldTransform.x + rotatedX,
                y: worldTransform.y + rotatedY,
              };
            });

            const xs = transformedCorners.map((p) => p.x);
            const ys = transformedCorners.map((p) => p.y);

            return {
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
              centerX: worldTransform.x,
              centerY: worldTransform.y,
            };
          }
        }
      } catch (error) {
        console.warn("Failed to get SVG graphics bounds:", error);
      }

      // Fallback to calculated bounds using original dimensions
      const scaledWidth = svg.originalWidth * worldTransform.scaleX;
      const scaledHeight = svg.originalHeight * worldTransform.scaleY;

      return calculateCornerBasedBounds(
        worldTransform,
        scaledWidth,
        scaledHeight
      );
    }

    case "image": {
      const image = shape as ImageShape;
      const scaledWidth = image.originalWidth * worldTransform.scaleX;
      const scaledHeight = image.originalHeight * worldTransform.scaleY;

      return calculateCornerBasedBounds(
        worldTransform,
        scaledWidth,
        scaledHeight
      );
    }

    case "rectangle": {
      const scaledWidth = shape.width * worldTransform.scaleX;
      const scaledHeight = shape.height * worldTransform.scaleY;

      return calculateCornerBasedBounds(
        worldTransform,
        scaledWidth,
        scaledHeight
      );
    }

    case "text": {
      const width = shape.fontSize * shape.text.length * 0.6;
      const height = shape.fontSize;
      const scaledWidth = width * worldTransform.scaleX;
      const scaledHeight = height * worldTransform.scaleY;

      return calculateCornerBasedBounds(
        worldTransform,
        scaledWidth,
        scaledHeight
      );
    }

    case "ellipse": {
      const scaleX = worldTransform.scaleX;
      const scaleY = worldTransform.scaleY;
      const rotation = worldTransform.rotation;

      const scaledRadiusX = shape.radiusX * Math.abs(scaleX);
      const scaledRadiusY = shape.radiusY * Math.abs(scaleY);

      if (rotation === 0) {
        // No rotation - simple case
        return {
          x: worldTransform.x - scaledRadiusX,
          y: worldTransform.y - scaledRadiusY,
          width: scaledRadiusX * 2,
          height: scaledRadiusY * 2,
          centerX: worldTransform.x,
          centerY: worldTransform.y,
        };
      }

      // With rotation - calculate rotated ellipse bounds
      const cos = Math.abs(Math.cos(rotation));
      const sin = Math.abs(Math.sin(rotation));

      // Calculate the bounding box of the rotated ellipse
      const boundingWidth = scaledRadiusX * cos + scaledRadiusY * sin;
      const boundingHeight = scaledRadiusX * sin + scaledRadiusY * cos;

      return {
        x: worldTransform.x - boundingWidth,
        y: worldTransform.y - boundingHeight,
        width: boundingWidth * 2,
        height: boundingHeight * 2,
        centerX: worldTransform.x,
        centerY: worldTransform.y,
      };
    }

    case "polygon": {
      return calculatePolygonBounds(shape as PolygonShape, worldTransform);
    }

    case "container": {
      const container = shape as ContainerGroup;
      if (container.children.length === 0) {
        // Empty container - return bounds centered on the container position
        const halfSize = 25;
        return {
          x: worldTransform.x - halfSize,
          y: worldTransform.y - halfSize,
          width: halfSize * 2,
          height: halfSize * 2,
          centerX: worldTransform.x,
          centerY: worldTransform.y,
        };
      }

      // ✅ Use the same logic as multi-shape selection (calculateBoundingBox)
      const childBounds = container.children.map((child) => {
        const childWorldTransform = calculateWorldTransform(child);
        return calculateShapeBoundsWithWorldTransform(
          child,
          childWorldTransform
        );
      });

      if (childBounds.length === 0) {
        const halfSize = 25;
        return {
          x: worldTransform.x - halfSize,
          y: worldTransform.y - halfSize,
          width: halfSize * 2,
          height: halfSize * 2,
          centerX: worldTransform.x,
          centerY: worldTransform.y,
        };
      }

      // Combine bounds the same way as multi-select
      const minX = Math.min(...childBounds.map((b) => b.x));
      const minY = Math.min(...childBounds.map((b) => b.y));
      const maxX = Math.max(...childBounds.map((b) => b.x + b.width));
      const maxY = Math.max(...childBounds.map((b) => b.y + b.height));

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    }

    default:
      // Fallback for unknown types
      return {
        x: worldTransform.x - 25,
        y: worldTransform.y - 25,
        width: 50,
        height: 50,
        centerX: worldTransform.x,
        centerY: worldTransform.y,
      };
  }
};

/**
 * Calculate bounds for a single item using world transform
 */
export const calculateItemBounds = (item: CanvasItem): BoundingBox => {
  const worldTransform = calculateWorldTransform(item);
  return calculateShapeBoundsWithWorldTransform(item, worldTransform);
};

// ✅ Add this helper function to bounds.ts
export const calculateAllContentBounds = (
  topLevelShapes: CanvasItem[],
  areaModeContainer?: any
): BoundingBox => {
  let allItems: CanvasItem[] = [...topLevelShapes];

  // ✅ Collect all nested shapes from area mode container
  if (areaModeContainer && areaModeContainer.children) {
    const collectNestedItems = (
      container: any,
      parentX = 0,
      parentY = 0
    ): CanvasItem[] => {
      const items: CanvasItem[] = [];

      if (container.children && Array.isArray(container.children)) {
        container.children.forEach((child: any) => {
          // Create a virtual item with world coordinates
          const worldX = parentX + (child.x || 0);
          const worldY = parentY + (child.y || 0);

          const virtualItem: CanvasItem = {
            ...child,
            x: worldX,
            y: worldY,
          };

          items.push(virtualItem);

          // Recursively collect children
          if (child.children && child.children.length > 0) {
            items.push(...collectNestedItems(child, worldX, worldY));
          }
        });
      }

      return items;
    };

    areaModeContainer.children.forEach((grid: any) => {
      const gridX = areaModeContainer.x + (grid.x || 0);
      const gridY = areaModeContainer.y + (grid.y || 0);

      // Add grid itself
      allItems.push({
        ...grid,
        x: gridX,
        y: gridY,
      });

      // Add all nested items
      allItems.push(...collectNestedItems(grid, gridX, gridY));
    });
  }

  if (allItems.length === 0) {
    return { x: 0, y: 0, width: 800, height: 600, centerX: 400, centerY: 300 };
  }

  // Calculate bounds of all items
  return calculateGroupBounds(allItems);
};

/**
 * Calculate bounds for multiple items (unified with transform-events logic)
 */
export const calculateGroupBounds = (items: CanvasItem[]): BoundingBox => {
  if (items.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  // Use the same logic as transform-events calculateBoundingBox
  const bounds = items.map((item) => {
    const worldTransform = calculateWorldTransform(item);
    return calculateShapeBoundsWithWorldTransform(item, worldTransform);
  });

  const minX = Math.min(...bounds.map((b) => b.x));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width));
  const maxY = Math.max(...bounds.map((b) => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

/**
 * Get graphics bounds from PIXI object (fallback method)
 */
export const getGraphicsBounds = (item: CanvasItem): BoundingBox | null => {
  try {
    if (item.graphics && typeof item.graphics.getBounds === "function") {
      const bounds = item.graphics.getBounds();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        centerX: bounds.x + bounds.width / 2,
        centerY: bounds.y + bounds.height / 2,
      };
    }
  } catch (error) {
    console.warn("Failed to get graphics bounds:", error);
  }
  return null;
};

/**
 * Get precise bounds for an item (preferred method)
 */
export const getPreciseBounds = (item: CanvasItem): BoundingBox => {
  return calculateItemBounds(item);
};
