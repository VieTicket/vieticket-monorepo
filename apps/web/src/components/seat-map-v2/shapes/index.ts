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
  setSelectedContainer,
  selectedContainer,
  stage,
} from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";

export { createRectangle } from "./rectangle-shape";
export { createEllipse } from "./ellipse-shape";
export { createText } from "./text-shape";
export { updatePolygonGraphics } from "./polygon-shape";

export const addShapeToStage = (shape: CanvasItem) => {
  if (shapeContainer) {
    shapeContainer.addChild(shape.graphics);
    addShape(shape);
  }
};

export const getAllShapesIncludingNested = (): CanvasItem[] => {
  const allShapes: CanvasItem[] = [];

  const addShapeRecursively = (shape: CanvasItem) => {
    allShapes.push(shape);
    if (shape.type === "container") {
      const container = shape as ContainerGroup;
      container.children.forEach(addShapeRecursively);
    }
  };

  shapes.forEach(addShapeRecursively);
  return allShapes;
};

// Helper function to update nested shapes
export const updateNestedShapes = (shapesToUpdate: CanvasItem[]) => {
  // Update the main shapes array
  useSeatMapStore.getState().updateShapes([...shapes]);

  // For nested shapes, we need to find their parent containers and update them
  const updateContainerChildren = (container: ContainerGroup) => {
    container.children.forEach((child) => {
      if (child.type === "container") {
        updateContainerChildren(child as ContainerGroup);
      }
    });
  };

  shapes.forEach((shape) => {
    if (shape.type === "container") {
      updateContainerChildren(shape as ContainerGroup);
    }
  });
};
export const getContainerPath = (targetShape: CanvasItem): ContainerGroup[] => {
  const path: ContainerGroup[] = [];

  const findPathRecursively = (
    containers: CanvasItem[],
    currentPath: ContainerGroup[]
  ): boolean => {
    for (const container of containers) {
      if (container.type === "container") {
        const containerGroup = container as ContainerGroup;
        const newPath = [...currentPath, containerGroup];

        // Check if target is directly in this container
        if (
          containerGroup.children.some((child) => child.id === targetShape.id)
        ) {
          path.push(...newPath);
          return true;
        }

        // Check nested containers
        if (findPathRecursively(containerGroup.children, newPath)) {
          return true;
        }
      }
    }
    return false;
  };

  findPathRecursively(shapes, []);
  return path;
};

// Helper function to check if two shapes are in the same container
export const areInSameContainer = (
  shape1: CanvasItem,
  shape2: CanvasItem
): boolean => {
  const path1 = getContainerPath(shape1);
  const path2 = getContainerPath(shape2);

  // If both are at root level (no container)
  if (path1.length === 0 && path2.length === 0) {
    return true;
  }

  // If different path lengths, they're in different containers
  if (path1.length !== path2.length) {
    return false;
  }

  // Compare each level of the path
  for (let i = 0; i < path1.length; i++) {
    if (path1[i].id !== path2[i].id) {
      return false;
    }
  }

  return true;
};

// Helper function to get the current container based on selectedContainer path
export const getCurrentContainer = (): ContainerGroup | null => {
  if (selectedContainer.length === 0) return null;
  return selectedContainer[selectedContainer.length - 1];
};

// Helper function to find shape at point respecting container context
export const findShapeAtPoint = (
  event: PIXI.FederatedPointerEvent,
  currentContainer: ContainerGroup | null = null
): CanvasItem | null => {
  if (currentContainer) {
    // If we're inside a container, only look for children of that container
    return findTopmostChildAtPoint(currentContainer, event);
  } else {
    // If we're at root level, look through all root shapes
    const stagePoint = event.getLocalPosition(stage!);

    // Check root level shapes in reverse order (topmost first)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];

      if (!shape.visible || shape.graphics.alpha === 0) continue;

      if (shape.type === "container") {
        const container = shape as ContainerGroup;
        const localPoint = event.getLocalPosition(container.graphics);

        // Check if point is in container bounds
        try {
          const bounds = container.graphics.getLocalBounds();
          const isInContainer =
            localPoint.x >= bounds.x &&
            localPoint.x <= bounds.x + bounds.width &&
            localPoint.y >= bounds.y &&
            localPoint.y <= bounds.y + bounds.height;

          if (isInContainer) {
            return container;
          }
        } catch (error) {
          // Fallback to hit test
          if (hitTestChild(container, stagePoint)) {
            return container;
          }
        }
      } else {
        // Regular shape hit test
        if (hitTestChild(shape, stagePoint)) {
          return shape;
        }
      }
    }
  }

  return null;
};

