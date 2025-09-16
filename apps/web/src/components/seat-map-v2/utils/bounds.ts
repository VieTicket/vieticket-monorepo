import { CanvasItem, ContainerGroup } from "../types";

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
      const transformedPoints = item.points.map((point) => {
        const scaledX = point.x * scaleX;
        const scaledY = point.y * scaleY;

        const rotatedX =
          scaledX * Math.cos(rotation) - scaledY * Math.sin(rotation);
        const rotatedY =
          scaledX * Math.sin(rotation) + scaledY * Math.cos(rotation);

        return {
          x: item.x + rotatedX,
          y: item.y + rotatedY,
        };
      });

      const xs = transformedPoints.map((p) => p.x);
      const ys = transformedPoints.map((p) => p.y);
      itemMinX = Math.min(...xs);
      itemMinY = Math.min(...ys);
      itemMaxX = Math.max(...xs);
      itemMaxY = Math.max(...ys);
      break;
    }

    case "container": {
      const containerItem = item as ContainerGroup;
      if (containerItem.children.length === 0) {
        itemMinX = item.x - 25;
        itemMinY = item.y - 25;
        itemMaxX = item.x + 25;
        itemMaxY = item.y + 25;
      } else {
        let childMinX = Infinity;
        let childMinY = Infinity;
        let childMaxX = -Infinity;
        let childMaxY = -Infinity;

        containerItem.children.forEach((child) => {
          const childBounds = calculateItemBounds(child);

          // For polygons, we need special handling since their coordinates are different
          let childWorldX,
            childWorldY,
            childWorldMinX,
            childWorldMinY,
            childWorldMaxX,
            childWorldMaxY;

          if (child.type === "polygon") {
            // For polygons, child.x and child.y are already the center in container space
            // and childBounds are calculated correctly relative to that center
            childWorldX = item.x + child.x;
            childWorldY = item.y + child.y;

            // The bounds are already relative to the polygon's center
            childWorldMinX = childWorldX + childBounds.x - child.x;
            childWorldMinY = childWorldY + childBounds.y - child.y;
            childWorldMaxX = childWorldMinX + childBounds.width;
            childWorldMaxY = childWorldMinY + childBounds.height;
          } else {
            // For other shapes, use the existing logic
            childWorldX = item.x + child.graphics.x;
            childWorldY = item.y + child.graphics.y;

            childWorldMinX = childWorldX + (childBounds.x - child.x);
            childWorldMinY = childWorldY + (childBounds.y - child.y);
            childWorldMaxX = childWorldMinX + childBounds.width;
            childWorldMaxY = childWorldMinY + childBounds.height;
          }

          childMinX = Math.min(childMinX, childWorldMinX);
          childMinY = Math.min(childMinY, childWorldMinY);
          childMaxX = Math.max(childMaxX, childWorldMaxX);
          childMaxY = Math.max(childMaxY, childWorldMaxY);
        });

        // Rest of the scaling/rotation logic remains the same...
        if (scaleX !== 1 || scaleY !== 1 || rotation !== 0) {
          const relativeMinX = (childMinX - item.x) * scaleX;
          const relativeMinY = (childMinY - item.y) * scaleY;
          const relativeMaxX = (childMaxX - item.x) * scaleX;
          const relativeMaxY = (childMaxY - item.y) * scaleY;

          const corners = [
            { x: relativeMinX, y: relativeMinY },
            { x: relativeMaxX, y: relativeMinY },
            { x: relativeMaxX, y: relativeMaxY },
            { x: relativeMinX, y: relativeMaxY },
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
        } else {
          itemMinX = childMinX;
          itemMinY = childMinY;
          itemMaxX = childMaxX;
          itemMaxY = childMaxY;
        }
      }
      break;
    }

    default: {
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
