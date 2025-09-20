import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  ImageShape,
  PolygonShape,
  SVGShape,
} from "../types";
import {
  findParentContainer,
  generateShapeId,
  updatePolygonGraphics,
} from "../shapes/index";
import {
  shapeContainer,
  shapes,
  setShapes,
  selectedContainer,
} from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";
import { calculateGroupBounds, calculateItemBounds } from "./bounds";

/**
 * Helper function to check if a shape is inside a container (should not have individual events)
 */
const isShapeInsideContainer = (shape: CanvasItem): boolean => {
  return findParentContainer(shape) !== null;
};

/**
 * Helper function to check if we're currently inside a container context
 */
const isInContainerContext = (): boolean => {
  return selectedContainer.length > 0;
};

/**
 * Helper function to get the current container context
 */
const getCurrentContainerContext = (): ContainerGroup | null => {
  return selectedContainer.length > 0
    ? selectedContainer[selectedContainer.length - 1]
    : null;
};

/**
 * Helper function to safely add events only to shapes that should have them
 */
const safelyAddShapeEvents = (shape: CanvasItem): void => {
  const eventManager = getEventManager();
  if (!eventManager) return;

  // Only add events if the shape is at root level or we're not in a container context
  if (!isShapeInsideContainer(shape) || !isInContainerContext()) {
    eventManager.addShapeEvents(shape);
  }
};

/**
 * Helper function to safely remove events from shapes
 */
const safelyRemoveShapeEvents = (shape: CanvasItem): void => {
  const eventManager = getEventManager();
  if (!eventManager) return;

  // Always remove events when requested
  eventManager.removeShapeEvents(shape);
};

/**
 * Helper function to calculate world coordinates for nested items
 * This function properly handles the full container hierarchy
 */
const calculateWorldCoordinates = (
  item: CanvasItem,
  containerPath: ContainerGroup[]
): { x: number; y: number } => {
  let worldX = item.x;
  let worldY = item.y;

  containerPath.forEach((currentContainer) => {
    const containerRotation = currentContainer.rotation || 0;
    const containerScaleX = currentContainer.scaleX || 1;
    const containerScaleY = currentContainer.scaleY || 1;

    const scaledX = worldX * containerScaleX;
    const scaledY = worldY * containerScaleY;

    if (containerRotation !== 0) {
      const cos = Math.cos(containerRotation);
      const sin = Math.sin(containerRotation);
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;
      worldX = rotatedX;
      worldY = rotatedY;
    } else {
      worldX = scaledX;
      worldY = scaledY;
    }

    worldX += currentContainer.x;
    worldY += currentContainer.y;
  });

  return { x: worldX, y: worldY };
};

/**
 * Helper function to get the full container path from root to the target container
 */
const getFullContainerPath = (
  targetContainer: ContainerGroup
): ContainerGroup[] => {
  const path: ContainerGroup[] = [];

  path.push(targetContainer);

  let currentContainer = findParentContainer(targetContainer);
  while (currentContainer) {
    path.unshift(currentContainer);
    currentContainer = findParentContainer(currentContainer);
  }

  return path;
};

/**
 * Creates a new container group from the given items
 */
export const createContainerGroup = (
  items: CanvasItem[],
  name?: string
): ContainerGroup => {
  if (items.length === 0) {
    throw new Error("Cannot create container from empty items array");
  }

  const bounds = calculateGroupBounds(items);

  const pixiContainer = new PIXI.Container();
  pixiContainer.eventMode = "static";
  pixiContainer.cursor = "pointer";
  pixiContainer.interactiveChildren = true;

  const containerGroup: ContainerGroup = {
    id: generateShapeId(),
    name: name || `Group ${items.length} items`,
    type: "container",
    visible: true,
    locked: false,
    selected: false,
    x: bounds.centerX,
    y: bounds.centerY,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    graphics: pixiContainer,
    children: [],
    expanded: true,
  };

  pixiContainer.position.set(containerGroup.x, containerGroup.y);

  return containerGroup;
};

