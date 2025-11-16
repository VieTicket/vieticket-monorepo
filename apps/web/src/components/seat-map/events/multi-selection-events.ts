import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  EllipseShape,
  GridShape,
  PolygonShape,
  RectangleShape,
  RowShape,
  SeatShape,
  SVGShape,
} from "../types";
import {
  currentTool,
  stage,
  shapes,
  setIsDrawing,
  setDragStart,
  isAreaMode,
  selectionStart,
  isSelecting,
  setSelectionStart,
  setIsSelecting,
  setPreviouslyClickedShape,
  areaModeContainer,
} from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "./transform-events";
import { clearAllSelections } from "../shapes";
import {
  createPreviewGraphics,
  clearPreview,
  updatePreviewShape,
} from "../preview";
import { onStageClick } from "./select-drag-events";

// ✅ Start multi-selection
export const startMultiSelection = (event: PIXI.FederatedPointerEvent) => {
  if (currentTool !== "select" || !stage) return;

  const globalPoint = event.global;
  const localPoint = stage.toLocal(globalPoint);

  setDragStart({ x: localPoint.x, y: localPoint.y });
  setSelectionStart({ x: localPoint.x, y: localPoint.y });
  setIsDrawing(true);
  setIsSelecting(true);

  setPreviouslyClickedShape(
    useSeatMapStore.getState().selectedShapes[0] || null
  );
  // Create preview graphics for selection rectangle
  createPreviewGraphics();
};

// ✅ Update multi-selection preview
export const updateMultiSelection = (event: PIXI.FederatedPointerEvent) => {
  if (!isSelecting || !selectionStart || !stage) return;

  const globalPoint = event.global;
  const localPoint = stage.toLocal(globalPoint);

  // Update selection rectangle preview
  updatePreviewShape(
    selectionStart.x,
    selectionStart.y,
    localPoint.x,
    localPoint.y
  );
};

// ✅ End multi-selection and select shapes
export const endMultiSelection = (event: PIXI.FederatedPointerEvent) => {
  if (!isSelecting || !selectionStart || !stage) return;

  const globalPoint = event.global;
  const localPoint = stage.toLocal(globalPoint);

  const isMultiSelect = event.ctrlKey || event.metaKey;

  // Calculate selection rectangle
  const selectionRect = {
    x: Math.min(selectionStart.x, localPoint.x),
    y: Math.min(selectionStart.y, localPoint.y),
    width: Math.abs(localPoint.x - selectionStart.x),
    height: Math.abs(localPoint.y - selectionStart.y),
  };

  // Only process if rectangle is large enough (prevent accidental selections)
  if (selectionRect.width > 5 && selectionRect.height > 5) {
    processShapeSelection(selectionRect, isMultiSelect);
  } else {
    onStageClick();
  }

  // Clean up
  clearPreview();
  setIsDrawing(false);
  setDragStart(null);
  setIsSelecting(false);
  setSelectionStart(null);
};

// ✅ Check if multi-selection is active
export const isMultiSelecting = (): boolean => {
  return isSelecting;
};

