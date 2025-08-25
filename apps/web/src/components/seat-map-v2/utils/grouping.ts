import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup } from "../types";
import { generateShapeId } from "./stageTransform";
import { shapeContainer, shapes, setShapes } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";
import { calculateGroupBounds } from "./bounds";

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

  // Calculate bounding box of all items
  const bounds = calculateGroupBounds(items);

  // Create PIXI container
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

  // Set container position
  pixiContainer.position.set(containerGroup.x, containerGroup.y);

  return containerGroup;
};

/**
 * Groups the selected items into a container
 */
export const groupItems = (items: CanvasItem[]): ContainerGroup | null => {
  if (items.length < 2) {
    console.warn("Need at least 2 items to create a group");
    return null;
  }

  const eventManager = getEventManager();

  // Create the container group
  const container = createContainerGroup(items);
  const bounds = calculateGroupBounds(items);

  // Remove items from their current parents and add to container
  items.forEach((item) => {
    // Remove from stage container
    if (shapeContainer && item.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(item.graphics);
    }

    // Remove event listeners from individual items
    if (eventManager) {
      eventManager.removeShapeEvents(item);
    }

    // Calculate relative position to container center
    const relativeX = item.x - bounds.centerX;
    const relativeY = item.y - bounds.centerY;

    // Set item position relative to container
    item.graphics.position.set(relativeX, relativeY);

    // Add to container
    container.graphics.addChild(item.graphics);
    container.children.push(item);

    // Clear individual selection
    item.selected = false;
  });

  // Add container to stage
  if (shapeContainer) {
    shapeContainer.addChild(container.graphics);
  }

  // Add event listeners to container
  if (eventManager) {
    eventManager.addShapeEvents(container);
  }

  // Update the shapes array in variables.ts
  const newShapes = shapes.filter(
    (shape) => !items.some((item) => item.id === shape.id)
  );
  newShapes.push(container);

  // Update variables.ts shapes array
  setShapes(newShapes);

  // Update store for UI reactivity
  useSeatMapStore.getState().setSelectedShapes([container]);

  return container;
};

/**
 * Ungroups a container, moving its children back to the main stage
 */
export const ungroupContainer = (container: ContainerGroup): CanvasItem[] => {
  if (container.type !== "container") {
    console.warn("Item is not a container");
    return [];
  }

  const eventManager = getEventManager();
  const ungroupedItems: CanvasItem[] = [];

  // Get container's world transform
  const containerWorldTransform = container.graphics.worldTransform;

  container.children.forEach((child) => {
    // Calculate world position
    const localPoint = new PIXI.Point(child.graphics.x, child.graphics.y);
    const worldPoint = containerWorldTransform.apply(localPoint);

    // Update child's world position
    child.x = worldPoint.x;
    child.y = worldPoint.y;

    // Apply container's transforms to child
    child.rotation += container.rotation;
    child.scaleX *= container.scaleX;
    child.scaleY *= container.scaleY;
    child.opacity *= container.opacity;

    // Remove from container
    container.graphics.removeChild(child.graphics);

    // Set absolute position and transforms
    child.graphics.position.set(child.x, child.y);
    child.graphics.rotation = child.rotation;
    child.graphics.scale.set(child.scaleX, child.scaleY);
    child.graphics.alpha = child.opacity;

    // Add back to stage
    if (shapeContainer) {
      shapeContainer.addChild(child.graphics);
    }

    // Add event listeners back to individual items
    if (eventManager) {
      eventManager.addShapeEvents(child);
    }

    ungroupedItems.push(child);
  });

  // Remove container from stage
  if (shapeContainer && container.graphics.parent === shapeContainer) {
    shapeContainer.removeChild(container.graphics);
  }

  // Remove event listeners from container
  if (eventManager) {
    eventManager.removeShapeEvents(container);
  }

  // Destroy container graphics
  container.graphics.destroy();

  // Update the shapes array in variables.ts
  const newShapes = shapes.filter((shape) => shape.id !== container.id);
  newShapes.push(...ungroupedItems);

  // Update variables.ts shapes array
  setShapes(newShapes);

  // Update store for UI reactivity
  useSeatMapStore.getState().setSelectedShapes(ungroupedItems);

  return ungroupedItems;
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

  const eventManager = getEventManager();

  items.forEach((item) => {
    // Skip if item is already in the container
    if (container.children.some((child) => child.id === item.id)) {
      return;
    }

    // Remove from stage container
    if (shapeContainer && item.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(item.graphics);
    }

    // Remove event listeners from individual item
    if (eventManager) {
      eventManager.removeShapeEvents(item);
    }

    // Calculate relative position to container
    const relativeX = item.x - container.x;
    const relativeY = item.y - container.y;

    // Set item position relative to container
    item.graphics.position.set(relativeX, relativeY);

    // Add to container
    container.graphics.addChild(item.graphics);
    container.children.push(item);

    // Clear individual selection
    item.selected = false;
  });

  // Update the shapes array in variables.ts
  const newShapes = shapes.filter(
    (shape) => !items.some((item) => item.id === shape.id)
  );

  // Update variables.ts shapes array
  setShapes(newShapes);
};

/**
 * Removes items from a container group back to the main stage
 */
export const removeFromGroup = (
  container: ContainerGroup,
  items: CanvasItem[]
): void => {
  if (container.type !== "container") {
    console.warn("Source is not a container");
    return;
  }

  const eventManager = getEventManager();
  const removedItems: CanvasItem[] = [];

  // Get container's world transform
  const containerWorldTransform = container.graphics.worldTransform;

  items.forEach((item) => {
    const childIndex = container.children.findIndex(
      (child) => child.id === item.id
    );
    if (childIndex === -1) {
      return; // Item not in container
    }

    // Calculate world position
    const localPoint = new PIXI.Point(item.graphics.x, item.graphics.y);
    const worldPoint = containerWorldTransform.apply(localPoint);

    // Update item's world position
    item.x = worldPoint.x;
    item.y = worldPoint.y;

    // Apply container's transforms
    item.rotation += container.rotation;
    item.scaleX *= container.scaleX;
    item.scaleY *= container.scaleY;
    item.opacity *= container.opacity;

    // Remove from container
    container.graphics.removeChild(item.graphics);
    container.children.splice(childIndex, 1);

    // Set absolute position and transforms
    item.graphics.position.set(item.x, item.y);
    item.graphics.rotation = item.rotation;
    item.graphics.scale.set(item.scaleX, item.scaleY);
    item.graphics.alpha = item.opacity;

    // Add back to stage
    if (shapeContainer) {
      shapeContainer.addChild(item.graphics);
    }

    // Add event listeners back
    if (eventManager) {
      eventManager.addShapeEvents(item);
    }

    removedItems.push(item);
  });

  // Update the shapes array in variables.ts
  const newShapes = [...shapes, ...removedItems];

  // Update variables.ts shapes array
  setShapes(newShapes);
};

/**
 * Checks if an item can be grouped (not already in a container)
 */
export const canGroup = (items: CanvasItem[]): boolean => {
  if (items.length < 2) return false;

  // Check if any item is already in a container using the shapes from variables.ts
  const itemsInContainers = new Set<string>();

  shapes.forEach((shape) => {
    if (shape.type === "container") {
      shape.children.forEach((child) => {
        itemsInContainers.add(child.id);
      });
    }
  });

  // All items must be at root level (not in any container)
  return items.every((item) => !itemsInContainers.has(item.id));
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
