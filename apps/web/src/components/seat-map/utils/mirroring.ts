import { CanvasItem, ContainerGroup, PolygonShape } from "../types";
import { useSeatMapStore } from "../store/seat-map-store";
import { shapes } from "../variables";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { updateSVGGraphics } from "../shapes/svg-shape";
import { updateImageGraphics } from "../shapes/image-shape";
import { updateContainerGraphics } from "../shapes/container-shape";
import { findParentContainer } from "../shapes";
import { calculateWorldTransform, calculateGroupBounds } from "./bounds";
import { getSelectionTransform } from "../events/transform-events";

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

  // Update container graphics (don't change container's own transforms)
  updateContainerGraphics(container);
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
