import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  EllipseShape,
  PolygonShape,
  RectangleShape,
  SeatShape,
  SVGShape,
} from "../types";
import {
  shapeContainer,
  shapes,
  addShape,
  stage,
  selectedContainer,
  setShapes,
  areaModeContainer,
  isAreaMode,
} from "../variables";
import { cloneCanvasItems, useSeatMapStore } from "../store/seat-map-store";
import { getEventManager } from "../events/event-manager";
import { v4 as uuidv4 } from "uuid";
import { getSelectionTransform } from "../events/transform-events";
import { removeSeatsFromGrid } from "./grid-shape";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";
import {
  getRowByIdFromAllGrids,
  updateMultipleRowLabelRotations,
  updateRowLabelPosition,
  updateRowLabelRotation,
  updateSeatLabelNumberingInRow,
} from "./row-shape";
export { createRectangle } from "./rectangle-shape";
export { createEllipse } from "./ellipse-shape";
export { createText } from "./text-shape";
export { updatePolygonGraphics } from "./polygon-shape";
export { createSeat, updateSeatGraphics } from "./seat-shape";

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

export const findShapeInContainerRecursive = (
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
// Same same but different
export const findShapeRecursively = (
  shapes: CanvasItem[],
  targetId: string
): CanvasItem | null => {
  for (const shape of shapes) {
    if (shape.id === targetId) {
      return shape;
    }
    if (shape.type === "container") {
      const found = findShapeRecursively(
        (shape as ContainerGroup).children,
        targetId
      );
      if (found) return found;
    }
  }
  return null;
};

export const findShapeAndParentRecursively = (
  shapes: CanvasItem[],
  targetId: string,
  parent: ContainerGroup | null = null
): { shape: CanvasItem; parent: ContainerGroup | null } | null => {
  for (const shape of shapes) {
    if (shape.id === targetId) {
      return { shape, parent };
    }
    if (shape.type === "container") {
      const found = findShapeAndParentRecursively(
        (shape as ContainerGroup).children,
        targetId,
        shape as ContainerGroup
      );
      if (found) return found;
    }
  }
  return null;
};

export const findContainerRecursively = (
  searchShapes: CanvasItem[],
  targetId: string
): ContainerGroup | null => {
  for (const shape of searchShapes) {
    if (shape.id === targetId && shape.type === "container") {
      return shape as ContainerGroup;
    }
    if (shape.type === "container") {
      const found = findContainerRecursively(
        (shape as ContainerGroup).children,
        targetId
      );
      if (found) return found;
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

export const getWorldCoordinates = (
  shape: CanvasItem
): { x: number; y: number } => {
  let worldX = shape.x;
  let worldY = shape.y;
  let currentContainer = findParentContainer(shape);

  while (currentContainer) {
    const { rotation = 0, scaleX = 1, scaleY = 1 } = currentContainer;

    const scaledX = worldX * scaleX;
    const scaledY = worldY * scaleY;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;

    worldX = currentContainer.x + rotatedX;
    worldY = currentContainer.y + rotatedY;

    currentContainer = findParentContainer(currentContainer);
  }

  return { x: worldX, y: worldY };
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
    if (!shape.visible) continue;

    if (hitTestChild(shape, worldPoint)) return shape;
  }
  return null;
};

export const findShapeById = (id: string): CanvasItem | null => {
  const findInShapes = (shapeList: CanvasItem[]): CanvasItem | null => {
    for (const shape of shapeList) {
      if (shape.id === id) {
        return shape;
      }
      if (shape.type === "container") {
        const container = shape as ContainerGroup;
        const found = findInShapes(container.children);
        if (found) return found;
      }
    }
    return null;
  };

  return findInShapes(shapes);
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
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  if (selectedShapes.length === 0) return;

  const originalShapes = cloneCanvasItems(shapes);
  const seatsToRemove: string[] = [];
  const affectedRowIds = new Set<string>();

  // ✅ Enhanced context tracking for hierarchical deletions
  const findShapeContext = (
    targetId: string,
    shapeList: CanvasItem[],
    parentId: string | null = null
  ): {
    shape: CanvasItem | null;
    parentId: string | null;
    isTopLevel: boolean;
    isAreaModeNested: boolean;
  } => {
    for (const shape of shapeList) {
      if (shape.id === targetId) {
        return {
          shape,
          parentId,
          isTopLevel: parentId === null,
          isAreaModeNested: isAreaMode,
        };
      }

      // ✅ Handle area mode container specially
      if (shape.id === "area-mode-container-id" && areaModeContainer) {
        // Search in grids
        for (const grid of areaModeContainer.children) {
          if (grid.id === targetId) {
            return {
              shape: grid,
              parentId: areaModeContainer.id,
              isTopLevel: false,
              isAreaModeNested: true,
            };
          }

          // Search in rows within grids
          for (const row of grid.children) {
            if (row.id === targetId) {
              return {
                shape: row,
                parentId: grid.id,
                isTopLevel: false,
                isAreaModeNested: true,
              };
            }

            // Search in seats within rows
            for (const seat of row.children) {
              if (seat.id === targetId) {
                return {
                  shape: seat,
                  parentId: row.id,
                  isTopLevel: false,
                  isAreaModeNested: true,
                };
              }
            }
          }
        }
      }

      // Regular container search
      if (shape.type === "container") {
        const found = findShapeContext(
          targetId,
          (shape as any).children,
          shape.id
        );
        if (found.shape) {
          return found;
        }
      }
    }

    return {
      shape: null,
      parentId: null,
      isTopLevel: false,
      isAreaModeNested: false,
    };
  };

  // ✅ Enhanced context building
  const context = {
    topLevel: [] as Array<{
      id: string;
      type: string;
      parentId: string | null;
    }>,
    nested: [] as Array<{
      id: string;
      type: string;
      parentId: string | null;
    }>,
    operation: "delete",
  };

  const selectedShapesToDelete: Array<{
    shape: CanvasItem;
    parent: ContainerGroup | null;
    context: ReturnType<typeof findShapeContext>;
  }> = [];

  // ✅ Build deletion context with hierarchy awareness
  selectedShapes.forEach((selectedShape) => {
    const shapeContext = findShapeContext(selectedShape.id, shapes);

    if (shapeContext.shape) {
      selectedShapesToDelete.push({
        shape: shapeContext.shape,
        parent: shapeContext.parentId
          ? (findShapeRecursively(
              shapes,
              shapeContext.parentId
            ) as ContainerGroup)
          : null,
        context: shapeContext,
      });

      // ✅ Track seats and affected rows
      if (
        shapeContext.shape.type === "ellipse" &&
        (shapeContext.shape as any).rowId &&
        (shapeContext.shape as any).gridId
      ) {
        const seat = shapeContext.shape as SeatShape;
        seatsToRemove.push(seat.id);
        affectedRowIds.add(seat.rowId);
      }

      // ✅ Track seats in deleted rows
      if (
        shapeContext.shape.type === "container" &&
        (shapeContext.shape as any).rowName
      ) {
        const row = shapeContext.shape as any;
        row.children?.forEach((seat: SeatShape) => {
          seatsToRemove.push(seat.id);
        });
        affectedRowIds.add(row.id);
      }

      // ✅ Track seats in deleted grids
      if (
        shapeContext.shape.type === "container" &&
        (shapeContext.shape as any).gridName
      ) {
        const grid = shapeContext.shape as any;
        grid.children?.forEach((row: any) => {
          affectedRowIds.add(row.id);
          row.children?.forEach((seat: SeatShape) => {
            seatsToRemove.push(seat.id);
          });
        });
      }

      // ✅ Add to appropriate context category
      if (shapeContext.isTopLevel) {
        context.topLevel.push({
          id: shapeContext.shape.id,
          type: shapeContext.shape.type,
          parentId: null,
        });
      } else {
        context.nested.push({
          id: shapeContext.shape.id,
          type: shapeContext.shape.type,
          parentId: shapeContext.parentId!,
        });
      }
    }
  });

  // ✅ Handle area mode deletions with hierarchy
  const handleAreaModeDeletion = (
    shape: CanvasItem,
    parentShape: CanvasItem | null
  ) => {
    if (!areaModeContainer) return;

    // Remove from area mode container structure
    if (parentShape?.id === areaModeContainer.id) {
      // Removing a grid
      const gridIndex = areaModeContainer.children.findIndex(
        (g) => g.id === shape.id
      );
      if (gridIndex !== -1) {
        areaModeContainer.children.splice(gridIndex, 1);
        if (shape.graphics.parent) {
          shape.graphics.parent.removeChild(shape.graphics);
        }
      }
    } else {
      // Find and remove from nested structure
      for (const grid of areaModeContainer.children) {
        if (parentShape?.id === grid.id) {
          // Removing a row
          const rowIndex = grid.children.findIndex((r) => r.id === shape.id);
          if (rowIndex !== -1) {
            grid.children.splice(rowIndex, 1);
            if (shape.graphics.parent) {
              shape.graphics.parent.removeChild(shape.graphics);
            }
          }
          break;
        }

        for (const row of grid.children) {
          if (parentShape?.id === row.id) {
            // Removing a seat
            const seatIndex = row.children.findIndex((s) => s.id === shape.id);
            if (seatIndex !== -1) {
              row.children.splice(seatIndex, 1);
              if (shape.graphics.parent) {
                shape.graphics.parent.removeChild(shape.graphics);
              }
            }
            break;
          }
        }
      }
    }
  };

  // ✅ Perform deletions with hierarchy handling
  selectedShapesToDelete.forEach(({ shape, parent, context: shapeContext }) => {
    if (eventManager) {
      eventManager.removeShapeEvents(shape);
    }

    // ✅ Handle area mode nested deletions
    if (shapeContext.isAreaModeNested) {
      handleAreaModeDeletion(shape, parent);
    }
    // Handle regular container deletions
    else if (parent) {
      const index = parent.children.findIndex((child) => child.id === shape.id);
      if (index !== -1) {
        parent.children.splice(index, 1);
      }

      if (shape.graphics && shape.graphics.parent) {
        shape.graphics.parent.removeChild(shape.graphics);
      }
    }
    // Handle top-level deletions
    else {
      if (shape.graphics && shape.graphics.parent) {
        shape.graphics.parent.removeChild(shape.graphics);
      }

      const index = shapes.findIndex((s) => s.id === shape.id);
      if (index !== -1) {
        shapes.splice(index, 1);
      }
    }
  });
  // ✅ Update affected row labels after deletions
  if (affectedRowIds.size > 0) {
    affectedRowIds.forEach((rowId) => {
      const row = getRowByIdFromAllGrids(rowId);
      if (row && row.children.length > 0) {
        // Only update rows that still have seats
        updateRowLabelPosition(row);
        updateRowLabelRotation(row);
        updateSeatLabelNumberingInRow(row, "numerical");
      }
    });
  }

  // ✅ Clean up empty containers
  const cleanupEmptyContainers = () => {
    if (!areaModeContainer) return;

    // Remove empty rows from grids
    areaModeContainer.children.forEach((grid) => {
      grid.children = grid.children.filter((row) => row.children.length > 0);
    });

    // Remove empty grids
    areaModeContainer.children = areaModeContainer.children.filter(
      (grid) => grid.children.length > 0
    );
  };

  cleanupEmptyContainers();

  setShapes([...shapes]);

  // ✅ Save to history with enhanced context
  const action = useSeatMapStore.getState()._saveToHistory(
    {
      shapes: selectedShapesToDelete.map((item) => item.shape),
      selectedShapes: selectedShapes,
      context,
    },
    {
      shapes: [],
      selectedShapes: [],
      context: { topLevel: [], nested: [], operation: "delete" },
    }
  );

  SeatMapCollaboration.broadcastShapeChange(action);

  // ✅ Update store shapes
  useSeatMapStore.getState().updateShapes([...shapes], false, context, false);

  // ✅ Clear selection
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection([]);
  }

  useSeatMapStore.getState().setSelectedShapes([]);
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