/**
 * Gets the actual world position of a shape, accounting for pivot points and anchors
 */
const getShapeWorldPosition = (shape: CanvasItem): { x: number; y: number } => {
  if (shape.type === "svg") {
    return { x: shape.x, y: shape.y };
  } else if (shape.type === "image") {
    return { x: shape.x, y: shape.y };
  } else {
    return { x: shape.x, y: shape.y };
  }
};

/**
 * Sets the relative position of a shape within a container, accounting for shape type
 */
const setShapeRelativePosition = (
  shape: CanvasItem,
  relativeX: number,
  relativeY: number
) => {
  shape.x = relativeX;
  shape.y = relativeY;

  if (shape.type === "svg") {
    shape.graphics.position.set(relativeX, relativeY);
  } else if (shape.type === "image") {
    shape.graphics.position.set(relativeX, relativeY);
  } else {
    shape.graphics.position.set(relativeX, relativeY);
  }
};

/**
 * Groups the selected items into a container
 */
export const groupItems = (items: CanvasItem[]): ContainerGroup | null => {
  if (items.length < 2) {
    console.warn("Need at least 2 items to create a group");
    return null;
  }

  const itemsWithWorldPositions = items.map((item) => ({
    ...item,
    ...getShapeWorldPosition(item),
  }));

  const bounds = calculateGroupBounds(itemsWithWorldPositions);
  const container = createContainerGroup(items);

  items.forEach((item) => {
    // Remove from stage/parent container
    if (shapeContainer && item.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(item.graphics);
    }

    // ✅ Always remove events from items being grouped
    safelyRemoveShapeEvents(item);

    const worldPos = getShapeWorldPosition(item);
    const relativeX = worldPos.x - bounds.centerX;
    const relativeY = worldPos.y - bounds.centerY;

    setShapeRelativePosition(item, relativeX, relativeY);

    container.graphics.addChild(item.graphics);
    container.children.push(item);
    item.selected = false;
  });

  container.x = bounds.centerX;
  container.y = bounds.centerY;
  container.graphics.position.set(container.x, container.y);

  if (shapeContainer) {
    shapeContainer.addChild(container.graphics);
  }

  // ✅ Only add events to container if it's at root level or not in container context
  safelyAddShapeEvents(container);

  const newShapes = shapes.filter(
    (shape) => !items.some((item) => item.id === shape.id)
  );
  newShapes.push(container);

  setShapes(newShapes);

  useSeatMapStore.getState().setSelectedShapes([container]);
  useSeatMapStore.getState().updateShapes(newShapes, true);

  return container;
};
/**
 * Groups items that are within the same container
 */