// ✅ Process shape selection within rectangle
const processShapeSelection = (
  rect: { x: number; y: number; width: number; height: number },
  isMultiSelect: boolean
) => {
  const shapesToSelect: CanvasItem[] = [];
  const selectedSeatsByGrid = new Map<string, Set<string>>(); // gridId -> Set<seatId>
  const selectedSeatsByRow = new Map<string, Set<string>>(); // rowId -> Set<seatId>

  if (isAreaMode && areaModeContainer) {
    // Process area mode container children (grids)
    areaModeContainer.children.forEach((grid) => {
      const gridSeatsInSelection: SeatShape[] = [];
      // Check all rows in this grid
      grid.children.forEach((row) => {
        const rowSeatsInSelection: SeatShape[] = [];

        // Check all seats in this row
        row.children.forEach((seat) => {
          const seatWorldPosition = getWorldPosition(seat, row);
          // Convert to absolute world position
          const absoluteSeatPosition = {
            ...seat,
            x: seatWorldPosition.x,
            y: seatWorldPosition.y,
          };

          if (isShapeInRectangle(absoluteSeatPosition, rect)) {
            rowSeatsInSelection.push(seat);
            gridSeatsInSelection.push(seat);

            // Track selected seats by row and grid
            if (!selectedSeatsByRow.has(row.id)) {
              selectedSeatsByRow.set(row.id, new Set());
            }
            selectedSeatsByRow.get(row.id)!.add(seat.id);

            if (!selectedSeatsByGrid.has(grid.id)) {
              selectedSeatsByGrid.set(grid.id, new Set());
            }
            selectedSeatsByGrid.get(grid.id)!.add(seat.id);
          }
        });

        // Check if all seats in this row are selected
        if (
          rowSeatsInSelection.length > 0 &&
          rowSeatsInSelection.length === row.children.length
        ) {
          // All seats in row are selected - select the row instead
          const existingRowSelection = shapesToSelect.find(
            (s) => s.id === row.id
          );
          if (!existingRowSelection) {
            // Remove individual seats from this row from selection
            rowSeatsInSelection.forEach((seat) => {
              const seatIndex = shapesToSelect.findIndex(
                (s) => s.id === seat.id
              );
              if (seatIndex !== -1) {
                shapesToSelect.splice(seatIndex, 1);
              }
            });
            // Add the row instead
            shapesToSelect.push(row);
          }
        } else {
          // Not all seats in row are selected - add individual seats
          rowSeatsInSelection.forEach((seat) => {
            if (!shapesToSelect.find((s) => s.id === seat.id)) {
              shapesToSelect.push(seat);
            }
          });
        }
      });

      // Check if all seats in this grid are selected
      const totalSeatsInGrid = grid.children.reduce(
        (total, row) => total + row.children.length,
        0
      );
      if (
        gridSeatsInSelection.length > 0 &&
        gridSeatsInSelection.length === totalSeatsInGrid
      ) {
        // All seats in grid are selected - select the grid instead
        const existingGridSelection = shapesToSelect.find(
          (s) => s.id === grid.id
        );
        if (!existingGridSelection) {
          // Remove all rows and seats from this grid from selection
          shapesToSelect.splice(
            0,
            shapesToSelect.length,
            ...shapesToSelect.filter((s) => {
              // Keep shapes that are not part of this grid
              if (s.type === "ellipse" && "gridId" in s) {
                return (s as SeatShape).gridId !== grid.id;
              }
              if (s.type === "container" && "gridId" in s) {
                return (s as RowShape).gridId !== grid.id;
              }
              return true;
            })
          );
          // Add the grid instead
          shapesToSelect.push(grid);
        }
      }
    });
  } else {
    shapes.forEach((shape) => {
      if (shape.type === "container") {
        const container = shape as ContainerGroup;
        if (container.id === "area-mode-container-id") {
          container.children.forEach((child) => {
            const worldPosition = getWorldPosition(child, container);
            const worldChild = {
              ...child,
              x: worldPosition.x,
              y: worldPosition.y,
            };

            if (isShapeInRectangle(worldChild, rect)) {
              shapesToSelect.push(child);
            }
          });
        } else if (containerHasChildrenInSelection(container, rect)) {
          shapesToSelect.push(container);
        }
      } else {
        if (isShapeInRectangle(shape, rect)) {
          shapesToSelect.push(shape);
        }
      }
    });
  }

  // Apply selection
  if (shapesToSelect.length > 0) {
    if (!isMultiSelect) {
      // Clear existing selection
      clearAllSelections();
    }
    // Select found shapes
    shapesToSelect.forEach((shape) => {
      shape.selected = true;
    });

    // Update store and UI
    const allSelectedShapes = getAllSelectedShapes();
    useSeatMapStore.getState().setSelectedShapes(allSelectedShapes, false);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection(allSelectedShapes);
    }
  } else {
    onStageClick();
  }
};

const containerHasChildrenInSelection = (
  container: ContainerGroup,
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  // Check direct children
  for (const child of container.children) {
    if (child.type === "container") {
      // Recursively check nested containers
      if (containerHasChildrenInSelection(child as ContainerGroup, rect)) {
        return true;
      }
    } else {
      // Check if this child shape intersects with selection
      const worldPosition = getWorldPosition(child, container);
      const worldChild = {
        ...child,
        x: worldPosition.x,
        y: worldPosition.y,
      };

      if (isShapeInRectangle(worldChild, rect)) {
        return true;
      }
    }
  }

  return false;
};

