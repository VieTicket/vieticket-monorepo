import {
  CanvasItem,
  ContainerGroup,
  GridShape,
  PolygonShape,
  RowShape,
  SeatShape,
} from "../types";
import { useSeatMapStore } from "../store/seat-map-store";
import { areaModeContainer, shapes } from "../variables";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { updateSVGGraphics } from "../shapes/svg-shape";
import { updateImageGraphics } from "../shapes/image-shape";
import { updateContainerGraphics } from "../shapes/container-shape";
import { findParentContainer, updateSeatGraphics } from "../shapes";
import { calculateWorldTransform, calculateGroupBounds } from "./bounds";
import { getSelectionTransform } from "../events/transform-events";
import { getGridByRowId, updateRowLabelRotation } from "../shapes/row-shape";

/**
 * Mirror types
 */
export type MirrorDirection = "horizontal" | "vertical";

/**
 * Mirrors a single shape horizontally or vertically
 */
const mirrorShape = (shape: CanvasItem, direction: MirrorDirection): void => {
  switch (direction) {
    case "horizontal":
      // Flip scale on X-axis
      shape.scaleX = -(shape.scaleX || 1);
      shape.rotation = -(shape.rotation || 0);
      break;
    case "vertical":
      // Flip scale on Y-axis
      shape.scaleY = -(shape.scaleY || 1);
      shape.rotation = -(shape.rotation || 0);
      break;
  }

  // Update graphics based on shape type
  updateShapeGraphicsAfterMirror(shape);
};

/**
 * Mirrors a polygon shape by flipping its points around the visual center
 */
const mirrorPolygonShape = (
  polygon: PolygonShape,
  direction: MirrorDirection
): void => {
  switch (direction) {
    case "horizontal":
      polygon.scaleX = -(polygon.scaleX || 1);
      polygon.rotation = -(polygon.rotation || 0);
      break;
    case "vertical":
      polygon.scaleY = -(polygon.scaleY || 1);
      polygon.rotation = -(polygon.rotation || 0);
      break;
  }

  // Update the polygon graphics
  updatePolygonGraphics(polygon);
};
/**
 * Mirrors a container and all its children, properly handling container rotation
 */
const mirrorContainer = (
  container: ContainerGroup,
  direction: MirrorDirection
): void => {
  switch (direction) {
    case "horizontal":
      container.scaleX = -(container.scaleX || 1);
      container.rotation = -(container.rotation || 0);
      break;
    case "vertical":
      container.scaleY = -(container.scaleY || 1);
      container.rotation = -(container.rotation || 0);
      break;
  }

  if ("gridName" in container) {
    const shape = container as GridShape;
    shape.children.forEach((row) => {
      // ✅ Update row label rotation for mirroring
      updateRowLabelRotationForMirroring(row, shape, direction);

      row.children.forEach((seat) => {
        updateSeatLabelRotationForMirroring(seat, row, shape, direction);
      });
    });
  } else if ("rowName" in container) {
    const row = container as RowShape;
    const grid = getGridByRowId(row.id);

    // ✅ Update row label rotation for mirroring
    updateRowLabelRotationForMirroring(row, grid, direction);

    row.children.forEach((seat) => {
      updateSeatLabelRotationForMirroring(seat, row, grid!, direction);
    });
  }

  // Update container graphics (don't change container's own transforms)
  updateContainerGraphics(container);
};

/**
 * ✅ Update row label rotation when mirroring
 */
