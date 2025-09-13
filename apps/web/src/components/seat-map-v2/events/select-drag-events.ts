import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup } from "../types";
import {
  currentTool,
  selectedContainer,
  setPreviouslyClickedShape,
  setSelectedContainer,
  shapes,
  stage,
  setWasDragged,
  isShapeDragging,
  shapeDragStart,
  draggedShapes,
  originalPositions,
  originalPolygonPoints,
  setIsShapeDragging,
  setShapeDragStart,
  setDraggedShapes,
  setOriginalPositions,
  setOriginalPolygonPoints,
} from "../variables";
import {
  clearAllSelections,
  findTopmostChildAtPoint,
  getContainerPath,
  areInSameContainer,
  getCurrentContainer,
  findShapeAtPoint,
  findParentContainer,
  updatePolygonGraphics,
} from "../shapes/index";
import { useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "./transform-events";

export const handleShapeSelection = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  const isMultiSelect = event.ctrlKey || event.metaKey;
  const currentlySelectedShapes = useSeatMapStore.getState().selectedShapes;

  if (!isMultiSelect && currentlySelectedShapes.length === 1) {
    const previousShape = currentlySelectedShapes[0];
    if (previousShape.id === shape.id) {
      return;
    }
  } else {
    if (isMultiSelect) {
      shape.selected = !shape.selected;
    } else {
      clearAllSelections();
      shape.selected = true;

      const shapePath = getContainerPath(shape);
      if (shapePath.length > 0) {
        setSelectedContainer(shapePath.slice(0, -1));
      } else {
        setSelectedContainer([]);
      }
    }

    const allSelectedShapes = getAllSelectedShapes();
    useSeatMapStore.getState().setSelectedShapes(allSelectedShapes);
  }

  useSeatMapStore.getState().updateShapes([...shapes]);

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    const selectedShapes = useSeatMapStore.getState().selectedShapes;
    selectionTransform.updateSelection(selectedShapes);
  }

  setPreviouslyClickedShape(shape);
};

export const onStageClick = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool === "select") {
    clearAllSelections();
    setPreviouslyClickedShape(null);
    setSelectedContainer([]);
    useSeatMapStore.getState().setSelectedShapes([]);
    useSeatMapStore.getState().updateShapes([...shapes]);

    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection([]);
    }
  }
};

export const handleDoubleClick = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  if (shape.type === "container") {
    const container = shape as ContainerGroup;
    const newPath = [...selectedContainer, container];
    setSelectedContainer(newPath);

    // Find the child shape that was actually clicked
    const hitChild = findTopmostChildAtPoint(container, event);

    // Clear all selections first
    clearAllSelections();

    if (hitChild) {
      // Select the child shape that was clicked
      hitChild.selected = true;
      useSeatMapStore.getState().setSelectedShapes([hitChild]);

      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([hitChild]);
      }

      setPreviouslyClickedShape(shape);
    } else {
      // No child was hit, just enter the container without selecting anything
      useSeatMapStore.getState().setSelectedShapes([]);

      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([]);
      }
      setPreviouslyClickedShape(null);
    }

    useSeatMapStore.getState().updateShapes([...shapes]);
  } else {
    handleShapeSelection(event, shape);
  }
};

export const startShapeDrag = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  if (!stage) return;

  const selectionTransform = getSelectionTransform();
  if (selectionTransform?.isCurrentlyTransforming) return;

  const isMultiSelect = event.ctrlKey || event.metaKey;

  if (isMultiSelect) {
    if (shape.selected) {
      const getAllSelectedIncludingNested = () => {
        const selectedShapes: CanvasItem[] = [];
        const addSelectedRecursively = (items: CanvasItem[]) => {
          items.forEach((item) => {
            if (item.selected) {
              selectedShapes.push(item);
            }
            if (item.type === "container") {
              addSelectedRecursively((item as ContainerGroup).children);
            }
          });
        };
        addSelectedRecursively(shapes);
        return selectedShapes;
      };
      setDraggedShapes(getAllSelectedIncludingNested());
    } else {
      return;
    }
  } else {
    setPreviouslyClickedShape(
      useSeatMapStore.getState().selectedShapes[0] || null
    );
    clearAllSelections();
    shape.selected = true;
    setDraggedShapes([shape]);

    useSeatMapStore.getState().setSelectedShapes([shape]);
    useSeatMapStore.getState().updateShapes([...shapes]);

    if (selectionTransform) {
      selectionTransform.updateSelection([shape]);
    }
  }

  const localPoint = event.getLocalPosition(stage);
  setIsShapeDragging(true);
  setShapeDragStart({ x: localPoint.x, y: localPoint.y });

  setOriginalPositions(
    draggedShapes.map((s) => ({
      x: s.x,
      y: s.y,
    }))
  );

  setOriginalPolygonPoints(
    draggedShapes.map((s) => {
      if (s.type === "polygon" && s.points) {
        return s.points.map((point) => ({ x: point.x, y: point.y }));
      }
      return [];
    })
  );
};

