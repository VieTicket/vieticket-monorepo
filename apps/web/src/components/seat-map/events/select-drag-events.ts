import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup, PolygonShape } from "../types";
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
  isAreaMode,
  areaModeContainer,
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
import { cloneCanvasItems, useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "./transform-events";
import { onDrawStart } from "./draw-events";
import { onPolygonStart } from "./polygon-events";

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
      const shapePath = getContainerPath(shape);
      if (shapePath.length > 0) {
        setSelectedContainer(shapePath.slice(0, -1));
      } else {
        setSelectedContainer([]);
      }
    }

    const allSelectedShapes = getAllSelectedShapes();
    useSeatMapStore.getState().setSelectedShapes(allSelectedShapes, false);
  }
  setShapes([...shapes]);
  useSeatMapStore.getState().updateShapes([...shapes], false);

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    const selectedShapes = useSeatMapStore.getState().selectedShapes;
    selectionTransform.updateSelection(selectedShapes);
  }

  setPreviouslyClickedShape(shape);
};

export const onStageClick = () => {
  if (currentTool === "select") {
    clearAllSelections();
    setPreviouslyClickedShape(null);
    setSelectedContainer([]);
    const selectedShapes = useSeatMapStore.getState().selectedShapes;

    if (selectedShapes.length > 0) {
      useSeatMapStore.getState().setSelectedShapes([], false);
      setShapes([...shapes]);
      useSeatMapStore.getState().updateShapes([...shapes], false);
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([]);
      }
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

      useSeatMapStore.getState().setSelectedShapes([hitChild], false);

      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([hitChild]);
      }

      setPreviouslyClickedShape(shape);
      console.log("hitChild", hitChild);
    } else {
      useSeatMapStore.getState().setSelectedShapes([], false);

      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection([]);
      }
      setPreviouslyClickedShape(hitChild);
    }

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
      setDraggedShapes(getAllSelectedIncludingNested());
    } else {
      return;
    }
  } else {
    let selectedNested;

    if (shape.selected) {
      setDraggedShapes(getAllSelectedIncludingNested());
    } else if (
      isAreaMode &&
      (selectedNested = getAllSelectedIncludingNested()).length > 0 &&
      ("gridName" in selectedNested[0] || "rowName" in selectedNested[0])
    ) {
      setDraggedShapes(selectedNested);
    } else {
      setPreviouslyClickedShape(
        useSeatMapStore.getState().selectedShapes[0] || null
      );
      clearAllSelections();
      shape.selected = true;
      setDraggedShapes([shape]);

      useSeatMapStore.getState().setSelectedShapes([shape], false);
      setShapes([...shapes]);
      useSeatMapStore.getState().updateShapes([...shapes], false);

      if (selectionTransform) {
        selectionTransform.updateSelection([shape]);
      }
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
        shape.x = original.x + deltaX;
        shape.y = original.y + deltaY;

        shape.graphics.position.set(shape.x, shape.y);
      } else {
        shape.x = original.x + localDelta.x;
        shape.y = original.y + localDelta.y;
        shape.graphics.position.set(shape.x, shape.y);
      }
    } else {
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
function worldDeltaToContainerLocal(
  worldDeltaX: number,
  worldDeltaY: number,
  container: ContainerGroup
): { x: number; y: number } {
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

  const scaledDeltaX = worldDeltaX / totalScaleX;
  const scaledDeltaY = worldDeltaY / totalScaleY;

  const cos = Math.cos(-totalRotation);
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
  const afterDragShapes = draggedShapes;
  const beforeDragShapes = cloneCanvasItems(draggedShapes);

  for (let index = 0; index < draggedShapes.length; index++) {
    beforeDragShapes[index].x = originalPositions[index].x;
    beforeDragShapes[index].y = originalPositions[index].y;

    if (
      draggedShapes[index].type === "polygon" &&
      originalPolygonPoints[index]
    ) {
      (beforeDragShapes[index] as PolygonShape).points = originalPolygonPoints[
        index
      ].map((p) => ({ ...p }));
    }
  }

  setIsShapeDragging(false);
  setShapeDragStart(null);
  setDraggedShapes([]);
  setOriginalPositions([]);
  setOriginalPolygonPoints([]);
  setWasDragged(true);
  useSeatMapStore.getState().setSelectedShapes([...afterDragShapes], false);
  setShapes([...shapes]);
  useSeatMapStore.getState().updateShapes([...shapes], false);
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(afterDragShapes);
  }

  let hasMoved = false;
  for (let i = 0; i < beforeDragShapes.length; i++) {
    const before = beforeDragShapes[i];
    const after = afterDragShapes[i];

    if (Math.abs(before.x - after.x) > 2 || Math.abs(before.y - after.y) > 2) {
      hasMoved = true;
      break;
    }
  }

  if (hasMoved) {
    useSeatMapStore
      .getState()
      .saveDirectHistory(beforeDragShapes, afterDragShapes);
  }
};

export const isCurrentlyShapeDragging = (): boolean => {
  return isShapeDragging;
};

export const onShapePointerDown = (
  event: PIXI.FederatedPointerEvent,
  shape: CanvasItem
) => {
  event.stopPropagation();
  switch (currentTool) {
    case "rectangle":
    case "ellipse":
    case "text":
      onDrawStart(event);
      break;
    case "polygon":
      onPolygonStart(event);
      break;

    case "select": {
      const currentContainer = getCurrentContainer();
      const actualShape = resolveShapeForContext(
        shape,
        currentContainer,
        event
      );

      if (isAreaMode) {
        startShapeDrag(event, shape);
      } else {
        if (actualShape.type === "ellipse" && "seatGraphics" in actualShape) {
        } else {
          startShapeDrag(event, actualShape);
        }
      }
      break;
    }
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
    if (isCurrentlyShapeDragging()) {
      endShapeDrag();
    }
    if (isDoubleClick) {
      handleDoubleClick(event, actualShape);
    } else {
      handleShapeSelection(event, actualShape);
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