const getWorldPosition = (
  shape: CanvasItem,
  container: ContainerGroup
): { x: number; y: number } => {
  // Convert local position to world position
  const containerGraphics = container.graphics;
  const localPoint = new PIXI.Point(shape.x, shape.y);
  const worldPoint = containerGraphics.toGlobal(localPoint);

  // Convert back to stage coordinates
  if (stage) {
    const stagePoint = stage.toLocal(worldPoint);
    return { x: stagePoint.x, y: stagePoint.y };
  }

  return { x: shape.x + container.x, y: shape.y + container.y };
};

const isShapeInRectangle = (
  shape: CanvasItem,
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  const shapeBounds = getShapeBounds(shape);

  return !(
    shapeBounds.right < rect.x ||
    shapeBounds.left > rect.x + rect.width ||
    shapeBounds.bottom < rect.y ||
    shapeBounds.top > rect.y + rect.height
  );
};

const getShapeBounds = (shape: CanvasItem) => {
  let bounds = {
    left: shape.x,
    top: shape.y,
    right: shape.x,
    bottom: shape.y,
  };

  switch (shape.type) {
    case "rectangle": {
      const rectShape = shape as RectangleShape;
      const halfWidth = rectShape.width / 2;
      const halfHeight = rectShape.height / 2;
      bounds.left = shape.x - halfWidth;
      bounds.top = shape.y - halfHeight;
      bounds.right = shape.x + halfWidth;
      bounds.bottom = shape.y + halfHeight;
      break;
    }

    case "ellipse": {
      const ellipseShape = shape as EllipseShape;
      bounds.left = shape.x - ellipseShape.radiusX;
      bounds.top = shape.y - ellipseShape.radiusY;
      bounds.right = shape.x + ellipseShape.radiusX;
      bounds.bottom = shape.y + ellipseShape.radiusY;
      break;
    }

    case "text": {
      const textShape = shape as any;
      if (shape.graphics instanceof PIXI.Text) {
        try {
          const localBounds = shape.graphics.getLocalBounds();
          // Text is anchored at center, so adjust bounds accordingly
          const halfWidth = localBounds.width / 2;
          const halfHeight = localBounds.height / 2;
          bounds.left = shape.x - halfWidth;
          bounds.top = shape.y - halfHeight;
          bounds.right = shape.x + halfWidth;
          bounds.bottom = shape.y + halfHeight;
        } catch {
          // Fallback if getLocalBounds fails
          const textWidth = textShape.width || 100;
          const textHeight = textShape.fontSize || 16;
          const halfWidth = textWidth / 2;
          const halfHeight = textHeight / 2;
          bounds.left = shape.x - halfWidth;
          bounds.top = shape.y - halfHeight;
          bounds.right = shape.x + halfWidth;
          bounds.bottom = shape.y + halfHeight;
        }
      } else {
        // Fallback for text without graphics
        const textWidth = textShape.width || 100;
        const textHeight = textShape.fontSize || 16;
        const halfWidth = textWidth / 2;
        const halfHeight = textHeight / 2;
        bounds.left = shape.x - halfWidth;
        bounds.top = shape.y - halfHeight;
        bounds.right = shape.x + halfWidth;
        bounds.bottom = shape.y + halfHeight;
      }
      break;
    }

    case "polygon": {
      const polygonShape = shape as PolygonShape;
      if (polygonShape.points && polygonShape.points.length > 0) {
        let minX = shape.x + polygonShape.points[0].x;
        let maxX = shape.x + polygonShape.points[0].x;
        let minY = shape.y + polygonShape.points[0].y;
        let maxY = shape.y + polygonShape.points[0].y;

        for (let i = 1; i < polygonShape.points.length; i++) {
          const pointX = shape.x + polygonShape.points[i].x;
          const pointY = shape.y + polygonShape.points[i].y;
          minX = Math.min(minX, pointX);
          maxX = Math.max(maxX, pointX);
          minY = Math.min(minY, pointY);
          maxY = Math.max(maxY, pointY);
        }

        bounds.left = minX;
        bounds.top = minY;
        bounds.right = maxX;
        bounds.bottom = maxY;
      } else {
        // Fallback for polygon without points
        bounds.left = shape.x - 25;
        bounds.top = shape.y - 25;
        bounds.right = shape.x + 25;
        bounds.bottom = shape.y + 25;
      }
      break;
    }

    case "image": {
      const imageShape = shape as any;
      if (shape.graphics instanceof PIXI.Sprite) {
        try {
          const sprite = shape.graphics;
          const localBounds = sprite.getLocalBounds();
          // Image sprites are anchored at center (0.5, 0.5)
          const halfWidth = localBounds.width / 2;
          const halfHeight = localBounds.height / 2;
          bounds.left = shape.x - halfWidth;
          bounds.top = shape.y - halfHeight;
          bounds.right = shape.x + halfWidth;
          bounds.bottom = shape.y + halfHeight;
        } catch {
          // Fallback if getLocalBounds fails
          const width = imageShape.width || 100;
          const height = imageShape.height || 100;
          const halfWidth = width / 2;
          const halfHeight = height / 2;
          bounds.left = shape.x - halfWidth;
          bounds.top = shape.y - halfHeight;
          bounds.right = shape.x + halfWidth;
          bounds.bottom = shape.y + halfHeight;
        }
      } else {
        // Fallback for image without graphics
        const width = imageShape.width || 100;
        const height = imageShape.height || 100;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        bounds.left = shape.x - halfWidth;
        bounds.top = shape.y - halfHeight;
        bounds.right = shape.x + halfWidth;
        bounds.bottom = shape.y + halfHeight;
      }
      break;
    }

    case "svg": {
      const svgShape = shape as SVGShape;
      if (shape.graphics instanceof PIXI.Graphics) {
        try {
          const localBounds = shape.graphics.getLocalBounds();
          // SVG graphics are pivoted to center, similar to images
          const halfWidth = localBounds.width / 2;
          const halfHeight = localBounds.height / 2;
          bounds.left = shape.x - halfWidth;
          bounds.top = shape.y - halfHeight;
          bounds.right = shape.x + halfWidth;
          bounds.bottom = shape.y + halfHeight;
        } catch {
          // Fallback using original dimensions
          const halfWidth = svgShape.originalWidth / 2;
          const halfHeight = svgShape.originalHeight / 2;
          bounds.left = shape.x - halfWidth;
          bounds.top = shape.y - halfHeight;
          bounds.right = shape.x + halfWidth;
          bounds.bottom = shape.y + halfHeight;
        }
      } else {
        // Fallback for SVG without graphics
        const halfWidth = svgShape.originalWidth / 2;
        const halfHeight = svgShape.originalHeight / 2;
        bounds.left = shape.x - halfWidth;
        bounds.top = shape.y - halfHeight;
        bounds.right = shape.x + halfWidth;
        bounds.bottom = shape.y + halfHeight;
      }
      break;
    }

    case "container": {
      const containerShape = shape as ContainerGroup;
      if (shape.graphics instanceof PIXI.Container) {
        try {
          const localBounds = shape.graphics.getLocalBounds();
          bounds.left = shape.x + localBounds.x;
          bounds.top = shape.y + localBounds.y;
          bounds.right = shape.x + localBounds.x + localBounds.width;
          bounds.bottom = shape.y + localBounds.y + localBounds.height;
        } catch {
          // Fallback for container bounds calculation
          bounds.left = shape.x - 25;
          bounds.top = shape.y - 25;
          bounds.right = shape.x + 25;
          bounds.bottom = shape.y + 25;
        }
      } else {
        // Fallback for container without graphics
        bounds.left = shape.x - 25;
        bounds.top = shape.y - 25;
        bounds.right = shape.x + 25;
        bounds.bottom = shape.y + 25;
      }
      break;
    }

    default:
      break;
  }

  return bounds;
};

// ✅ Get all currently selected shapes
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
