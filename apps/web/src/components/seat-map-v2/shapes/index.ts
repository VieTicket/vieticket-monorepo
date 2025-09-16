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

export const updateNestedShapes = (shapesToUpdate: CanvasItem[]) => {
  useSeatMapStore.getState().updateShapes([...shapes]);

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

        if (
          containerGroup.children.some((child) => child.id === targetShape.id)
        ) {
          path.push(...newPath);
          return true;
        }

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

export const areInSameContainer = (
  shape1: CanvasItem,
  shape2: CanvasItem
): boolean => {
  const path1 = getContainerPath(shape1);
  const path2 = getContainerPath(shape2);

  if (path1.length === 0 && path2.length === 0) {
    return true;
  }

  if (path1.length !== path2.length) {
    return false;
  }

  for (let i = 0; i < path1.length; i++) {
    if (path1[i].id !== path2[i].id) {
      return false;
    }
  }

  return true;
};

export const getCurrentContainer = (): ContainerGroup | null => {
  if (selectedContainer.length === 0) return null;
  return selectedContainer[selectedContainer.length - 1];
};

export const findShapeAtPoint = (
  event: PIXI.FederatedPointerEvent,
  currentContainer: ContainerGroup | null = null
): CanvasItem | null => {
  if (currentContainer) {
    return findTopmostChildAtPoint(currentContainer, event);
  } else {
    // Check root level shapes using bounds-based hit testing
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];

      if (!shape.visible || shape.graphics.alpha === 0) continue;

      // Convert global point to stage local coordinates
      const stagePoint = stage ? stage.toLocal(event.global) : event.global;

      if (isPointInShapeBounds(stagePoint, shape)) {
        return shape;
      }
    }
  }

  return null;
};

export const findTopmostChildAtPoint = (
  container: ContainerGroup,
  event: PIXI.FederatedPointerEvent | PIXI.Point
): CanvasItem | null => {
  let localPoint: PIXI.Point;

  if (event instanceof PIXI.Point) {
    localPoint = event;
  } else {
    // Convert global point to container's local coordinates
    localPoint = container.graphics.toLocal(event.global);
  }

  // Iterate through children in reverse order (top to bottom rendering)
  for (let i = container.children.length - 1; i >= 0; i--) {
    const child = container.children[i];

    if (!child.visible || child.graphics.alpha === 0) continue;

    if (hitTestChild(child, localPoint)) {
      if (child.type === "container") {
        // Recursively check nested containers
        const childLocalPoint = child.graphics.toLocal(
          container.graphics.toGlobal(localPoint)
        );
        const nestedHit = findTopmostChildAtPoint(
          child as ContainerGroup,
          childLocalPoint
        );
        return nestedHit || child;
      }
      return child;
    }
  }

  return null;
};

// Helper function to check if a point is within a shape's bounds
const isPointInShapeBounds = (
  point: PIXI.Point,
  shape: CanvasItem
): boolean => {
  const localPoint = shape.graphics.toLocal(
    shape.graphics.parent?.toGlobal(point) || point
  );
  return hitTestChild(shape, localPoint);
};

// Keep hitTestChild as the main hit testing method
export const hitTestChild = (child: CanvasItem, point: PIXI.Point): boolean => {
  // Calculate relative point based on child's position
  let relativePoint: { x: number; y: number };

  // For shapes inside containers, point is already in container space
  const parentContainer = findParentContainer(child);

  if (parentContainer) {
    // Child is in a container - point is in container's coordinate space
    relativePoint = {
      x: point.x - child.x,
      y: point.y - child.y,
    };
  } else {
    // Child is at root level
    relativePoint = {
      x: point.x - child.x,
      y: point.y - child.y,
    };
  }

  switch (child.type) {
    case "rectangle": {
      const rect = child as RectangleShape;
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
      const dx = relativePoint.x / ellipse.radiusX;
      const dy = relativePoint.y / ellipse.radiusY;
      return dx * dx + dy * dy <= 1;
    }

    case "text": {
      if (child.graphics instanceof PIXI.Text) {
        // For text, use the bounds from the graphics
        const bounds = child.graphics.getLocalBounds();
        // Adjust for anchor point (text is anchored at center)
        const adjustedX = relativePoint.x + bounds.width / 2;
        const adjustedY = relativePoint.y + bounds.height / 2;

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
      // For polygons, points are already relative to the polygon's center
      return pointInPolygon(
        new PIXI.Point(relativePoint.x, relativePoint.y),
        polygon.points
      );
    }

    case "container": {
      if (child.graphics instanceof PIXI.Container) {
        try {
          // For containers, use the bounds of their contents
          const bounds = child.graphics.getLocalBounds();
          return (
            relativePoint.x >= bounds.x &&
            relativePoint.x <= bounds.x + bounds.width &&
            relativePoint.y >= bounds.y &&
            relativePoint.y <= bounds.y + bounds.height
          );
        } catch (error) {
          // Fallback: assume a small area around the container center
          return (
            Math.abs(relativePoint.x) <= 25 && Math.abs(relativePoint.y) <= 25
          );
        }
      }
      return false;
    }

    default: {
      return false;
    }
  }
};

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
      if (eventManager) {
        eventManager.removeShapeEvents(shape);
      }

      if (shapeContainer && shape.graphics.parent === shapeContainer) {
        shapeContainer.removeChild(shape.graphics);
      }

      shape.graphics.destroy();
    }
  });
  setShapes(shapes.filter((shape) => !shape.selected));
  useSeatMapStore.getState().deleteShapes();
};

export const clearCanvas = () => {
  const eventManager = getEventManager();

  shapes.forEach((shape) => {
    if (eventManager) {
      eventManager.removeShapeEvents(shape);
    }

    if (shapeContainer && shape.graphics.parent === shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
    }

    shape.graphics.destroy();
  });
  shapes.length = 0;

  useSeatMapStore.getState().updateShapes(shapes);
  useSeatMapStore.getState().setSelectedShapes([]);
};
