import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  EllipseShape,
  PolygonShape,
  RectangleShape,
} from "../types";
import {
  shapeContainer,
  shapes,
  addShape,
  setShapes,
  stage,
  selectedContainer,
} from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";
import { v4 as uuidv4 } from "uuid";

export { createRectangle } from "./rectangle-shape";
export { createEllipse } from "./ellipse-shape";
export { createText } from "./text-shape";
export { updatePolygonGraphics } from "./polygon-shape";

export const generateShapeId = () => uuidv4();

export const addShapeToStage = (shape: CanvasItem) => {
  if (shapeContainer) {
    shapeContainer.addChild(shape.graphics);
    addShape(shape);
  }
};

export const getAllShapesIncludingNested = (): CanvasItem[] => {
  const allShapes: CanvasItem[] = [];
  const addRecursively = (shape: CanvasItem) => {
    allShapes.push(shape);
    if (shape.type === "container") {
      (shape as ContainerGroup).children.forEach(addRecursively);
    }
  };
  shapes.forEach(addRecursively);
  return allShapes;
};

export const transformPoint = (
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  rotation: number
): { x: number; y: number } => {
  const scaledX = x * scaleX;
  const scaledY = y * scaleY;

  if (rotation === 0) return { x: scaledX, y: scaledY };

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    x: scaledX * cos - scaledY * sin,
    y: scaledX * sin + scaledY * cos,
  };
};

export const getContainerPath = (targetShape: CanvasItem): ContainerGroup[] => {
  const path: ContainerGroup[] = [];

  const findPath = (
    containers: CanvasItem[],
    currentPath: ContainerGroup[]
  ): boolean => {
    for (const container of containers) {
      if (container.type === "container") {
        const containerGroup = container as ContainerGroup;
        const newPath = [...currentPath, containerGroup];

        if (
          containerGroup.children.some((child) => child.id === targetShape.id)
        ) {
          path.push(...newPath);
          return true;
        }

        if (findPath(containerGroup.children, newPath)) return true;
      }
    }
    return false;
  };

  findPath(shapes, []);
  return path;
};

/**
 * Finds a shape by ID in the entire hierarchy (root + containers)
 */
const findShapeById = (
  shapeId: string
): { shape: CanvasItem; parent: ContainerGroup | null } | null => {
  // Check root level shapes first
  const rootShape = shapes.find((shape) => shape.id === shapeId);
  if (rootShape) {
    return { shape: rootShape, parent: null };
  }

  // Search in containers recursively
  const searchInContainer = (
    container: ContainerGroup
  ): { shape: CanvasItem; parent: ContainerGroup | null } | null => {
    for (const child of container.children) {
      if (child.id === shapeId) {
        return { shape: child, parent: container };
      }

      if (child.type === "container") {
        const found = searchInContainer(child as ContainerGroup);
        if (found) return found;
      }
    }
    return null;
  };

  for (const shape of shapes) {
    if (shape.type === "container") {
      const found = searchInContainer(shape as ContainerGroup);
      if (found) return found;
    }
  }

  return null;
};

export const findParentContainer = (
  targetShape: CanvasItem
): ContainerGroup | null => {
  const findInContainer = (
    container: ContainerGroup
  ): ContainerGroup | null => {
    if (container.children.some((child) => child.id === targetShape.id)) {
      return container;
    }
    for (const child of container.children) {
      if (child.type === "container") {
        const found = findInContainer(child as ContainerGroup);
        if (found) return found;
      }
    }
    return null;
  };

  for (const shape of shapes) {
    if (shape.type === "container") {
      const found = findInContainer(shape as ContainerGroup);
      if (found) return found;
    }
  }
  return null;
};
export const findShapeInContainer = (
  container: ContainerGroup,
  shapeId: string
): CanvasItem | undefined => {
  for (const child of container.children) {
    if (child.id === shapeId) {
      return child;
    }
    if (child.type === "container") {
      const found = findShapeInContainer(child as ContainerGroup, shapeId);
      if (found) return found;
    }
  }
  return undefined;
};

export const getCurrentContainer = (): ContainerGroup | null => {
  if (selectedContainer.length === 0) return null;
  return selectedContainer[selectedContainer.length - 1];
};

