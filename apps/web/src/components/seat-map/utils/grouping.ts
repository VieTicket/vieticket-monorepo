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
import { getSelectionTransform } from "../events/transform-events";

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
  id: string | null = null
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
    id: id || generateShapeId(),
    name: `Group`,
    type: "container",
    visible: true,
    interactive: true,
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
export const groupItemsForCanvas = (
  items: CanvasItem[]
): ContainerGroup | null => {
  // Capture state before grouping

  const container = groupItems(items);
  console.log("Grouped Container:", container);
  if (!container) {
    return null;
  }

  setShapes([...shapes]);

  useSeatMapStore.getState().saveDirectHistory(items, [container], false);
  useSeatMapStore.getState().updateShapes([...shapes], false, undefined, false);

  container.selected = true;
  useSeatMapStore.getState().setSelectedShapes([container]);

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection([container]);
  }
  return container;
};

export const ungroupContainerForCanvas = (
  container: ContainerGroup
): CanvasItem[] => {
  // Capture state before ungrouping
  const ungroupedItems = ungroupContainer(container);
  console.log("Ungrouped Items:", ungroupedItems);
  setShapes([...shapes]);

  // Save directly to history
  useSeatMapStore.getState()._saveToHistory(
    {
      shapes: [container],
      selectedShapes: [container],
    },
    {
      shapes: ungroupedItems,
      selectedShapes: [container],
    }
  );
  useSeatMapStore.getState().updateShapes([...shapes], false, undefined, false);
  useSeatMapStore.getState().setSelectedShapes(ungroupedItems);

  return ungroupedItems;
};

export const removeFromGroupForCanvas = (
  container: ContainerGroup,
  items: CanvasItem[]
): void => {
  // Capture state before removing from group
  const beforeShapes = container.children.map((shape) => ({ ...shape }));

  removeFromGroup(container, items);

  // Save directly to history
  useSeatMapStore.getState().saveDirectHistory(beforeShapes, [container], true);

  useSeatMapStore.getState().setSelectedShapes([]);
};

export const addToGroupForCanvas = (
  container: ContainerGroup,
  items: CanvasItem[]
): void => {
  // Capture state before adding to group
  const beforeShapes = container.children.map((shape) => ({ ...shape }));

  addToGroup(container, items);

  // Save directly to history
  useSeatMapStore.getState().saveDirectHistory(beforeShapes, [container], true);

  useSeatMapStore.getState().setSelectedShapes([container]);
};

/**
 * Groups items that are within the same container
 */
export const groupItems = (
  items: CanvasItem[],
  id: string | null = null
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

  const container = createContainerGroup(items, id);

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
  console.log(
    "Should Add Events to Container:",
    !isInContainerContext(),
    selectedContainer,
    parentContainer && getCurrentContainerContext() === parentContainer,
    shouldAddEvents
  );

  if (shouldAddEvents) {
    safelyAddShapeEvents(container);
  }

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
    interactive: true,
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