export const groupItemsInContainer = (
  items: CanvasItem[]
): ContainerGroup | null => {
  if (!canGroupInSameContainer(items)) {
    console.warn("Items are not in the same container");
    return null;
  }

  const parentContainer = findParentContainer(items[0]);

  // ✅ Calculate bounds relative to the parent container, not the stage
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  items.forEach((item) => {
    // Use the item's current position (which is already relative to parent container)
    const itemBounds = calculateItemBounds(item);

    // Since items are already in container coordinates, use their relative positions
    const itemCenterX = item.x;
    const itemCenterY = item.y;

    // Estimate item dimensions (this could be improved with actual bounds calculation)
    const halfWidth = itemBounds.width / 2;
    const halfHeight = itemBounds.height / 2;

    minX = Math.min(minX, itemCenterX - halfWidth);
    minY = Math.min(minY, itemCenterY - halfHeight);
    maxX = Math.max(maxX, itemCenterX + halfWidth);
    maxY = Math.max(maxY, itemCenterY + halfHeight);
  });

  // ✅ Calculate group center in parent container's coordinate system
  const groupCenterX = (minX + maxX) / 2;
  const groupCenterY = (minY + maxY) / 2;

  const container = createContainerGroup(items);

  // ✅ Set container position relative to parent container (not stage)
  container.x = groupCenterX;
  container.y = groupCenterY;

  items.forEach((item) => {
    if (parentContainer) {
      const childIndex = parentContainer.children.findIndex(
        (child) => child.id === item.id
      );
      if (childIndex !== -1) {
        parentContainer.children.splice(childIndex, 1);
        parentContainer.graphics.removeChild(item.graphics);
      }
    } else {
      const shapeIndex = shapes.findIndex((shape) => shape.id === item.id);
      if (shapeIndex !== -1) {
        shapes.splice(shapeIndex, 1);
      }
      if (shapeContainer && item.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(item.graphics);
      }
    }

    // ✅ Always remove events from items being grouped inside containers
    safelyRemoveShapeEvents(item);

    // ✅ Calculate relative position within the new container
    // Since both the container and items are in the same coordinate system (parent container),
    // we can directly calculate the relative positions
    const relativeX = item.x - container.x;
    const relativeY = item.y - container.y;

    item.x = relativeX;
    item.y = relativeY;
    item.graphics.position.set(relativeX, relativeY);

    container.graphics.addChild(item.graphics);
    container.children.push(item);
    item.selected = false;
  });

  if (parentContainer) {
    // ✅ Position container relative to parent container
    container.graphics.position.set(container.x, container.y);
    parentContainer.graphics.addChild(container.graphics);
    parentContainer.children.push(container);
  } else {
    container.graphics.position.set(container.x, container.y);
    if (shapeContainer) {
      shapeContainer.addChild(container.graphics);
    }
    shapes.push(container);
  }

  // ✅ Check if we should add events to the new container
  const shouldAddEvents =
    !isInContainerContext() ||
    (parentContainer && getCurrentContainerContext() === parentContainer);

  if (shouldAddEvents) {
    safelyAddShapeEvents(container);
  }

  setShapes([...shapes]);

  useSeatMapStore.getState().setSelectedShapes([container]);
  useSeatMapStore.getState().updateShapes([...shapes], true);

  return container;
};

/**
 * Helper function to get item bounds in its current coordinate system
 */
const getItemBoundsInCurrentSpace = (
  item: CanvasItem
): { minX: number; minY: number; maxX: number; maxY: number } => {
  let width = 0;
  let height = 0;

  switch (item.type) {
    case "rectangle":
      width = item.width;
      height = item.height;
      break;
    case "ellipse":
      width = item.radiusX * 2;
      height = item.radiusY * 2;
      break;
    case "text":
      width = item.fontSize * item.text.length * 0.6;
      height = item.fontSize;
      break;
    case "polygon":
      const polygon = item as PolygonShape;
      const xs = polygon.points.map((p) => p.x);
      const ys = polygon.points.map((p) => p.y);
      width = Math.max(...xs) - Math.min(...xs);
      height = Math.max(...ys) - Math.min(...ys);
      break;
    case "image":
      const image = item as ImageShape;
      width = image.originalWidth;
      height = image.originalHeight;
      break;
    case "svg":
      const svg = item as SVGShape;
      width = svg.originalWidth;
      height = svg.originalHeight;
      break;
    case "container":
      const containerBounds = calculateItemBounds(item);
      width = containerBounds.width;
      height = containerBounds.height;
      break;
    default:
      width = 50;
      height = 50;
  }

  // Apply scale
  width *= item.scaleX || 1;
  height *= item.scaleY || 1;

  return {
    minX: item.x - width / 2,
    minY: item.y - height / 2,
    maxX: item.x + width / 2,
    maxY: item.y + height / 2,
  };
};

/**
 * Improved version of groupItemsInContainer with better bounds calculation
 */