export const hitTestChild = (child: CanvasItem, point: PIXI.Point): boolean => {
  const worldTransform = getAccumulatedWorldTransform(child);

  const localPoint = worldPointToLocal(point, worldTransform);

  switch (child.type) {
    case "rectangle": {
      const rect = child as RectangleShape;
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      return (
        localPoint.x >= -halfWidth &&
        localPoint.x <= halfWidth &&
        localPoint.y >= -halfHeight &&
        localPoint.y <= halfHeight
      );
    }

    case "ellipse": {
      const ellipse = child as EllipseShape;
      const dx = localPoint.x / ellipse.radiusX;
      const dy = localPoint.y / ellipse.radiusY;
      return dx * dx + dy * dy <= 1;
    }

    case "text": {
      if (child.graphics instanceof PIXI.Text) {
        const bounds = child.graphics.getLocalBounds();
        const adjustedX = localPoint.x + bounds.width / 2;
        const adjustedY = localPoint.y + bounds.height / 2;
        return (
          adjustedX >= bounds.x &&
          adjustedX <= bounds.x + bounds.width &&
          adjustedY >= bounds.y &&
          adjustedY <= bounds.y + bounds.height
        );
      }
      return false;
    }

    case "polygon": {
      const polygon = child as PolygonShape;
      return pointInPolygon(localPoint, polygon.points);
    }

    case "image": {
      if (child.graphics instanceof PIXI.Sprite) {
        const sprite = child.graphics;
        const bounds = sprite.getLocalBounds();

        // Adjust for anchor point (0.5, 0.5)
        const adjustedX = localPoint.x + bounds.width / 2;
        const adjustedY = localPoint.y + bounds.height / 2;

        return (
          adjustedX >= bounds.x &&
          adjustedX <= bounds.x + bounds.width &&
          adjustedY >= bounds.y &&
          adjustedY <= bounds.y + bounds.height
        );
      }
      return false;
    }
    case "svg": {
      if (child.graphics instanceof PIXI.Graphics) {
        try {
          const bounds = child.graphics.getLocalBounds();
          return (
            localPoint.x >= bounds.x &&
            localPoint.x <= bounds.x + bounds.width &&
            localPoint.y >= bounds.y &&
            localPoint.y <= bounds.y + bounds.height
          );
        } catch {
          // Fallback to simple bounds check
          return Math.abs(localPoint.x) <= 50 && Math.abs(localPoint.y) <= 50;
        }
      }
      return false;
    }
    case "container": {
      if (child.graphics instanceof PIXI.Container) {
        try {
          const bounds = child.graphics.getLocalBounds();
          return (
            localPoint.x >= bounds.x &&
            localPoint.x <= bounds.x + bounds.width &&
            localPoint.y >= bounds.y &&
            localPoint.y <= bounds.y + bounds.height
          );
        } catch {
          return Math.abs(localPoint.x) <= 25 && Math.abs(localPoint.y) <= 25;
        }
      }
      return false;
    }

    default:
      return false;
  }
};

/**
 * Gets the accumulated world transform for an item including all parent transforms
 */
const getAccumulatedWorldTransform = (item: CanvasItem) => {
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

    const transformedPos = transformPoint(
      transform.x,
      transform.y,
      containerScaleX,
      containerScaleY,
      containerRotation
    );

    transform.x = currentContainer.x + transformedPos.x;
    transform.y = currentContainer.y + transformedPos.y;

    transform.scaleX *= containerScaleX;
    transform.scaleY *= containerScaleY;
    transform.rotation += containerRotation;

    currentContainer = findParentContainer(currentContainer);
  }

  return transform;
};

/**
 * Converts a world space point to an item's local space
 */
const worldPointToLocal = (
  worldPoint: PIXI.Point,
  worldTransform: ReturnType<typeof getAccumulatedWorldTransform>
): PIXI.Point => {
  const translatedX = worldPoint.x - worldTransform.x;
  const translatedY = worldPoint.y - worldTransform.y;

  const cos = Math.cos(-worldTransform.rotation);
  const sin = Math.sin(-worldTransform.rotation);
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;

  const localX = rotatedX / worldTransform.scaleX;
  const localY = rotatedY / worldTransform.scaleY;

  return new PIXI.Point(localX, localY);
};

export const findShapeAtPoint = (
  event: PIXI.FederatedPointerEvent,
  currentContainer: ContainerGroup | null = null
): CanvasItem | null => {
  if (currentContainer) {
    return findTopmostChildAtPoint(currentContainer, event);
  }

  const worldPoint = stage ? stage.toLocal(event.global) : event.global;

  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (!shape.visible || shape.graphics.alpha === 0) continue;

    if (hitTestChild(shape, worldPoint)) return shape;
  }
  return null;
};

