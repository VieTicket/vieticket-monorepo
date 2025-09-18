import { CanvasItem, ContainerGroup, PolygonShape } from "../types";
import { findParentContainer, transformPoint } from "../shapes";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Creates a BoundingBox from min/max coordinates
 */
const createBoundingBox = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): BoundingBox => ({
  x: minX,
  y: minY,
  width: maxX - minX,
  height: maxY - minY,
  centerX: (minX + maxX) / 2,
  centerY: (minY + maxY) / 2,
});

/**
 * Gets bounding box from a set of points
 */
const getBoundsFromPoints = (
  points: { x: number; y: number }[]
): BoundingBox => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return createBoundingBox(
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys)
  );
};

/**
 * Calculates bounds for shapes with corners (rectangle, text)
 */
const calculateCornerBasedBounds = (
  item: CanvasItem,
  width: number,
  height: number
): BoundingBox => {
  const scaleX = item.scaleX || 1;
  const scaleY = item.scaleY || 1;
  const rotation = item.rotation || 0;

  const corners = [
    { x: -width / 2, y: -height / 2 },
    { x: width / 2, y: -height / 2 },
    { x: width / 2, y: height / 2 },
    { x: -width / 2, y: height / 2 },
  ];

  const transformedCorners = corners.map((corner) => {
    const transformed = transformPoint(
      corner.x,
      corner.y,
      scaleX,
      scaleY,
      rotation
    );
    return {
      x: item.x + transformed.x,
      y: item.y + transformed.y,
    };
  });

  return getBoundsFromPoints(transformedCorners);
};

/**
 * Calculate the accumulated world transform for an item
 */
const calculateWorldTransform = (item: CanvasItem) => {
  let transform = {
    x: item.x,
    y: item.y,
    scaleX: item.scaleX || 1,
    scaleY: item.scaleY || 1,
    rotation: item.rotation || 0,
  };

  let currentContainer = findParentContainer(item);
  while (currentContainer) {
    const containerScaleX = currentContainer.scaleX || 1;
    const containerScaleY = currentContainer.scaleY || 1;
    const containerRotation = currentContainer.rotation || 0;

    // Transform position
    const transformed = transformPoint(
      transform.x,
      transform.y,
      containerScaleX,
      containerScaleY,
      containerRotation
    );

    transform.x = currentContainer.x + transformed.x;
    transform.y = currentContainer.y + transformed.y;

    // Accumulate transforms
    transform.scaleX *= containerScaleX;
    transform.scaleY *= containerScaleY;
    transform.rotation += containerRotation;

    currentContainer = findParentContainer(currentContainer);
  }

  return transform;
};

/**
 * Helper function to calculate polygon world bounds
 */
const calculatePolygonWorldBounds = (polygon: PolygonShape): BoundingBox => {
  const worldTransform = calculateWorldTransform(polygon);

  const transformedPoints = polygon.points.map((point) => {
    const transformed = transformPoint(
      point.x,
      point.y,
      worldTransform.scaleX,
      worldTransform.scaleY,
      worldTransform.rotation
    );

    return {
      x: worldTransform.x + transformed.x,
      y: worldTransform.y + transformed.y,
    };
  });

  return getBoundsFromPoints(transformedPoints);
};

/**
 * Calculate local bounds for different shape types
 */
const calculateShapeLocalBounds = (item: CanvasItem): BoundingBox => {
  switch (item.type) {
    case "rectangle":
      return createBoundingBox(
        -item.width / 2,
        -item.height / 2,
        item.width / 2,
        item.height / 2
      );

    case "ellipse":
      return createBoundingBox(
        -item.radiusX,
        -item.radiusY,
        item.radiusX,
        item.radiusY
      );

    case "text": {
      const width = item.fontSize * item.text.length * 0.6;
      const height = item.fontSize;
      return createBoundingBox(-width / 2, -height / 2, width / 2, height / 2);
    }

    case "polygon": {
      if (item.points.length === 0) {
        return createBoundingBox(-25, -25, 25, 25);
      }
      const xs = item.points.map((p) => p.x);
      const ys = item.points.map((p) => p.y);
      return createBoundingBox(
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      );
    }

    default:
      return createBoundingBox(-25, -25, 25, 25);
  }
};

/**
 * Transform local bounds to world space
 */
