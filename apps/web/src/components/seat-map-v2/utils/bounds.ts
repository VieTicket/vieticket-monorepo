import { findParentContainer } from "../shapes";
import { CanvasItem, ContainerGroup, PolygonShape } from "../types";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Calculates the bounding box of a single item
 */
export const calculateItemBounds = (item: CanvasItem): BoundingBox => {
  const scaleX = item.scaleX || 1;
  const scaleY = item.scaleY || 1;
  const rotation = item.rotation || 0;

  let itemMinX: number, itemMinY: number, itemMaxX: number, itemMaxY: number;

  switch (item.type) {
    case "rectangle": {
      const scaledWidth = item.width * scaleX;
      const scaledHeight = item.height * scaleY;

      // Calculate rotated bounding box
      const corners = [
        { x: -scaledWidth / 2, y: -scaledHeight / 2 },
        { x: scaledWidth / 2, y: -scaledHeight / 2 },
        { x: scaledWidth / 2, y: scaledHeight / 2 },
        { x: -scaledWidth / 2, y: scaledHeight / 2 },
      ];

      const rotatedCorners = corners.map((corner) => ({
        x:
          item.x +
          corner.x * Math.cos(rotation) -
          corner.y * Math.sin(rotation),
        y:
          item.y +
          corner.x * Math.sin(rotation) +
          corner.y * Math.cos(rotation),
      }));

      const xs = rotatedCorners.map((p) => p.x);
      const ys = rotatedCorners.map((p) => p.y);
      itemMinX = Math.min(...xs);
      itemMinY = Math.min(...ys);
      itemMaxX = Math.max(...xs);
      itemMaxY = Math.max(...ys);
      break;
    }

    case "ellipse": {
      const scaledRadiusX = item.radiusX * scaleX;
      const scaledRadiusY = item.radiusY * scaleY;

      // Calculate the bounding box of a rotated ellipse
      const a = scaledRadiusX;
      const b = scaledRadiusY;
      const cos = Math.abs(Math.cos(rotation));
      const sin = Math.abs(Math.sin(rotation));

      const boundingWidth = a * cos + b * sin;
      const boundingHeight = a * sin + b * cos;

      itemMinX = item.x - boundingWidth;
      itemMinY = item.y - boundingHeight;
      itemMaxX = item.x + boundingWidth;
      itemMaxY = item.y + boundingHeight;
      break;
    }

    case "text": {
      // Approximate text bounds
      const textWidth = item.fontSize * item.text.length * 0.6 * scaleX;
      const textHeight = item.fontSize * scaleY;

      const corners = [
        { x: -textWidth / 2, y: -textHeight / 2 },
        { x: textWidth / 2, y: -textHeight / 2 },
        { x: textWidth / 2, y: textHeight / 2 },
        { x: -textWidth / 2, y: textHeight / 2 },
      ];

      const rotatedCorners = corners.map((corner) => ({
        x:
          item.x +
          corner.x * Math.cos(rotation) -
          corner.y * Math.sin(rotation),
        y:
          item.y +
          corner.x * Math.sin(rotation) +
          corner.y * Math.cos(rotation),
      }));

      const xs = rotatedCorners.map((p) => p.x);
      const ys = rotatedCorners.map((p) => p.y);
      itemMinX = Math.min(...xs);
      itemMinY = Math.min(...ys);
      itemMaxX = Math.max(...xs);
      itemMaxY = Math.max(...ys);
      break;
    }

    case "polygon": {
      const polygon = item as PolygonShape;

      if (!polygon.points || polygon.points.length === 0) {
        // Fallback to center point
        itemMinX = item.x - 25;
        itemMinY = item.y - 25;
        itemMaxX = item.x + 25;
        itemMaxY = item.y + 25;
        break;
      }

      // For polygons, the points array contains the actual vertices
      // We need to find the parent container to determine if coordinates need adjustment
      const parentContainer = findParentContainer(item);

      let polyMinX = Infinity;
      let polyMinY = Infinity;
      let polyMaxX = -Infinity;
      let polyMaxY = -Infinity;

      if (parentContainer) {
        // Polygon is in a container - points are relative to container
        // Convert to world coordinates by adding container position
        let containerWorldX = parentContainer.x;
        let containerWorldY = parentContainer.y;

        // Walk up the container hierarchy to get world position
        let currentContainer = parentContainer;
        const visitedContainers = new Set<string>();

        while (currentContainer) {
          if (visitedContainers.has(currentContainer.id)) {
            console.warn("Circular container reference detected");
            break;
          }
          visitedContainers.add(currentContainer.id);

          const grandParent = findParentContainer(currentContainer);
          if (grandParent) {
            containerWorldX += grandParent.x;
            containerWorldY += grandParent.y;
            currentContainer = grandParent;
          } else {
            break;
          }
        }

        polygon.points.forEach((point) => {
          // Apply polygon's rotation and scale to the point (relative to polygon center)
          const relativeX = point.x * scaleX;
          const relativeY = point.y * scaleY;

          // Apply rotation around polygon center
          const rotatedX =
            relativeX * Math.cos(rotation) - relativeY * Math.sin(rotation);
          const rotatedY =
            relativeX * Math.sin(rotation) + relativeY * Math.cos(rotation);

          // Convert to world coordinates
          const worldX = containerWorldX + item.x + rotatedX;
          const worldY = containerWorldY + item.y + rotatedY;

          polyMinX = Math.min(polyMinX, worldX);
          polyMinY = Math.min(polyMinY, worldY);
          polyMaxX = Math.max(polyMaxX, worldX);
          polyMaxY = Math.max(polyMaxY, worldY);
        });
      } else {
        // Polygon is at root level
        // Points are stored in world coordinates, but we need to apply rotation around the polygon center
        polygon.points.forEach((point) => {
          // Calculate point relative to polygon center
          const relativeX = (point.x - item.x) * scaleX;
          const relativeY = (point.y - item.y) * scaleY;

          // Apply rotation around polygon center
          const rotatedX =
            relativeX * Math.cos(rotation) - relativeY * Math.sin(rotation);
          const rotatedY =
            relativeX * Math.sin(rotation) + relativeY * Math.cos(rotation);

          // Convert back to world coordinates
          const worldX = item.x + rotatedX;
          const worldY = item.y + rotatedY;

          polyMinX = Math.min(polyMinX, worldX);
          polyMinY = Math.min(polyMinY, worldY);
          polyMaxX = Math.max(polyMaxX, worldX);
          polyMaxY = Math.max(polyMaxY, worldY);
        });
      }

      // Apply transforms if any
      if (scaleX !== 1 || scaleY !== 1 || rotation !== 0) {
        // Calculate center point for transformation
        const centerX = (polyMinX + polyMaxX) / 2;
        const centerY = (polyMinY + polyMaxY) / 2;

        // Create corners for transformation
        const corners = [
          { x: polyMinX, y: polyMinY },
          { x: polyMaxX, y: polyMinY },
          { x: polyMaxX, y: polyMaxY },
          { x: polyMinX, y: polyMaxY },
        ];

        const transformedCorners = corners.map((corner) => {
          // Get point relative to center
          const relativeX = (corner.x - centerX) * scaleX;
          const relativeY = (corner.y - centerY) * scaleY;

          // Apply rotation around center
          const rotatedX =
            relativeX * Math.cos(rotation) - relativeY * Math.sin(rotation);
          const rotatedY =
            relativeX * Math.sin(rotation) + relativeY * Math.cos(rotation);

          // Return world coordinates
          return {
            x: centerX + rotatedX,
            y: centerY + rotatedY,
          };
        });

        const xs = transformedCorners.map((p) => p.x);
        const ys = transformedCorners.map((p) => p.y);
        itemMinX = Math.min(...xs);
        itemMinY = Math.min(...ys);
        itemMaxX = Math.max(...xs);
        itemMaxY = Math.max(...ys);
      } else {
        // No transforms, use calculated bounds
        itemMinX = polyMinX;
        itemMinY = polyMinY;
        itemMaxX = polyMaxX;
        itemMaxY = polyMaxY;
      }
      break;
    }

    case "container": {
      // For containers, calculate bounds based on children
      const containerItem = item as ContainerGroup;
      if (containerItem.children.length === 0) {
        // Empty container - use small default bounds
        itemMinX = item.x - 25;
        itemMinY = item.y - 25;
        itemMaxX = item.x + 25;
        itemMaxY = item.y + 25;
      } else {
        // Calculate bounds of all children in world space
        // Children positions are relative to container, so we need to transform them to world space
        let childMinX = Infinity;
        let childMinY = Infinity;
        let childMaxX = -Infinity;
        let childMaxY = -Infinity;

        containerItem.children.forEach((child) => {
          // Get child's bounds in its local space first
          const childBounds = calculateItemBounds(child);

          // For polygons, we need special handling since their points are already relative to container
          if (child.type === "polygon") {
            const polygon = child as PolygonShape;

            // Calculate polygon center from its points (which are relative to container)
            const polygonCenterX =
              polygon.points.reduce((sum, p) => sum + p.x, 0) /
              polygon.points.length;
            const polygonCenterY =
              polygon.points.reduce((sum, p) => sum + p.y, 0) /
              polygon.points.length;

            // Transform to container's world space
            const childWorldX = item.x + polygonCenterX;
            const childWorldY = item.y + polygonCenterY;

            // Calculate polygon bounds in world space
            let polyMinX = Infinity;
            let polyMinY = Infinity;
            let polyMaxX = -Infinity;
            let polyMaxY = -Infinity;

            polygon.points.forEach((point) => {
              const worldX = item.x + point.x;
              const worldY = item.y + point.y;
              polyMinX = Math.min(polyMinX, worldX);
              polyMinY = Math.min(polyMinY, worldY);
              polyMaxX = Math.max(polyMaxX, worldX);
              polyMaxY = Math.max(polyMaxY, worldY);
            });

            childMinX = Math.min(childMinX, polyMinX);
            childMinY = Math.min(childMinY, polyMinY);
            childMaxX = Math.max(childMaxX, polyMaxX);
            childMaxY = Math.max(childMaxY, polyMaxY);
          } else {
            // For other shapes, use the standard method
            // Transform child bounds to container's coordinate space
            const childWorldX = item.x + child.x;
            const childWorldY = item.y + child.y;

            // Calculate the child's actual world bounds
            const childWorldMinX = childWorldX + (childBounds.x - child.x);
            const childWorldMinY = childWorldY + (childBounds.y - child.y);
            const childWorldMaxX = childWorldMinX + childBounds.width;
            const childWorldMaxY = childWorldMinY + childBounds.height;

            childMinX = Math.min(childMinX, childWorldMinX);
            childMinY = Math.min(childMinY, childWorldMinY);
            childMaxX = Math.max(childMaxX, childWorldMaxX);
            childMaxY = Math.max(childMaxY, childWorldMaxY);
          }
        });

        // Apply container's scale and rotation to the bounds
        if (scaleX !== 1 || scaleY !== 1 || rotation !== 0) {
          // Calculate the relative bounds from container center
          const relativeMinX = (childMinX - item.x) * scaleX;
          const relativeMinY = (childMinY - item.y) * scaleY;
          const relativeMaxX = (childMaxX - item.x) * scaleX;
          const relativeMaxY = (childMaxY - item.y) * scaleY;

          // Create corners for rotation
          const corners = [
            { x: relativeMinX, y: relativeMinY },
            { x: relativeMaxX, y: relativeMinY },
            { x: relativeMaxX, y: relativeMaxY },
            { x: relativeMinX, y: relativeMaxY },
          ];

          // Apply rotation around container center
          const rotatedCorners = corners.map((corner) => ({
            x:
              item.x +
              corner.x * Math.cos(rotation) -
              corner.y * Math.sin(rotation),
            y:
              item.y +
              corner.x * Math.sin(rotation) +
              corner.y * Math.cos(rotation),
          }));

          const xs = rotatedCorners.map((p) => p.x);
          const ys = rotatedCorners.map((p) => p.y);
          itemMinX = Math.min(...xs);
          itemMinY = Math.min(...ys);
          itemMaxX = Math.max(...xs);
          itemMaxY = Math.max(...ys);
        } else {
          // No transforms, use bounds as-is
          itemMinX = childMinX;
          itemMinY = childMinY;
          itemMaxX = childMaxX;
          itemMaxY = childMaxY;
        }
      }
      break;
    }

    default: {
      // Fallback bounds
      const defaultSize = 50;
      const corners = [
        { x: -defaultSize / 2, y: -defaultSize / 2 },
        { x: defaultSize / 2, y: -defaultSize / 2 },
        { x: defaultSize / 2, y: defaultSize / 2 },
        { x: -defaultSize / 2, y: defaultSize / 2 },
      ];

      const rotatedCorners = corners.map((corner) => ({
        x: corner.x * Math.cos(rotation) - corner.y * Math.sin(rotation),
        y: corner.x * Math.sin(rotation) + corner.y * Math.cos(rotation),
      }));

      const xs = rotatedCorners.map((p) => p.x);
      const ys = rotatedCorners.map((p) => p.y);
      itemMinX = Math.min(...xs);
      itemMinY = Math.min(...ys);
      itemMaxX = Math.max(...xs);
      itemMaxY = Math.max(...ys);
      break;
    }
  }

  const width = itemMaxX - itemMinX;
  const height = itemMaxY - itemMinY;
  const centerX = itemMinX + width / 2;
  const centerY = itemMinY + height / 2;

  return {
    x: itemMinX,
    y: itemMinY,
    width,
    height,
    centerX,
    centerY,
  };
};

/**
 * Calculates the bounding box of multiple items
 */
export const calculateGroupBounds = (items: CanvasItem[]): BoundingBox => {
  if (items.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  if (items.length === 1) {
    return calculateItemBounds(items[0]);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  items.forEach((item) => {
    const bounds = calculateItemBounds(item);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return {
    x: minX,
    y: minY,
    width,
    height,
    centerX,
    centerY,
  };
};
