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
  setShapes,
} from "../variables";
import {
  clearAllSelections,
  findTopmostChildAtPoint,
  getContainerPath,
  getCurrentContainer,
  findShapeAtPoint,
  findParentContainer,
  updatePolygonGraphics,
  findShapeAtPointWithStrategy,
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

    // ✅ Update selection without saving history
    useSeatMapStore.getState().setSelectedShapes(allSelectedShapes, false);
  }

  // ✅ Update shapes without saving history
  setShapes([...shapes]);
  useSeatMapStore.getState().updateShapes([...shapes], false);

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

    // ✅ Clear selection without saving history
    useSeatMapStore.getState().setSelectedShapes([], false);
    setShapes([...shapes]);
    useSeatMapStore.getState().updateShapes([...shapes], false);

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
    const hitChild = findTopmostChildAtPoint(container, event);
    clearAllSelections();

    if (hitChild) {
      hitChild.selected = true;

      // ✅ Update selection without saving history
      useSeatMapStore.getState().setSelectedShapes([hitChild], false);

      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([hitChild]);
      }

      setPreviouslyClickedShape(shape);
    } else {
      // ✅ Clear selection without saving history
      useSeatMapStore.getState().setSelectedShapes([], false);

      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([]);
      }
      setPreviouslyClickedShape(hitChild);
    }

    // ✅ Update shapes without saving history
    setShapes([...shapes]);
    useSeatMapStore.getState().updateShapes([...shapes], false);
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

    // ✅ Update selection without saving history (drag already saved)
    useSeatMapStore.getState().setSelectedShapes([shape], false);
    setShapes([...shapes]);
    useSeatMapStore.getState().updateShapes([...shapes], false);

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
    const parentContainer = findParentContainer(shape);

    if (parentContainer) {
      // Convert world delta to container's local coordinate system
      const localDelta = worldDeltaToContainerLocal(
        deltaX,
        deltaY,
        parentContainer
      );

      if (
        shape.type === "polygon" &&
        shape.points &&
        originalPolygonPoints[index]
      ) {
        const originalPoints = originalPolygonPoints[index];

        shape.x = original.x + localDelta.x;
        shape.y = original.y + localDelta.y;

        shape.points = originalPoints.map((point) => ({
          x: point.x,
          y: point.y,
          radius: point.radius,
        }));

        shape.graphics.position.set(shape.x, shape.y);
        updatePolygonGraphics(shape);
      } else if (shape.type === "svg") {
        // Special handling for SVG shapes due to pivot
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        // Update graphics position directly
        shape.graphics.position.set(shape.x, shape.y);
      } else {
        shape.x = original.x + localDelta.x;
        shape.y = original.y + localDelta.y;
        shape.graphics.position.set(shape.x, shape.y);
      }
    } else {
      // Shape is at root level - use world coordinates directly
      if (
        shape.type === "polygon" &&
        shape.points &&
        originalPolygonPoints[index]
      ) {
        const originalPoints = originalPolygonPoints[index];

        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        shape.points = originalPoints.map((point) => ({
          x: point.x,
          y: point.y,
          radius: point.radius,
        }));

        shape.graphics.position.set(shape.x, shape.y);
        updatePolygonGraphics(shape);
      } else {
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;
        shape.graphics.position.set(shape.x, shape.y);
      }
    }
  });

  const selectionTransform = getSelectionTransform();
  if (selectionTransform && draggedShapes.length > 0) {
    selectionTransform.updateSelection(draggedShapes);
  }
};

// Helper function to convert world delta to container's local coordinate system
function worldDeltaToContainerLocal(
  worldDeltaX: number,
  worldDeltaY: number,
  container: ContainerGroup
): { x: number; y: number } {
  // Calculate the accumulated rotation of all parent containers
  let totalRotation = 0;
  let totalScaleX = 1;
  let totalScaleY = 1;

  let currentContainer: ContainerGroup | null = container;
  while (currentContainer) {
    totalRotation += currentContainer.rotation || 0;
    totalScaleX *= currentContainer.scaleX || 1;
    totalScaleY *= currentContainer.scaleY || 1;
    currentContainer = findParentContainer(currentContainer);
  }

  // Apply inverse transforms to convert world delta to local delta

  // First, apply inverse scaling
  const scaledDeltaX = worldDeltaX / totalScaleX;
  const scaledDeltaY = worldDeltaY / totalScaleY;

  // Then, apply inverse rotation
  const cos = Math.cos(-totalRotation); // Negative for inverse rotation
  const sin = Math.sin(-totalRotation);

  const localDeltaX = scaledDeltaX * cos - scaledDeltaY * sin;
  const localDeltaY = scaledDeltaX * sin + scaledDeltaY * cos;

  return {
    x: localDeltaX,
    y: localDeltaY,
  };
}

export const endShapeDrag = () => {
  if (!isShapeDragging) return;

  setIsShapeDragging(false);
  setShapeDragStart(null);
  setDraggedShapes([]);
  setOriginalPositions([]);
  setOriginalPolygonPoints([]);

  setWasDragged(true);

  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  useSeatMapStore.getState().setSelectedShapes([...selectedShapes], true);
  setShapes([...shapes]);
  useSeatMapStore.getState().updateShapes([...shapes], true);
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
  const resolvedChild = findShapeAtPointWithStrategy(
    currentContainer,
    event,
    "container-first"
  );

  return resolvedChild || clickedShape;
};