const transformBoundsToWorld = (
  localBounds: BoundingBox,
  worldTransform: ReturnType<typeof calculateWorldTransform>
): BoundingBox => {
  const { x, y, scaleX, scaleY, rotation } = worldTransform;

  if (rotation === 0) {
    // Simple case - no rotation
    const scaledX = localBounds.x * scaleX;
    const scaledY = localBounds.y * scaleY;
    const scaledWidth = localBounds.width * scaleX;
    const scaledHeight = localBounds.height * scaleY;

    return createBoundingBox(
      x + scaledX,
      y + scaledY,
      x + scaledX + scaledWidth,
      y + scaledY + scaledHeight
    );
  }

  // With rotation - transform all corners
  const corners = [
    { x: localBounds.x, y: localBounds.y },
    { x: localBounds.x + localBounds.width, y: localBounds.y },
    {
      x: localBounds.x + localBounds.width,
      y: localBounds.y + localBounds.height,
    },
    { x: localBounds.x, y: localBounds.y + localBounds.height },
  ];

  const transformedCorners = corners.map((corner) => {
    const transformed = transformPoint(
      corner.x,
      corner.y,
      scaleX,
      scaleY,
      rotation
    );
    return { x: x + transformed.x, y: y + transformed.y };
  });

  return getBoundsFromPoints(transformedCorners);
};

/**
 * Calculate world bounds for container children
 */
const calculateContainerChildrenWorldBounds = (
  container: ContainerGroup
): BoundingBox => {
  if (container.children.length === 0) {
    return createBoundingBox(0, 0, 0, 0);
  }

  const childBounds = container.children.map((child) => {
    if (child.type === "container") {
      // Recursive case for nested containers
      return calculateContainerChildrenWorldBounds(child as ContainerGroup);
    }

    // Regular shapes
    const childWorldTransform = calculateWorldTransform(child);
    const childLocalBounds =
      child.type === "polygon"
        ? calculateShapeLocalBounds(child)
        : calculateShapeLocalBounds(child);

    return transformBoundsToWorld(childLocalBounds, childWorldTransform);
  });

  // Combine all child bounds
  const allXs = childBounds.flatMap((bounds) => [
    bounds.x,
    bounds.x + bounds.width,
  ]);
  const allYs = childBounds.flatMap((bounds) => [
    bounds.y,
    bounds.y + bounds.height,
  ]);

  return createBoundingBox(
    Math.min(...allXs),
    Math.min(...allYs),
    Math.max(...allXs),
    Math.max(...allYs)
  );
};

/**
 * Calculates the bounding box of a single item
 */
export const calculateItemBounds = (item: CanvasItem): BoundingBox => {
  switch (item.type) {
    case "rectangle":
      return calculateCornerBasedBounds(item, item.width, item.height);

    case "text": {
      const width = item.fontSize * item.text.length * 0.6;
      const height = item.fontSize;
      return calculateCornerBasedBounds(item, width, height);
    }

    case "ellipse": {
      const scaleX = item.scaleX || 1;
      const scaleY = item.scaleY || 1;
      const rotation = item.rotation || 0;

      const scaledRadiusX = item.radiusX * scaleX;
      const scaledRadiusY = item.radiusY * scaleY;

      // For ellipses, calculate bounding box considering rotation
      const cos = Math.abs(Math.cos(rotation));
      const sin = Math.abs(Math.sin(rotation));
      const boundingWidth = scaledRadiusX * cos + scaledRadiusY * sin;
      const boundingHeight = scaledRadiusX * sin + scaledRadiusY * cos;

      return createBoundingBox(
        item.x - boundingWidth,
        item.y - boundingHeight,
        item.x + boundingWidth,
        item.y + boundingHeight
      );
    }

    case "polygon":
      return calculatePolygonWorldBounds(item as PolygonShape);

    case "container": {
      const containerItem = item as ContainerGroup;
      if (containerItem.children.length === 0) {
        return createBoundingBox(
          item.x - 25,
          item.y - 25,
          item.x + 25,
          item.y + 25
        );
      }
      return calculateContainerChildrenWorldBounds(containerItem);
    }

    default:
      return createBoundingBox(25, 25, 25, 25);
  }
};

/**
 * Calculates the bounding box of multiple items
 */
export const calculateGroupBounds = (items: CanvasItem[]): BoundingBox => {
  if (items.length === 0) {
    return createBoundingBox(0, 0, 0, 0);
  }

  if (items.length === 1) {
    return calculateItemBounds(items[0]);
  }

  const allBounds = items.map(calculateItemBounds);
  const allXs = allBounds.flatMap((bounds) => [
    bounds.x,
    bounds.x + bounds.width,
  ]);
  const allYs = allBounds.flatMap((bounds) => [
    bounds.y,
    bounds.y + bounds.height,
  ]);

  return createBoundingBox(
    Math.min(...allXs),
    Math.min(...allYs),
    Math.max(...allXs),
    Math.max(...allYs)
  );
};