export const handleShapeDrag = (event: PIXI.FederatedPointerEvent) => {
  if (!isShapeDragging || !shapeDragStart || !stage) return;

  const currentPoint = event.getLocalPosition(stage);
  const deltaX = currentPoint.x - shapeDragStart.x;
  const deltaY = currentPoint.y - shapeDragStart.y;

  draggedShapes.forEach((shape, index) => {
    const original = originalPositions[index];

    if (
      shape.type === "polygon" &&
      shape.points &&
      originalPolygonPoints[index]
    ) {
      const originalPoints = originalPolygonPoints[index];

      // For polygons, we need to handle both the shape position and the point positions
      const parentContainer = findParentContainer(shape);

      if (parentContainer) {
        // Shape is in a container - work in container coordinates
        // The original positions are already in container coordinates
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        // Update polygon points relative to the new shape position
        shape.points = originalPoints.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
          radius: point.radius,
        }));

        // Set graphics position relative to container
        shape.graphics.position.set(shape.x, shape.y);
      } else {
        // Shape is at root level - work in world coordinates
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        // Update polygon points
        shape.points = originalPoints.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
          radius: point.radius,
        }));

        // Set graphics position on stage
        shape.graphics.position.set(shape.x, shape.y);
      }

      updatePolygonGraphics(shape);
    } else {
      const parentContainer = findParentContainer(shape);

      if (parentContainer) {
        // Shape is in a container - work in container coordinates
        // The original positions are already in container coordinates
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        // Set graphics position relative to container
        shape.graphics.position.set(shape.x, shape.y);
      } else {
        // Shape is at root level - work in world coordinates
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        // Set graphics position on stage
        shape.graphics.position.set(shape.x, shape.y);
      }
    }
  });

  const selectionTransform = getSelectionTransform();
  if (selectionTransform && draggedShapes.length > 0) {
    selectionTransform.updateSelection(draggedShapes);
  }
};

export const endShapeDrag = () => {
  if (!isShapeDragging) return;

  setIsShapeDragging(false);
  setShapeDragStart(null);
  setDraggedShapes([]);
  setOriginalPositions([]);
  setOriginalPolygonPoints([]);

  setWasDragged(true);

  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  useSeatMapStore.getState().setSelectedShapes([...selectedShapes]);
  useSeatMapStore.getState().updateShapes([...shapes]);
};

export const isCurrentlyShapeDragging = (): boolean => {
  return isShapeDragging;
};

export const onShapePointerDown = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  event.stopPropagation();

  if (currentTool === "select") {
    const currentContainer = getCurrentContainer();
    const actualShape = resolveShapeForContext(shape, currentContainer, event);

    startShapeDrag(event, actualShape);
  }
};

export const onShapePointerUp = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem,
  lastClickTime: number,
  lastClickTarget: CanvasItem | null,
  doubleClickThreshold: number = 300
) => {
  event.stopPropagation();

  if (currentTool === "select") {
    const selectionTransform = getSelectionTransform();
    if (selectionTransform?.isCurrentlyTransforming) {
      selectionTransform.onTransformPointerUp();
    }

    const currentContainer = getCurrentContainer();
    const actualShape = resolveShapeForContext(shape, currentContainer, event);

    const currentTime = Date.now();
    const isDoubleClick =
      lastClickTarget?.id === shape.id &&
      currentTime - lastClickTime < doubleClickThreshold;

    if (isDoubleClick) {
      handleDoubleClick(event, actualShape);
    } else {
      handleShapeSelection(event, actualShape);
    }
    if (isCurrentlyShapeDragging()) {
      endShapeDrag();
    }

    return { currentTime, actualShape: shape };
  }

  return { currentTime: Date.now(), actualShape: shape };
};

const getAllSelectedShapes = (): CanvasItem[] => {
  const selected: CanvasItem[] = [];

  const collectSelected = (shape: CanvasItem) => {
    if (shape.selected) {
      selected.push(shape);
    }
    if (shape.type === "container") {
      const container = shape as ContainerGroup;
      container.children.forEach(collectSelected);
    }
  };

  shapes.forEach(collectSelected);
  return selected;
};

const resolveShapeForContext = (
  clickedShape: CanvasItem,
  currentContainer: ContainerGroup | null,
  event: PIXI.FederatedPointerEvent
): CanvasItem => {
  if (!currentContainer) {
    return clickedShape;
  }

  const hitChild = findShapeAtPoint(event, currentContainer);
  return hitChild || clickedShape;
};