export const findTopmostChildAtPoint = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  // Handle both event and point inputs
  let point: PIXI.Point;
  if (event instanceof PIXI.Point) {
    point = event;
  } else {
    point = event.getLocalPosition(container.graphics);
  }

  for (let i = container.children.length - 1; i >= 0; i--) {
    const child = container.children[i];

    if (!child.visible || child.graphics.alpha === 0) continue;

    // Check if the point hits this child based on its type
    const isHit = hitTestChild(child, point);
    // console.log(isHit, child);
    if (isHit) {
      // If it's a nested container, recursively check its children
      if (child.type === "container") {
        const nestedPoint = child.graphics.toLocal(point);
        // Pass the point directly, not the event
        const nestedHit = findTopmostChildAtPoint(
          child as ContainerGroup,
          nestedPoint
        );
        return nestedHit || child;
      }
      return child;
    }
  }
  return null;
};

// Helper function to perform hit testing based on shape type
export const hitTestChild = (child: CanvasItem, point: PIXI.Point): boolean => {
  const relativePoint = {
    x: point.x - child.x,
    y: point.y - child.y,
  };

  switch (child.type) {
    case "rectangle": {
      const rect = child as RectangleShape;
      // Rectangle is drawn centered, so check bounds from center
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;

      return (
        relativePoint.x >= -halfWidth &&
        relativePoint.x <= halfWidth &&
        relativePoint.y >= -halfHeight &&
        relativePoint.y <= halfHeight
      );
    }

    case "ellipse": {
      const ellipse = child as EllipseShape;
      // Check if point is inside ellipse using ellipse equation
      const dx = relativePoint.x / ellipse.radiusX;
      const dy = relativePoint.y / ellipse.radiusY;
      return dx * dx + dy * dy <= 1;
    }

    case "text": {
      if (child.graphics instanceof PIXI.Text) {
        // Get the text bounds
        const bounds = child.graphics.getLocalBounds();
        return (
          relativePoint.x >= bounds.x &&
          relativePoint.x <= bounds.x + bounds.width &&
          relativePoint.y >= bounds.y &&
          relativePoint.y <= bounds.y + bounds.height
        );
      }
      return false;
    }

    case "polygon": {
      const polygon = child as PolygonShape;
      // Use point-in-polygon algorithm
      return pointInPolygon(
        new PIXI.Point(relativePoint.x, relativePoint.y),
        polygon.points
      );
    }

    case "container": {
      if (child.graphics instanceof PIXI.Container) {
        // For containers, check if any of its display objects contain the point
        try {
          // Use PIXI's built-in hit test for containers
          const bounds = child.graphics.getLocalBounds();
          return (
            relativePoint.x >= bounds.x &&
            relativePoint.x <= bounds.x + bounds.width &&
            relativePoint.y >= bounds.y &&
            relativePoint.y <= bounds.y + bounds.height
          );
        } catch (error) {
          // Fallback: assume container is hit if point is within reasonable bounds
          return false;
        }
      }
      return false;
    }

    default: {
      return false;
    }
  }
};

// Point-in-polygon algorithm (ray casting)
export const pointInPolygon = (
  point: PIXI.Point,
  polygonPoints: Array<{ x: number; y: number }>
): boolean => {
  const x = point.x;
  const y = point.y;
  let inside = false;

  for (
    let i = 0, j = polygonPoints.length - 1;
    i < polygonPoints.length;
    j = i++
  ) {
    const xi = polygonPoints[i].x;
    const yi = polygonPoints[i].y;
    const xj = polygonPoints[j].x;
    const yj = polygonPoints[j].y;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
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

export const clearAllSelections = () => {
  const clearShapeSelection = (shape: CanvasItem) => {
    shape.selected = false;
    if (shape.type === "container") {
      const container = shape as ContainerGroup;
      container.children.forEach(clearShapeSelection);
    }
  };

  shapes.forEach(clearShapeSelection);
};

export const deleteShape = (shapeId: string) => {
  const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  if (shapeIndex !== -1) {
    const shape = shapes[shapeIndex];
    const eventManager = getEventManager();
    if (eventManager) {
      eventManager.removeShapeEvents(shape);
    }
    if (shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
      shape.graphics.destroy();
    }
    shapes.splice(shapeIndex, 1);
    useSeatMapStore.getState().updateShapes(shapes);
  }
};

export const deleteShapes = () => {
  const eventManager = getEventManager();
  shapes.forEach((shape) => {
    if (shape.selected) {
      // Remove event listeners
      if (eventManager) {
        eventManager.removeShapeEvents(shape);
      }

      // Remove from stage
      if (shapeContainer && shape.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(shape.graphics);
      }

      // Destroy graphics
      shape.graphics.destroy();
    }
  });
  setShapes(shapes.filter((shape) => !shape.selected));
  useSeatMapStore.getState().deleteShapes();
};

export const clearCanvas = () => {
  const eventManager = getEventManager();

  shapes.forEach((shape) => {
    // Remove event listeners
    if (eventManager) {
      eventManager.removeShapeEvents(shape);
    }

    // Remove from stage
    if (shapeContainer && shape.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
    }

    // Destroy graphics
    shape.graphics.destroy();
  });
  shapes.length = 0;

  useSeatMapStore.getState().updateShapes(shapes);
  useSeatMapStore.getState().setSelectedShapes([]);
};
