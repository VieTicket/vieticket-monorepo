import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  EllipseShape,
  PolygonShape,
  RectangleShape,
  SVGShape,
} from "../types";
import {
  shapeContainer,
  shapes,
  addShape,
  stage,
  selectedContainer,
  setShapes,
} from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";
import { v4 as uuidv4 } from "uuid";
import { getSelectionTransform } from "../events/transform-events";
export { createRectangle } from "./rectangle-shape";
export { createEllipse } from "./ellipse-shape";
export { createText } from "./text-shape";
export { updatePolygonGraphics } from "./polygon-shape";

export const generateShapeId = () => uuidv4();

export const addShapeToStage = (shape: CanvasItem) => {
  if (shapeContainer) {
    shapeContainer.addChild(shape.graphics);
    addShape(shape);
    useSeatMapStore.getState().updateShapes([...shapes], true);
  }
};

export const getAllShapesIncludingNested = (): CanvasItem[] => {
  const allShapes: CanvasItem[] = [];

  const collectShapes = (shapeList: CanvasItem[]) => {
    shapeList.forEach((shape) => {
      allShapes.push(shape);
      if (shape.type === "container") {
        const container = shape as ContainerGroup;
        collectShapes(container.children);
      }
    });
  };

  collectShapes(shapes);
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

  const rotatedX = scaledX * Math.cos(rotation) - scaledY * Math.sin(rotation);
  const rotatedY = scaledX * Math.sin(rotation) + scaledY * Math.cos(rotation);

  return { x: rotatedX, y: rotatedY };
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

export const findShapeInContainer = (
  container: ContainerGroup,
  shapeId: string
): CanvasItem | null => {
  for (const child of container.children) {
    if (child.id === shapeId) {
      return child;
    }
    if (child.type === "container") {
      const found = findShapeInContainer(child as ContainerGroup, shapeId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

export const findParentContainer = (
  targetShape: CanvasItem
): ContainerGroup | null => {
  for (const shape of shapes) {
    if (shape.type === "container") {
      const container = shape as ContainerGroup;
      const found = findShapeInContainerRecursive(container, targetShape.id);
      if (found) {
        return found.parent;
      }
    }
  }
  return null;
};
const findShapeInContainerRecursive = (
  container: ContainerGroup,
  shapeId: string,
  parent: ContainerGroup | null = null
): { shape: CanvasItem; parent: ContainerGroup | null } | null => {
  for (const child of container.children) {
    if (child.id === shapeId) {
      return { shape: child, parent: container };
    }
    if (child.type === "container") {
      const found = findShapeInContainerRecursive(
        child as ContainerGroup,
        shapeId,
        child as ContainerGroup
      );
      if (found) {
        return found;
      }
    }
  }
  return null;
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
          const localBounds = child.graphics.getLocalBounds();

          // Since SVG graphics are pivoted to center, the local bounds
          // are relative to the pivot point (which is at the center)
          const halfWidth = localBounds.width / 2;
          const halfHeight = localBounds.height / 2;

          return (
            localPoint.x >= -halfWidth &&
            localPoint.x <= halfWidth &&
            localPoint.y >= -halfHeight &&
            localPoint.y <= halfHeight
          );
        } catch {
          // Fallback to simple bounds check using original dimensions
          const svg = child as SVGShape;
          const halfWidth = svg.originalWidth / 2;
          const halfHeight = svg.originalHeight / 2;

          return (
            localPoint.x >= -halfWidth &&
            localPoint.x <= halfWidth &&
            localPoint.y >= -halfHeight &&
            localPoint.y <= halfHeight
          );
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

/**
 * Enhanced version that allows choosing the resolution strategy
 */
export const findShapeAtPointWithStrategy = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point,
  strategy:
    | "container-first"
    | "depth-first"
    | "breadth-first"
    | "original" = "container-first"
): CanvasItem | null => {
  switch (strategy) {
    case "container-first":
      return resolveShapeForContext(container, event);
    case "depth-first":
      return resolveShapeForContextDeepSearch(container, event);
    case "breadth-first":
      return resolveShapeForContextBreadthFirst(container, event);
    case "original":
      return findTopmostChildAtPoint(container, event);
    default:
      return resolveShapeForContext(container, event);
  }
};

/**
 * Depth-first search approach
 */
export const resolveShapeForContextDeepSearch = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  let worldPoint: PIXI.Point;

  if (event instanceof PIXI.Point) {
    worldPoint = event;
  } else {
    worldPoint = stage ? stage.toLocal(event.global) : event.global;
  }

  // Recursive function to find the first nested container
  const findFirstNestedContainer = (
    currentContainer: ContainerGroup
  ): CanvasItem | null => {
    for (let i = 0; i < currentContainer.children.length; i++) {
      const child = currentContainer.children[i];
      if (!child.visible || child.graphics.alpha === 0) continue;

      if (hitTestChild(child, worldPoint)) {
        if (child.type === "container") {
          // Found a container, check if it has nested containers first
          const nestedContainer = findFirstNestedContainer(
            child as ContainerGroup
          );
          if (nestedContainer) {
            return nestedContainer;
          }
          // If no nested containers, return this container
          return child;
        }
      }
    }
    return null;
  };

  // First, try to find any nested container
  const nestedContainer = findFirstNestedContainer(container);
  if (nestedContainer) {
    return nestedContainer;
  }

  // If no nested containers found, return the first child that hits
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    if (!child.visible || child.graphics.alpha === 0) continue;

    if (hitTestChild(child, worldPoint)) {
      return child;
    }
  }

  return null;
};

/**
 * Breadth-first search approach
 */
export const resolveShapeForContextBreadthFirst = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  let worldPoint: PIXI.Point;

  if (event instanceof PIXI.Point) {
    worldPoint = event;
  } else {
    worldPoint = stage ? stage.toLocal(event.global) : event.global;
  }

  const hitChildren: CanvasItem[] = [];
  const hitContainers: CanvasItem[] = [];

  // Collect all hit children, separating containers from other shapes
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    if (!child.visible || child.graphics.alpha === 0) continue;

    if (hitTestChild(child, worldPoint)) {
      if (child.type === "container") {
        hitContainers.push(child);
      } else {
        hitChildren.push(child);
      }
    }
  }

  // Priority 1: Return the first container found at this level
  if (hitContainers.length > 0) {
    return hitContainers[0];
  }

  // Priority 2: Return the first non-container child
  if (hitChildren.length > 0) {
    return hitChildren[0];
  }

  return null;
};

// Update the existing findTopmostChildAtPoint to use the new logic
export const findTopmostChildAtPoint = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  // Use the new container-first resolution logic instead of the old top-most approach
  return resolveShapeForContext(container, event);
};

