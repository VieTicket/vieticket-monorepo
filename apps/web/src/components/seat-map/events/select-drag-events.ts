import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  PolygonShape,
  RowShape,
  SeatShape,
} from "../types";
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
import { getGuideLines } from "../guide-lines";

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

  const guideLines = getGuideLines();
  if (guideLines && stage) {
    const bounds = stage.getBounds();
    guideLines.createGrid(bounds.width * 2, bounds.height * 2);
  }
};

export const handleShapeDrag = (event: PIXI.FederatedPointerEvent) => {
  if (!isShapeDragging || !shapeDragStart || !stage) return;

  const currentPoint = event.getLocalPosition(stage);
  let deltaX = currentPoint.x - shapeDragStart.x;
  let deltaY = currentPoint.y - shapeDragStart.y;

  const guideLines = getGuideLines();
  if (guideLines && draggedShapes.length > 0) {
    const firstShape = draggedShapes[0];
    const originalPos = originalPositions[0];
    const newX = originalPos.x + deltaX;
    const newY = originalPos.y + deltaY;

    // Get snap points from other shapes (excluding dragged ones)
    const snapPoints = getSnapPointsExcludingShapes(draggedShapes);
    const snappedPos = guideLines.snapToPoints(newX, newY, snapPoints);
    const gridSnappedPos = guideLines.snapToGrid(newX, newY);

    // Use the closest snap
    const objectDistance = Math.sqrt(
      Math.pow(snappedPos.x - newX, 2) + Math.pow(snappedPos.y - newY, 2)
    );
    const gridDistance = Math.sqrt(
      Math.pow(gridSnappedPos.x - newX, 2) +
        Math.pow(gridSnappedPos.y - newY, 2)
    );

    let finalPos = { x: newX, y: newY };
    if (objectDistance < gridDistance && objectDistance < 15) {
      finalPos = snappedPos;
    } else if (gridDistance < 15) {
      finalPos = gridSnappedPos;
    }

    deltaX = finalPos.x - originalPos.x;
    deltaY = finalPos.y - originalPos.y;

    // Show snap guides
    guideLines.showSnapGuides(finalPos.x, finalPos.y, snapPoints);
  }

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
  const guideLines = getGuideLines();
  if (guideLines) {
    guideLines.clearAll();
  }
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

const getSnapPointsExcludingShapes = (
  excludeShapes: CanvasItem[]
): Array<{ x: number; y: number }> => {
  const snapPoints: Array<{ x: number; y: number }> = [];
  const excludeIds = new Set(excludeShapes.map((s) => s.id));

  const getWorldCoordinates = (shape: CanvasItem): { x: number; y: number } => {
    let worldX = shape.x;
    let worldY = shape.y;

    // For seats, add row and grid positions
    if (shape.type === "ellipse" && "rowId" in shape && "gridId" in shape) {
      const seat = shape as SeatShape;

      // Find the row and grid
      if (areaModeContainer) {
        for (const grid of areaModeContainer.children) {
          if (grid.id === seat.gridId) {
            worldX += grid.x;
            worldY += grid.y;

            for (const row of grid.children) {
              if (row.id === seat.rowId) {
                worldX += row.x;
                worldY += row.y;
                break;
              }
            }
            break;
          }
        }
      }
    }
    // For rows, add grid position
    else if (shape.type === "container" && "rowName" in shape) {
      const row = shape as RowShape;

      if (areaModeContainer) {
        for (const grid of areaModeContainer.children) {
          if (grid.id === row.gridId) {
            worldX += grid.x;
            worldY += grid.y;
            break;
          }
        }
      }
    }

    return { x: worldX, y: worldY };
  };

  shapes.forEach((shape: CanvasItem) => {
    if (excludeIds.has(shape.id) || shape.type === "container") return;
    const worldPos = getWorldCoordinates(shape);
    snapPoints.push(worldPos);

    if (shape.type === "rectangle") {
      const halfWidth = shape.width / 2;
      const halfHeight = shape.height / 2;

      snapPoints.push(
        { x: worldPos.x - halfWidth, y: worldPos.y - halfHeight },
        { x: worldPos.x + halfWidth, y: worldPos.y - halfHeight },
        { x: worldPos.x - halfWidth, y: worldPos.y + halfHeight },
        { x: worldPos.x + halfWidth, y: worldPos.y + halfHeight },
        { x: worldPos.x, y: worldPos.y - halfHeight },
        { x: worldPos.x, y: worldPos.y + halfHeight },
        { x: worldPos.x - halfWidth, y: worldPos.y },
        { x: worldPos.x + halfWidth, y: worldPos.y }
      );
    } else if (shape.type === "ellipse") {
      snapPoints.push(
        { x: worldPos.x - shape.radiusX, y: worldPos.y },
        { x: worldPos.x + shape.radiusX, y: worldPos.y },
        { x: worldPos.x, y: worldPos.y - shape.radiusY },
        { x: worldPos.x, y: worldPos.y + shape.radiusY }
      );
    }
  });

  if (areaModeContainer) {
    areaModeContainer.children.forEach((grid) => {
      if (excludeIds.has(grid.id)) return;

      // Add grid center
      snapPoints.push({ x: grid.x, y: grid.y });

      // Calculate grid bounds for corner snap points
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      let hasContent = false;

      grid.children.forEach((row) => {
        if (excludeIds.has(row.id)) return;

        // Add row snap points
        const rowWorldX = grid.x + row.x;
        const rowWorldY = grid.y + row.y;
        snapPoints.push({ x: rowWorldX, y: rowWorldY });

        row.children.forEach((seat) => {
          if (excludeIds.has(seat.id)) return;

          // Add seat snap points
          const seatWorldX = grid.x + row.x + seat.x;
          const seatWorldY = grid.y + row.y + seat.y;
          snapPoints.push({ x: seatWorldX, y: seatWorldY });

          // Add seat edge points
          snapPoints.push(
            { x: seatWorldX - seat.radiusX, y: seatWorldY },
            { x: seatWorldX + seat.radiusX, y: seatWorldY },
            { x: seatWorldX, y: seatWorldY - seat.radiusY },
            { x: seatWorldX, y: seatWorldY + seat.radiusY }
          );

          // Track grid bounds
          minX = Math.min(minX, seatWorldX - seat.radiusX);
          maxX = Math.max(maxX, seatWorldX + seat.radiusX);
          minY = Math.min(minY, seatWorldY - seat.radiusY);
          maxY = Math.max(maxY, seatWorldY + seat.radiusY);
          hasContent = true;
        });
      });

      // Add grid corner snap points based on content bounds
      if (hasContent) {
        snapPoints.push(
          { x: minX, y: minY }, // Top-left
          { x: maxX, y: minY }, // Top-right
          { x: minX, y: maxY }, // Bottom-left
          { x: maxX, y: maxY }, // Bottom-right
          { x: (minX + maxX) / 2, y: minY }, // Top-center
          { x: (minX + maxX) / 2, y: maxY }, // Bottom-center
          { x: minX, y: (minY + maxY) / 2 }, // Left-center
          { x: maxX, y: (minY + maxY) / 2 } // Right-center
        );
      }
    });
  }

  return snapPoints;
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