export const groupItemsInContainerImproved = (
  items: CanvasItem[]
): ContainerGroup | null => {
  if (!canGroupInSameContainer(items)) {
    console.warn("Items are not in the same container");
    return null;
  }

  const parentContainer = findParentContainer(items[0]);

  // ✅ Calculate bounds in the current coordinate system (parent container space)
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  items.forEach((item) => {
    const bounds = getItemBoundsInCurrentSpace(item);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  // ✅ Group center in parent container's coordinate system
  const groupCenterX = (minX + maxX) / 2;
  const groupCenterY = (minY + maxY) / 2;

  const container = createContainerGroup(items);

  // ✅ Container position is relative to parent container
  container.x = groupCenterX;
  container.y = groupCenterY;

  items.forEach((item) => {
    // Remove from current parent
    if (parentContainer) {
      const childIndex = parentContainer.children.findIndex(
        (child) => child.id === item.id
      );
      if (childIndex !== -1) {
        parentContainer.children.splice(childIndex, 1);
        parentContainer.graphics.removeChild(item.graphics);
      }
    } else {
      const shapeIndex = shapes.findIndex((shape) => shape.id === item.id);
      if (shapeIndex !== -1) {
        shapes.splice(shapeIndex, 1);
      }
      if (shapeContainer && item.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(item.graphics);
      }
    }

    // Remove events from grouped items
    safelyRemoveShapeEvents(item);

    // ✅ Calculate position relative to new container center
    const relativeX = item.x - groupCenterX;
    const relativeY = item.y - groupCenterY;

    item.x = relativeX;
    item.y = relativeY;
    item.graphics.position.set(relativeX, relativeY);

    container.graphics.addChild(item.graphics);
    container.children.push(item);
    item.selected = false;
  });

  // Add container to appropriate parent
  if (parentContainer) {
    container.graphics.position.set(container.x, container.y);
    parentContainer.graphics.addChild(container.graphics);
    parentContainer.children.push(container);
  } else {
    container.graphics.position.set(container.x, container.y);
    if (shapeContainer) {
      shapeContainer.addChild(container.graphics);
    }
    shapes.push(container);
  }

  // Add events if appropriate
  const shouldAddEvents =
    !isInContainerContext() ||
    (parentContainer && getCurrentContainerContext() === parentContainer);

  if (shouldAddEvents) {
    safelyAddShapeEvents(container);
  }

  setShapes([...shapes]);
  useSeatMapStore.getState().setSelectedShapes([container]);
  useSeatMapStore.getState().updateShapes([...shapes], true);

  return container;
};

/**
 * Alternative approach using relative coordinate calculation
 */
export const groupItemsInContainerRelative = (
  items: CanvasItem[]
): ContainerGroup | null => {
  if (!canGroupInSameContainer(items)) {
    console.warn("Items are not in the same container");
    return null;
  }

  const parentContainer = findParentContainer(items[0]);

  // ✅ Work entirely in the local coordinate system
  const itemPositions = items.map((item) => ({
    item,
    x: item.x, // Already in parent container coordinates
    y: item.y, // Already in parent container coordinates
  }));

  // Calculate bounds in local space
  const xs = itemPositions.map((ip) => ip.x);
  const ys = itemPositions.map((ip) => ip.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const container = createContainerGroup(items);

  // ✅ Container position in parent coordinate system
  container.x = centerX;
  container.y = centerY;

  items.forEach((item) => {
    // Remove from current location
    if (parentContainer) {
      const childIndex = parentContainer.children.findIndex(
        (child) => child.id === item.id
      );
      if (childIndex !== -1) {
        parentContainer.children.splice(childIndex, 1);
        parentContainer.graphics.removeChild(item.graphics);
      }
    } else {
      const shapeIndex = shapes.findIndex((shape) => shape.id === item.id);
      if (shapeIndex !== -1) {
        shapes.splice(shapeIndex, 1);
      }
      if (shapeContainer && item.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(item.graphics);
      }
    }

    safelyRemoveShapeEvents(item);

    // ✅ Position relative to new container (simple subtraction)
    const originalX = item.x;
    const originalY = item.y;

    item.x = originalX - centerX;
    item.y = originalY - centerY;
    item.graphics.position.set(item.x, item.y);

    container.graphics.addChild(item.graphics);
    container.children.push(item);
    item.selected = false;
  });

  // Add to parent
  if (parentContainer) {
    container.graphics.position.set(container.x, container.y);
    parentContainer.graphics.addChild(container.graphics);
    parentContainer.children.push(container);
  } else {
    container.graphics.position.set(container.x, container.y);
    if (shapeContainer) {
      shapeContainer.addChild(container.graphics);
    }
    shapes.push(container);
  }

  const shouldAddEvents =
    !isInContainerContext() ||
    (parentContainer && getCurrentContainerContext() === parentContainer);

  if (shouldAddEvents) {
    safelyAddShapeEvents(container);
  }

  setShapes([...shapes]);
  useSeatMapStore.getState().setSelectedShapes([container]);
  useSeatMapStore.getState().updateShapes([...shapes], true);

  return container;
};
/**
 * Creates an empty container at a specific position
 */
export const createEmptyContainer = (name?: string): ContainerGroup => {
  const pixiContainer = new PIXI.Container();
  pixiContainer.eventMode = "static";
  pixiContainer.cursor = "pointer";
  pixiContainer.interactiveChildren = true;

  const container: ContainerGroup = {
    id: generateShapeId(),
    name: name || `Empty Container`,
    type: "container",
    visible: true,
    locked: false,
    selected: false,
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    graphics: pixiContainer,
    children: [],
    expanded: true,
  };

  pixiContainer.position.set(container.x, container.y);

  if (shapeContainer) {
    shapeContainer.addChild(pixiContainer);
  }

  // ✅ Only add events if not in container context
  if (!isInContainerContext()) {
    safelyAddShapeEvents(container);
  }

  shapes.push(container);
  setShapes([...shapes]);

  useSeatMapStore.getState().updateShapes([...shapes], true);
  useSeatMapStore.getState().setSelectedShapes([container]);

  return container;
};

/**
 * Ungroups a container, moving its children back to the appropriate level
 */
export const ungroupContainer = (container: ContainerGroup): CanvasItem[] => {
  if (container.type !== "container") {
    console.warn("Item is not a container");
    return [];
  }

  const ungroupedItems: CanvasItem[] = [];
  const parentContainer = findParentContainer(container);

  let containerWorldX = container.x;
  let containerWorldY = container.y;

  if (parentContainer) {
    const containerPath = getFullContainerPath(parentContainer);
    const worldCoords = calculateWorldCoordinates(container, containerPath);
    containerWorldX = worldCoords.x;
    containerWorldY = worldCoords.y;
  }

  container.children.forEach((child) => {
    const childWorldX = containerWorldX + child.x;
    const childWorldY = containerWorldY + child.y;

    const accumulatedTransforms = getAccumulatedContainerTransforms(container);
    child.rotation = (child.rotation || 0) + accumulatedTransforms.rotation;
    child.scaleX = (child.scaleX || 1) * accumulatedTransforms.scaleX;
    child.scaleY = (child.scaleY || 1) * accumulatedTransforms.scaleY;
    child.opacity = (child.opacity || 1) * accumulatedTransforms.opacity;

    container.graphics.removeChild(child.graphics);

    if (parentContainer) {
      child.x = childWorldX - parentContainer.x;
      child.y = childWorldY - parentContainer.y;

      child.rotation = (child.rotation || 0) - (parentContainer.rotation || 0);
      child.scaleX = (child.scaleX || 1) / (parentContainer.scaleX || 1);
      child.scaleY = (child.scaleY || 1) / (parentContainer.scaleY || 1);
      child.opacity = (child.opacity || 1) / (parentContainer.opacity || 1);

      updateShapeGraphicsAfterUngroup(child);

      parentContainer.graphics.addChild(child.graphics);
      parentContainer.children.push(child);

      // ✅ Check if child should have events when moved to parent container
      // Only add events if the parent container is the current context
      const shouldAddEvents = getCurrentContainerContext() === parentContainer;
      if (shouldAddEvents) {
        safelyAddShapeEvents(child);
      }
    } else {
      child.x = childWorldX;
      child.y = childWorldY;

      updateShapeGraphicsAfterUngroup(child);

      if (shapeContainer) {
        shapeContainer.addChild(child.graphics);
      }

      shapes.push(child);

      // ✅ Add events only if we're not in a container context (root level)
      if (!isInContainerContext()) {
        safelyAddShapeEvents(child);
      }
    }

    ungroupedItems.push(child);
  });

  // Remove the container
  if (parentContainer) {
    const childIndex = parentContainer.children.findIndex(
      (child) => child.id === container.id
    );
    if (childIndex !== -1) {
      parentContainer.children.splice(childIndex, 1);
    }
    parentContainer.graphics.removeChild(container.graphics);
  } else {
    const shapeIndex = shapes.findIndex((shape) => shape.id === container.id);
    if (shapeIndex !== -1) {
      shapes.splice(shapeIndex, 1);
    }
    if (shapeContainer && container.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(container.graphics);
    }
  }

  // ✅ Always remove events from the container being destroyed
  safelyRemoveShapeEvents(container);
  container.graphics.destroy();

  setShapes([...shapes]);

  useSeatMapStore.getState().setSelectedShapes(ungroupedItems);
  useSeatMapStore.getState().updateShapes([...shapes], true);

  return ungroupedItems;
};

/**
 * Helper function to update shape graphics after ungrouping
 */
const updateShapeGraphicsAfterUngroup = (shape: CanvasItem) => {
  if (shape.type === "svg") {
    const svgShape = shape as SVGShape;
    import("../shapes/svg-shape").then(({ updateSVGGraphics }) => {
      updateSVGGraphics(svgShape);
    });
  } else if (shape.type === "image") {
    const imageShape = shape as ImageShape;
    import("../shapes/image-shape").then(({ updateImageGraphics }) => {
      updateImageGraphics(imageShape);
    });
  } else {
    shape.graphics.position.set(shape.x, shape.y);
    shape.graphics.rotation = shape.rotation || 0;
    shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
    shape.graphics.alpha = shape.opacity || 1;
  }
};

/**
 * Helper function to get accumulated transforms from the entire container hierarchy
 */
const getAccumulatedContainerTransforms = (container: ContainerGroup) => {
  let accumulatedRotation = container.rotation || 0;
  let accumulatedScaleX = container.scaleX || 1;
  let accumulatedScaleY = container.scaleY || 1;
  let accumulatedOpacity = container.opacity || 1;

  let currentContainer = findParentContainer(container);
  while (currentContainer) {
    accumulatedRotation += currentContainer.rotation || 0;
    accumulatedScaleX *= currentContainer.scaleX || 1;
    accumulatedScaleY *= currentContainer.scaleY || 1;
    accumulatedOpacity *= currentContainer.opacity || 1;

    currentContainer = findParentContainer(currentContainer);
  }

  return {
    rotation: accumulatedRotation,
    scaleX: accumulatedScaleX,
    scaleY: accumulatedScaleY,
    opacity: accumulatedOpacity,
  };
};

/**
 * Adds items to an existing container group
 */
export const addToGroup = (
  container: ContainerGroup,
  items: CanvasItem[]
): void => {
  if (container.type !== "container") {
    console.warn("Target is not a container");
    return;
  }

  items.forEach((item) => {
    if (container.children.some((child) => child.id === item.id)) {
      return;
    }

    if (shapeContainer && item.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(item.graphics);
    }

    // ✅ Remove events from items being added to group
    safelyRemoveShapeEvents(item);

    const relativeX = item.x - container.x;
    const relativeY = item.y - container.y;

    item.x = relativeX;
    item.y = relativeY;
    item.graphics.position.set(relativeX, relativeY);

    container.graphics.addChild(item.graphics);
    container.children.push(item);
    item.selected = false;
  });

  const newShapes = shapes.filter(
    (shape) => !items.some((item) => item.id === shape.id)
  );

  setShapes(newShapes);
  useSeatMapStore.getState().updateShapes([...newShapes], true);
  useSeatMapStore.getState().setSelectedShapes([container]);
};

/**
 * Removes items from a container group
 */
export const removeFromGroup = (
  container: ContainerGroup,
  items: CanvasItem[]
): void => {
  if (container.type !== "container") {
    console.warn("Source is not a container");
    return;
  }

  const removedItems: CanvasItem[] = [];

  let containerWorldX = container.x;
  let containerWorldY = container.y;

  const parentContainer = findParentContainer(container);
  if (parentContainer) {
    const containerPath = getFullContainerPath(parentContainer);
    const worldCoords = calculateWorldCoordinates(container, containerPath);
    containerWorldX = worldCoords.x;
    containerWorldY = worldCoords.y;
  }

  items.forEach((item) => {
    const childIndex = container.children.findIndex(
      (child) => child.id === item.id
    );
    if (childIndex === -1) {
      return;
    }

    const worldX = containerWorldX + item.x;
    const worldY = containerWorldY + item.y;

    item.x = worldX;
    item.y = worldY;

    item.rotation = (item.rotation || 0) + (container.rotation || 0);
    item.scaleX = (item.scaleX || 1) * (container.scaleX || 1);
    item.scaleY = (item.scaleY || 1) * (container.scaleY || 1);
    item.opacity = (item.opacity || 1) * (container.opacity || 1);

    container.graphics.removeChild(item.graphics);
    container.children.splice(childIndex, 1);

    item.graphics.position.set(item.x, item.y);
    item.graphics.rotation = item.rotation;
    item.graphics.scale.set(item.scaleX, item.scaleY);
    item.graphics.alpha = item.opacity;

    if (shapeContainer) {
      shapeContainer.addChild(item.graphics);
    }

    // ✅ Add events only if not in container context
    if (!isInContainerContext()) {
      safelyAddShapeEvents(item);
    }

    removedItems.push(item);
  });

  const newShapes = [...shapes, ...removedItems];
  setShapes(newShapes);
  useSeatMapStore.getState().updateShapes([...newShapes], true);
  useSeatMapStore.getState().setSelectedShapes([]);
};

/**
 * Checks if an item can be grouped (not already in a container)
 */
export const canGroup = (items: CanvasItem[]): boolean => {
  if (items.length < 2) return false;

  const itemsInContainers = new Set<string>();

  shapes.forEach((shape) => {
    if (shape.type === "container") {
      const addChildrenRecursively = (container: ContainerGroup) => {
        container.children.forEach((child) => {
          itemsInContainers.add(child.id);
          if (child.type === "container") {
            addChildrenRecursively(child);
          }
        });
      };
      addChildrenRecursively(shape);
    }
  });

  return items.every((item) => !itemsInContainers.has(item.id));
};

/**
 * Checks if items can be grouped within the same container
 */
export const canGroupInSameContainer = (items: CanvasItem[]): boolean => {
  if (items.length < 2) return false;

  const parentContainers = items.map((item) => findParentContainer(item));
  const firstParent = parentContainers[0];

  return parentContainers.every(
    (parent) =>
      (parent === null && firstParent === null) ||
      (parent !== null && firstParent !== null && parent.id === firstParent.id)
  );
};

/**
 * Gets all items that are currently in containers
 */
export const getItemsInContainers = (): Set<string> => {
  const itemsInContainers = new Set<string>();

  shapes.forEach((shape) => {
    if (shape.type === "container") {
      const addChildrenRecursively = (container: ContainerGroup) => {
        container.children.forEach((child) => {
          itemsInContainers.add(child.id);
          if (child.type === "container") {
            addChildrenRecursively(child);
          }
        });
      };
      addChildrenRecursively(shape);
    }
  });

  return itemsInContainers;
};