export const findTopmostChildAtPoint = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  let worldPoint: PIXI.Point;

  if (event instanceof PIXI.Point) {
    worldPoint = event;
  } else {
    worldPoint = stage ? stage.toLocal(event.global) : event.global;
  }

  for (let i = container.children.length - 1; i >= 0; i--) {
    const child = container.children[i];
    if (!child.visible || child.graphics.alpha === 0) continue;

    if (hitTestChild(child, worldPoint)) {
      if (child.type === "container") {
        const nestedHit = findTopmostChildAtPoint(
          child as ContainerGroup,
          worldPoint
        );
        return nestedHit || child;
      }
      return child;
    }
  }
  return null;
};

export const pointInPolygon = (
  point: PIXI.Point,
  polygonPoints: Array<{ x: number; y: number }>
): boolean => {
  const { x, y } = point;
  let inside = false;

  for (
    let i = 0, j = polygonPoints.length - 1;
    i < polygonPoints.length;
    j = i++
  ) {
    const { x: xi, y: yi } = polygonPoints[i];
    const { x: xj, y: yj } = polygonPoints[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

export const clearAllSelections = () => {
  const clearSelection = (shape: CanvasItem) => {
    shape.selected = false;
    if (shape.type === "container") {
      (shape as ContainerGroup).children.forEach(clearSelection);
    }
  };
  shapes.forEach(clearSelection);
};

/**
 * Removes a shape from its parent container
 */
const removeShapeFromContainer = (
  shape: CanvasItem,
  parent: ContainerGroup
) => {
  const childIndex = parent.children.findIndex(
    (child) => child.id === shape.id
  );
  if (childIndex !== -1) {
    parent.children.splice(childIndex, 1);
    parent.graphics.removeChild(shape.graphics);
  }
};

/**
 * Recursively collects all shapes including nested ones that match the predicate
 */
const collectShapesRecursively = (
  shapesToCheck: CanvasItem[],
  predicate: (shape: CanvasItem) => boolean | undefined
): CanvasItem[] => {
  const collected: CanvasItem[] = [];

  const collectFromShape = (shape: CanvasItem) => {
    if (predicate(shape)) {
      collected.push(shape);
    }

    if (shape.type === "container") {
      (shape as ContainerGroup).children.forEach(collectFromShape);
    }
  };

  shapesToCheck.forEach(collectFromShape);
  return collected;
};

export const deleteShape = (shapeId: string) => {
  const result = findShapeById(shapeId);
  if (!result) {
    console.warn(`Shape with ID ${shapeId} not found`);
    return;
  }

  const { shape, parent } = result;
  const eventManager = getEventManager();

  // Remove event listeners
  eventManager?.removeShapeEvents(shape);

  // If shape has children (container), recursively remove event listeners
  if (shape.type === "container") {
    const allNestedShapes = collectShapesRecursively([shape], () => true);
    allNestedShapes.forEach((nestedShape) => {
      eventManager?.removeShapeEvents(nestedShape);
    });
  }

  if (parent) {
    // Shape is inside a container - remove from parent
    removeShapeFromContainer(shape, parent);
  } else {
    // Shape is at root level - remove from main shapes array
    const shapeIndex = shapes.findIndex((s) => s.id === shapeId);
    if (shapeIndex !== -1) {
      shapes.splice(shapeIndex, 1);

      // Remove from stage container
      if (shapeContainer && shape.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(shape.graphics);
      }
    }
  }

  // Destroy graphics
  shape.graphics.destroy();

  // Update store
  useSeatMapStore.getState().updateShapes([...shapes]);

  // Remove from selected shapes if it was selected
  const currentSelected = useSeatMapStore.getState().selectedShapes;
  const updatedSelected = currentSelected.filter((s) => s.id !== shapeId);
  if (updatedSelected.length !== currentSelected.length) {
    useSeatMapStore.getState().setSelectedShapes(updatedSelected);
  }
};

export const deleteShapes = () => {
  const eventManager = getEventManager();
  const selectedShapesToDelete: Array<{
    shape: CanvasItem;
    parent: ContainerGroup | null;
  }> = [];

  // Collect all selected shapes (including nested ones)
  const allSelectedShapes = collectShapesRecursively(
    shapes,
    (shape) => shape.selected
  );

  // Find parent information for each selected shape
  allSelectedShapes.forEach((shape) => {
    const result = findShapeById(shape.id);
    if (result) {
      selectedShapesToDelete.push(result);
    }
  });

  if (selectedShapesToDelete.length === 0) {
    console.warn("No selected shapes to delete");
    return;
  }

  // Remove event listeners from all shapes to be deleted
  selectedShapesToDelete.forEach(({ shape }) => {
    eventManager?.removeShapeEvents(shape);

    // If shape is a container, remove listeners from all nested shapes
    if (shape.type === "container") {
      const allNestedShapes = collectShapesRecursively([shape], () => true);
      allNestedShapes.forEach((nestedShape) => {
        eventManager?.removeShapeEvents(nestedShape);
      });
    }
  });

  // Group deletions by parent to optimize container updates
  const deletionsByParent = new Map<ContainerGroup | null, CanvasItem[]>();

  selectedShapesToDelete.forEach(({ shape, parent }) => {
    if (!deletionsByParent.has(parent)) {
      deletionsByParent.set(parent, []);
    }
    deletionsByParent.get(parent)!.push(shape);
  });

  // Process deletions
  deletionsByParent.forEach((shapesToDelete, parent) => {
    if (parent) {
      // Remove from container
      shapesToDelete.forEach((shape) => {
        removeShapeFromContainer(shape, parent);
        shape.graphics.destroy();
      });
    } else {
      // Remove from root level
      shapesToDelete.forEach((shape) => {
        const shapeIndex = shapes.findIndex((s) => s.id === shape.id);
        if (shapeIndex !== -1) {
          shapes.splice(shapeIndex, 1);

          // Remove from stage container
          if (shapeContainer && shape.graphics.parent === shapeContainer) {
            shapeContainer.removeChild(shape.graphics);
          }
        }
        shape.graphics.destroy();
      });
    }
  });

  // Update store
  useSeatMapStore.getState().updateShapes([...shapes]);
  useSeatMapStore.getState().setSelectedShapes([]);
};

/**
 * Deletes shapes by their IDs (helper function for external use)
 */
export const deleteShapesByIds = (shapeIds: string[]) => {
  if (shapeIds.length === 0) return;

  const eventManager = getEventManager();
  const shapesToDelete: Array<{
    shape: CanvasItem;
    parent: ContainerGroup | null;
  }> = [];

  // Find all shapes to delete
  shapeIds.forEach((shapeId) => {
    const result = findShapeById(shapeId);
    if (result) {
      shapesToDelete.push(result);
    }
  });

  if (shapesToDelete.length === 0) {
    console.warn("No shapes found with the provided IDs");
    return;
  }

  // Remove event listeners
  shapesToDelete.forEach(({ shape }) => {
    eventManager?.removeShapeEvents(shape);

    if (shape.type === "container") {
      const allNestedShapes = collectShapesRecursively([shape], () => true);
      allNestedShapes.forEach((nestedShape) => {
        eventManager?.removeShapeEvents(nestedShape);
      });
    }
  });

  // Group deletions by parent
  const deletionsByParent = new Map<ContainerGroup | null, CanvasItem[]>();

  shapesToDelete.forEach(({ shape, parent }) => {
    if (!deletionsByParent.has(parent)) {
      deletionsByParent.set(parent, []);
    }
    deletionsByParent.get(parent)!.push(shape);
  });

  // Process deletions
  deletionsByParent.forEach((shapes, parent) => {
    if (parent) {
      shapes.forEach((shape) => {
        removeShapeFromContainer(shape, parent);
        shape.graphics.destroy();
      });
    } else {
      shapes.forEach((shape) => {
        const shapeIndex = shapes.findIndex((s) => s.id === shape.id);
        if (shapeIndex !== -1) {
          shapes.splice(shapeIndex, 1);

          if (shapeContainer && shape.graphics.parent === shapeContainer) {
            shapeContainer.removeChild(shape.graphics);
          }
        }
        shape.graphics.destroy();
      });
    }
  });

  // Update store
  useSeatMapStore.getState().updateShapes([...shapes]);

  // Remove deleted shapes from selection
  const currentSelected = useSeatMapStore.getState().selectedShapes;
  const updatedSelected = currentSelected.filter(
    (shape) => !shapeIds.includes(shape.id)
  );
  if (updatedSelected.length !== currentSelected.length) {
    useSeatMapStore.getState().setSelectedShapes(updatedSelected);
  }
};

export const clearCanvas = () => {
  const eventManager = getEventManager();

  shapes.forEach((shape) => {
    eventManager?.removeShapeEvents(shape);
    if (shapeContainer && shape.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
    }
    shape.graphics.destroy();
  });

  shapes.length = 0;
  useSeatMapStore.getState().updateShapes(shapes);
  useSeatMapStore.getState().setSelectedShapes([]);
};