export const updateRowLabelRotationForMirroring = (
  row: RowShape,
  grid?: GridShape,
  direction?: MirrorDirection
): void => {
  if (!row.labelGraphics || row.labelPlacement === "none") return;

  // If grid is not provided, find it
  if (!grid && areaModeContainer) {
    grid = getGridByRowId(row.id);
  }

  // Calculate total rotation from row and grid
  let totalRotation = (row.rotation || 0) + (grid?.rotation || 0);

  // Calculate effective scale from row and grid
  let effectiveScaleX = row.scaleX || 1;
  let effectiveScaleY = row.scaleY || 1;

  if (grid) {
    effectiveScaleX *= grid.scaleX || 1;
    effectiveScaleY *= grid.scaleY || 1;
  }

  // Counter negative scales to prevent flipped text
  const labelScaleX = effectiveScaleX < 0 ? -1 : 1;
  const labelScaleY = effectiveScaleY < 0 ? -1 : 1;

  // Apply the counter-scale to keep text readable
  row.labelGraphics.scale.set(labelScaleX, labelScaleY);

  // Base label rotation to counter the total rotation
  let labelRotation = -totalRotation;

  // Check if any parent containers are mirrored
  const isHorizontallyMirrored = effectiveScaleX < 0;
  const isVerticallyMirrored = effectiveScaleY < 0;

  // Apply additional rotation adjustments for mirrored states
  if (isHorizontallyMirrored && isVerticallyMirrored) {
    // Both mirrored - no additional adjustment needed
  } else if (isHorizontallyMirrored) {
    // Horizontally mirrored - flip rotation
    labelRotation = -labelRotation;
  } else if (isVerticallyMirrored) {
    // Vertically mirrored - flip rotation
    labelRotation = -labelRotation;
  }

  // Normalize rotation to [-π, π]
  while (labelRotation > Math.PI) labelRotation -= 2 * Math.PI;
  while (labelRotation < -Math.PI) labelRotation += 2 * Math.PI;

  row.labelGraphics.rotation = labelRotation;
};

export const updateSeatLabelRotationForMirroring = (
  seat: SeatShape,
  row?: RowShape,
  grid?: GridShape,
  direction?: MirrorDirection
): void => {
  if (!seat.labelGraphics) return;

  let totalRotation = seat.rotation || 0;

  // If row is not provided, find it
  if (!row && areaModeContainer) {
    for (const g of areaModeContainer.children) {
      const foundRow = g.children.find((r) => r.id === seat.rowId);
      if (foundRow) {
        row = foundRow;
        if (!grid) {
          grid = g;
        }
        break;
      }
    }
  }

  // If grid is not provided but we have row, find the grid
  if (!grid && row && areaModeContainer) {
    grid = getGridByRowId(row.id);
  }

  // Add row rotation if available
  if (row) {
    totalRotation += row.rotation || 0;
  }

  // Add grid rotation if available
  if (grid) {
    totalRotation += grid.rotation || 0;
  }

  // Calculate effective scale from all parent containers
  let effectiveScaleX = seat.scaleX || 1;
  let effectiveScaleY = seat.scaleY || 1;

  if (row) {
    effectiveScaleX *= row.scaleX || 1;
    effectiveScaleY *= row.scaleY || 1;
  }

  if (grid) {
    effectiveScaleX *= grid.scaleX || 1;
    effectiveScaleY *= grid.scaleY || 1;
  }

  // Counter negative scales to prevent flipped text
  const labelScaleX = effectiveScaleX < 0 ? -1 : 1;
  const labelScaleY = effectiveScaleY < 0 ? -1 : 1;

  // Apply the counter-scale to keep text readable
  seat.labelGraphics.scale.set(labelScaleX, labelScaleY);

  // Base label rotation to counter the total rotation
  let labelRotation = -totalRotation;

  // Check if any parent containers are mirrored
  const isHorizontallyMirrored = effectiveScaleX < 0;
  const isVerticallyMirrored = effectiveScaleY < 0;

  // Apply additional rotation adjustments for mirrored states
  if (isHorizontallyMirrored && isVerticallyMirrored) {
    // Both mirrored - no additional adjustment needed
  } else if (isHorizontallyMirrored) {
    // Horizontally mirrored - flip rotation
    labelRotation = -labelRotation;
  } else if (isVerticallyMirrored) {
    // Vertically mirrored - flip rotation
    labelRotation = -labelRotation;
  }

  // Normalize rotation to [-π, π]
  while (labelRotation > Math.PI) labelRotation -= 2 * Math.PI;
  while (labelRotation < -Math.PI) labelRotation += 2 * Math.PI;

  seat.labelGraphics.rotation = labelRotation;
};
/**
 * Updates shape graphics after mirroring based on shape type
 */