/**
 * Resolves the appropriate shape for the current context
 * Priority: first nested container found, then first child of any shape
 */
export const resolveShapeForContext = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  let worldPoint: PIXI.Point;

  if (event instanceof PIXI.Point) {
    worldPoint = event;
  } else {
    worldPoint = stage ? stage.toLocal(event.global) : event.global;
  }

  // First pass: look for nested containers (priority)
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    if (!child.visible || child.graphics.alpha === 0) continue;

    if (hitTestChild(child, worldPoint) && child.type === "container") {
      return child; // Return first nested container found
    }
  }

  // Second pass: return first child of any type
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i];
    if (!child.visible || child.graphics.alpha === 0) continue;

    if (hitTestChild(child, worldPoint)) {
      return child; // Return first child found
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

export const deleteShapes = () => {
  const eventManager = getEventManager();
  const selectedShapesToDelete: Array<{
    shape: CanvasItem;
    parent: ContainerGroup | null;
  }> = [];

  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  if (selectedShapes.length === 0) return;

  selectedShapes.forEach((selectedShape) => {
    const foundInMain = shapes.find((s) => s.id === selectedShape.id);
    if (foundInMain) {
      selectedShapesToDelete.push({ shape: foundInMain, parent: null });
    } else {
      for (const mainShape of shapes) {
        if (mainShape.type === "container") {
          const containerGroup = mainShape as ContainerGroup;
          const foundShape = findShapeInContainer(
            containerGroup,
            selectedShape.id
          );
          if (foundShape) {
            selectedShapesToDelete.push({
              shape: foundShape,
              parent: containerGroup,
            });
            break;
          }
        }
      }
    }
  });

  selectedShapesToDelete.forEach(({ shape, parent }) => {
    if (eventManager) {
      eventManager.removeShapeEvents(shape);
    }

    if (shape.graphics && shape.graphics.parent) {
      shape.graphics.parent.removeChild(shape.graphics);
    }

    if (parent) {
      const index = parent.children.findIndex((child) => child.id === shape.id);
      if (index !== -1) {
        parent.children.splice(index, 1);
      }
    } else {
      const index = shapes.findIndex((s) => s.id === shape.id);
      if (index !== -1) {
        shapes.splice(index, 1);
      }
    }
  });

  setShapes([...shapes]);

  // ✅ History automatically saved inside deleteShapes
  useSeatMapStore.getState().deleteShapes();

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection([]);
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
  useSeatMapStore.getState().updateShapes([]);
  useSeatMapStore.getState().setSelectedShapes([]);
};
