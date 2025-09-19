import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup, PolygonShape } from "../types";
import {
  findParentContainer,
  generateShapeId,
  updatePolygonGraphics,
} from "../shapes/index";
import { shapeContainer, shapes, setShapes } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";
import { calculateGroupBounds } from "./bounds";

/**
 * Helper function to calculate world coordinates for nested items
 * This function properly handles the full container hierarchy
 */
const calculateWorldCoordinates = (
  item: CanvasItem,
  containerPath: ContainerGroup[]
): { x: number; y: number } => {
  // Start with the item's position relative to its immediate parent
  let worldX = item.x;
  let worldY = item.y;

  // Apply transforms from each container in the hierarchy, starting from the innermost
  containerPath.forEach((currentContainer) => {
    const containerRotation = currentContainer.rotation || 0;
    const containerScaleX = currentContainer.scaleX || 1;
    const containerScaleY = currentContainer.scaleY || 1;

    // Scale the relative position
    const scaledX = worldX * containerScaleX;
    const scaledY = worldY * containerScaleY;

    // Rotate if necessary
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

    // Add container's position
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

  // First, add the target container itself
  path.push(targetContainer);

  // Then find all parent containers
  let currentContainer = findParentContainer(targetContainer);
  while (currentContainer) {
    path.unshift(currentContainer); // Add to beginning to maintain order from root to target
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

    // Update the item's coordinates to be relative to container
    item.x = relativeX;
    item.y = relativeY;

    // Special handling for polygons - update points to be relative to new container
    if (item.type === "polygon") {
      const polygon = item as PolygonShape;
      polygon.points = polygon.points.map((point) => ({
        x: point.x - bounds.centerX,
        y: point.y - bounds.centerY,
        radius: point.radius,
      }));
      updatePolygonGraphics(polygon);
    }

    // Set graphics position relative to container
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
  useSeatMapStore.getState().updateShapes(newShapes);

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
  const eventManager = getEventManager();

  // Calculate world coordinates for all items first
  const itemsWithWorldCoords = items.map((item) => {
    let worldX = item.x;
    let worldY = item.y;

    if (parentContainer) {
      // Convert from parent container's local space to world space
      const containerPath = getFullContainerPath(parentContainer);
      const worldCoords = calculateWorldCoordinates(item, containerPath);
      worldX = worldCoords.x;
      worldY = worldCoords.y;
    }

    return {
      item,
      worldX,
      worldY,
    };
  });

  // Calculate bounds in world space
  const worldBounds = calculateGroupBounds(
    itemsWithWorldCoords.map(({ item, worldX, worldY }) => ({
      ...item,
      x: worldX,
      y: worldY,
    }))
  );

  // Create the container group
  const container = createContainerGroup(items);

  // Set container position relative to parent container
  if (parentContainer) {
    container.x = worldBounds.centerX - parentContainer.x;
    container.y = worldBounds.centerY - parentContainer.y;
  } else {
    container.x = worldBounds.centerX;
    container.y = worldBounds.centerY;
  }

  // Remove items from their current parent and add to new container
  items.forEach((item) => {
    if (parentContainer) {
      // Remove from parent container
      const childIndex = parentContainer.children.findIndex(
        (child) => child.id === item.id
      );
      if (childIndex !== -1) {
        parentContainer.children.splice(childIndex, 1);
        parentContainer.graphics.removeChild(item.graphics);
      }
    } else {
      // Remove from root shapes
      const shapeIndex = shapes.findIndex((shape) => shape.id === item.id);
      if (shapeIndex !== -1) {
        shapes.splice(shapeIndex, 1);
      }
      if (shapeContainer && item.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(item.graphics);
      }
    }

    // Remove event listeners from individual items
    if (eventManager) {
      eventManager.removeShapeEvents(item);
    }

    // Find the world coordinates for this item
    const itemWithWorldCoords = itemsWithWorldCoords.find(
      (iwc) => iwc.item.id === item.id
    )!;

    // Calculate relative position to new container center
    const relativeX = itemWithWorldCoords.worldX - worldBounds.centerX;
    const relativeY = itemWithWorldCoords.worldY - worldBounds.centerY;

    // Update the item's coordinates to be relative to new container
    item.x = relativeX;
    item.y = relativeY;

    // Special handling for polygons - update points to be relative to new container
    if (item.type === "polygon") {
      const polygon = item as PolygonShape;
      polygon.points = polygon.points.map((point) => ({
        x: point.x - worldBounds.centerX,
        y: point.y - worldBounds.centerY,
        radius: point.radius,
      }));
      updatePolygonGraphics(polygon);
    }

    // Set graphics position relative to container
    item.graphics.position.set(relativeX, relativeY);

    // Add to container
    container.graphics.addChild(item.graphics);
    container.children.push(item);

    // Clear individual selection
    item.selected = false;
  });

  // Add container to the appropriate parent
  if (parentContainer) {
    // Add to parent container
    container.graphics.position.set(container.x, container.y);
    parentContainer.graphics.addChild(container.graphics);
    parentContainer.children.push(container);
  } else {
    // Add to root level
    container.graphics.position.set(container.x, container.y);
    if (shapeContainer) {
      shapeContainer.addChild(container.graphics);
    }
    shapes.push(container);
  }

  // Add event listeners to container
  if (eventManager) {
    eventManager.addShapeEvents(container);
  }

  // Update variables.ts shapes array
  setShapes([...shapes]);

  // Update store for UI reactivity
  useSeatMapStore.getState().setSelectedShapes([container]);
  useSeatMapStore.getState().updateShapes([...shapes]);

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
    x: 100, // Default position
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    graphics: pixiContainer,
    children: [],
    expanded: true,
  };

  // Set container position
  pixiContainer.position.set(container.x, container.y);

  // Add to stage
  if (shapeContainer) {
    shapeContainer.addChild(pixiContainer);
  }

  // Add event listeners
  const eventManager = getEventManager();
  if (eventManager) {
    eventManager.addShapeEvents(container);
  }

  // Add to shapes array
  shapes.push(container);
  setShapes([...shapes]);

  // Update store
  useSeatMapStore.getState().updateShapes([...shapes]);
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

  const eventManager = getEventManager();
  const ungroupedItems: CanvasItem[] = [];

  // Find if this container is nested inside another container
  const parentContainer = findParentContainer(container);

  // Calculate container's world coordinates
  let containerWorldX = container.x;
  let containerWorldY = container.y;

  if (parentContainer) {
    const containerPath = getFullContainerPath(parentContainer);
    const worldCoords = calculateWorldCoordinates(container, containerPath);
    containerWorldX = worldCoords.x;
    containerWorldY = worldCoords.y;
  }

  container.children.forEach((child) => {
    // Calculate the child's world coordinates
    const childWorldX = containerWorldX + child.x;
    const childWorldY = containerWorldY + child.y;

    // Apply container's transforms to child
    const accumulatedTransforms = getAccumulatedContainerTransforms(container);
    child.rotation = (child.rotation || 0) + accumulatedTransforms.rotation;
    child.scaleX = (child.scaleX || 1) * accumulatedTransforms.scaleX;
    child.scaleY = (child.scaleY || 1) * accumulatedTransforms.scaleY;
    child.opacity = (child.opacity || 1) * accumulatedTransforms.opacity;

    // Special handling for polygons - update points array to world coordinates
    if (child.type === "polygon") {
      const polygon = child as PolygonShape;
      polygon.points = polygon.points.map((point) => ({
        x: point.x + containerWorldX,
        y: point.y + containerWorldY,
        radius: point.radius,
      }));
      updatePolygonGraphics(polygon);
    }

    // Remove from container
    container.graphics.removeChild(child.graphics);

    // Determine where to place the child
    if (parentContainer) {
      // If the container was nested, add children to the parent container
      // Convert world coordinates to parent container's local coordinates
      child.x = childWorldX - parentContainer.x;
      child.y = childWorldY - parentContainer.y;

      // Adjust child's transforms relative to parent
      child.rotation = (child.rotation || 0) - (parentContainer.rotation || 0);
      child.scaleX = (child.scaleX || 1) / (parentContainer.scaleX || 1);
      child.scaleY = (child.scaleY || 1) / (parentContainer.scaleY || 1);
      child.opacity = (child.opacity || 1) / (parentContainer.opacity || 1);

      // Set graphics position and transforms
      child.graphics.position.set(child.x, child.y);
      child.graphics.rotation = child.rotation || 0;
      child.graphics.scale.set(child.scaleX || 1, child.scaleY || 1);
      child.graphics.alpha = child.opacity || 1;

      // Add to parent container
      parentContainer.graphics.addChild(child.graphics);
      parentContainer.children.push(child);
    } else {
      // If the container was at root level, add children to stage
      child.x = childWorldX;
      child.y = childWorldY;

      // Set graphics position and transforms
      child.graphics.position.set(child.x, child.y);
      child.graphics.rotation = child.rotation || 0;
      child.graphics.scale.set(child.scaleX || 1, child.scaleY || 1);
      child.graphics.alpha = child.opacity || 1;

      if (shapeContainer) {
        shapeContainer.addChild(child.graphics);
      }
      // Add to root shapes array
      shapes.push(child);
    }

    // Add event listeners back to individual items
    if (eventManager) {
      eventManager.addShapeEvents(child);
    }

    ungroupedItems.push(child);
  });

  // Remove container from its parent
  if (parentContainer) {
    // Remove from parent container
    const childIndex = parentContainer.children.findIndex(
      (child) => child.id === container.id
    );
    if (childIndex !== -1) {
      parentContainer.children.splice(childIndex, 1);
    }
    parentContainer.graphics.removeChild(container.graphics);
  } else {
    // Remove from root level
    const shapeIndex = shapes.findIndex((shape) => shape.id === container.id);
    if (shapeIndex !== -1) {
      shapes.splice(shapeIndex, 1);
    }
    if (shapeContainer && container.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(container.graphics);
    }
  }

  // Remove event listeners from container
  if (eventManager) {
    eventManager.removeShapeEvents(container);
  }

  // Destroy container graphics
  container.graphics.destroy();

  // Update variables.ts shapes array
  setShapes([...shapes]);

  // Update store for UI reactivity with proper selection
  useSeatMapStore.getState().setSelectedShapes(ungroupedItems);
  useSeatMapStore.getState().updateShapes([...shapes]);

  return ungroupedItems;
};

/**
 * Helper function to get accumulated transforms from the entire container hierarchy
 */
const getAccumulatedContainerTransforms = (container: ContainerGroup) => {
  let accumulatedRotation = container.rotation || 0;
  let accumulatedScaleX = container.scaleX || 1;
  let accumulatedScaleY = container.scaleY || 1;
  let accumulatedOpacity = container.opacity || 1;

  // Walk up the container hierarchy
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

    // Update item position
    item.x = relativeX;
    item.y = relativeY;

    // Special handling for polygons - update points array
    if (item.type === "polygon") {
      const polygon = item as PolygonShape;
      polygon.points = polygon.points.map((point) => ({
        x: point.x - container.x,
        y: point.y - container.y,
        radius: point.radius,
      }));

      updatePolygonGraphics(polygon);
    }

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

  // Calculate container's world coordinates
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
      return; // Item not in container
    }

    // Calculate world position
    const worldX = containerWorldX + item.x;
    const worldY = containerWorldY + item.y;

    // Update item's world position
    item.x = worldX;
    item.y = worldY;

    // Apply container's transforms
    item.rotation = (item.rotation || 0) + (container.rotation || 0);
    item.scaleX = (item.scaleX || 1) * (container.scaleX || 1);
    item.scaleY = (item.scaleY || 1) * (container.scaleY || 1);
    item.opacity = (item.opacity || 1) * (container.opacity || 1);

    // Special handling for polygons - update points array
    if (item.type === "polygon") {
      const polygon = item as PolygonShape;
      polygon.points = polygon.points.map((point) => ({
        x: point.x + containerWorldX,
        y: point.y + containerWorldY,
        radius: point.radius,
      }));

      updatePolygonGraphics(polygon);
    }

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

  // All items must be at root level (not in any container)
  return items.every((item) => !itemsInContainers.has(item.id));
};

/**
 * Checks if items can be grouped within the same container
 */
export const canGroupInSameContainer = (items: CanvasItem[]): boolean => {
  if (items.length < 2) return false;

  // Check if all items are in the same container (or all at root level)
  const parentContainers = items.map((item) => findParentContainer(item));
  const firstParent = parentContainers[0];

  // All items must have the same parent (null for root level, or same container)
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