const updateShapeGraphicsAfterMirror = (shape: CanvasItem): void => {
  switch (shape.type) {
    case "rectangle":
    case "ellipse":
    case "text":
      // Standard shapes - update scale, position, and rotation
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
      shape.graphics.visible = shape.visible;
      shape.graphics.interactive = shape.interactive;
      break;

    case "polygon":
      // Polygons are handled separately in mirrorPolygonShape
      updatePolygonGraphics(shape as PolygonShape);
      break;

    case "image":
      // Images need special handling
      updateImageGraphics(shape as any);
      break;

    case "svg":
      // SVGs need special handling
      updateSVGGraphics(shape as any);
      break;

    case "container":
      // Containers are handled separately in mirrorContainer
      updateContainerGraphics(shape as ContainerGroup);
      break;

    default:
      break;
  }
};

/**
 * Mirrors multiple shapes around their collective center point
 */
const mirrorShapesGroup = (
  shapesToMirror: CanvasItem[],
  direction: MirrorDirection
): void => {
  if (shapesToMirror.length === 0) return;

  // Use the bounds utility function for consistency
  const bounds = calculateGroupBounds(shapesToMirror);
  const centerX = bounds.centerX;
  const centerY = bounds.centerY;

  // Mirror each shape
  shapesToMirror.forEach((shape) => {
    // Check if shape is in a container
    const parentContainer = findParentContainer(shape);

    if (parentContainer) {
      // For shapes in containers, use world transform calculation
      const shapeWorldTransform = calculateWorldTransform(shape);
      const containerWorldTransform = calculateWorldTransform(parentContainer);

      let newWorldX = shapeWorldTransform.x;
      let newWorldY = shapeWorldTransform.y;

      switch (direction) {
        case "horizontal":
          newWorldX = 2 * centerX - shapeWorldTransform.x;
          break;
        case "vertical":
          newWorldY = 2 * centerY - shapeWorldTransform.y;
          break;
      }

      // Convert back to container-relative coordinates
      shape.x = newWorldX - containerWorldTransform.x;
      shape.y = newWorldY - containerWorldTransform.y;
    } else {
      // For root-level shapes, mirror around the group center
      switch (direction) {
        case "horizontal":
          shape.x = 2 * centerX - shape.x;
          break;
        case "vertical":
          shape.y = 2 * centerY - shape.y;
          break;
      }
    }

    // Mirror the shape itself
    if (shape.type === "container") {
      mirrorContainer(shape as ContainerGroup, direction);
    } else if (shape.type === "polygon") {
      mirrorPolygonShape(shape as PolygonShape, direction);
    } else {
      mirrorShape(shape, direction);
    }

    // Update graphics position
    shape.graphics.position.set(shape.x, shape.y);
  });
};

/**
 * Mirrors the currently selected shapes
 */
export const mirrorSelectedShapes = (direction: MirrorDirection): void => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  if (selectedShapes.length === 0) {
    console.warn("No shapes selected for mirroring");
    return;
  }

  try {
    // Mirror the shapes
    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      if (shape.type === "container") {
        mirrorContainer(shape as ContainerGroup, direction);
      } else if (shape.type === "polygon") {
        mirrorPolygonShape(shape as PolygonShape, direction);
      } else {
        mirrorShape(shape, direction);
      }
    } else {
      // Mirror multiple shapes as a group
      mirrorShapesGroup(selectedShapes, direction);
    }

    useSeatMapStore.getState().setSelectedShapes([...selectedShapes], false);
    useSeatMapStore.getState().updateShapes([...shapes], true);

    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection(selectedShapes);
    }
  } catch (error) {
    console.error(`Failed to mirror shapes ${direction}ly:`, error);
  }
};

/**
 * Mirrors shapes horizontally
 */
export const mirrorHorizontally = (): void => {
  mirrorSelectedShapes("horizontal");
};

/**
 * Mirrors shapes vertically
 */
export const mirrorVertically = (): void => {
  mirrorSelectedShapes("vertical");
};

/**
 * Checks if any shapes are selected for mirroring
 */
export const canMirrorShapes = (): boolean => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  return selectedShapes.length > 0;
};
