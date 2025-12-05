import * as PIXI from "pixi.js";
import { GridShape, RowShape, SeatShape } from "../types";
import {
  isAreaMode,
  areaModeContainer,
  shapes,
  initializeAreaModeContainer,
  isDrawing,
  dragStart,
  setIsDrawing,
  setDragStart,
} from "../variables";
import {
  cloneCanvasItem,
  ShapeContext,
  useSeatMapStore,
} from "../store/seat-map-store";
import {
  createPreviewGraphics,
  updatePreviewShape,
  clearPreview,
  createSeatGridPreview,
  updateSeatGridPreview,
  clearSeatGridPreview,
} from "../preview";
import { getSelectionTransform } from "./transform-events";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";
import { calculateGridDimensions, createSeatGrid } from "../shapes/grid-shape";
import {
  getRowByIdFromAllGrids,
  updateMultipleRowLabelRotations,
  updateRowLabelPosition,
} from "../shapes/row-shape";

export const enterAreaMode = () => {
  try {
    if (!areaModeContainer) {
      initializeAreaModeContainer();
    }
    shapes.forEach((shape) => {
      if (shape.id !== areaModeContainer?.id) {
        shape.interactive = false;
        shape.graphics.interactive = false;
        shape.graphics.alpha = 0.3;
      }
    });

    areaModeContainer!.interactive = true;
    areaModeContainer!.visible = true;
    areaModeContainer!.graphics.interactiveChildren = true;
    areaModeContainer!.graphics.interactive = true;
    areaModeContainer!.graphics.visible = true;
    areaModeContainer!.graphics.alpha = 1;

    useSeatMapStore.getState().updateShapes([...shapes], false);
    useSeatMapStore.getState().setSelectedShapes([]);

    const selectionTransform = getSelectionTransform();
    selectionTransform?.updateSelection([]);
    return true;
  } catch (error) {
    console.error("Failed to enter area mode:", error);
    return false;
  }
};

export const exitAreaMode = () => {
  if (!isAreaMode) return;

  try {
    shapes.forEach((shape) => {
      if (shape.id !== areaModeContainer?.id) {
        shape.interactive = true;
        shape.graphics.interactive = true;
        shape.graphics.alpha = shape.opacity;
      }
    });

    if (areaModeContainer) {
      areaModeContainer.graphics.alpha = 0.3;
    }

    useSeatMapStore.getState().updateShapes([...shapes], false);
    useSeatMapStore.getState().setSelectedShapes([]);
    clearPreview();
    setIsDrawing(false);
    setDragStart(null);
    const selectionTransform = getSelectionTransform();
    selectionTransform?.updateSelection([]);
  } catch (error) {
    console.error("Failed to exit area mode:", error);
  }
};

export const onAreaModePointerDown = (event: PIXI.FederatedPointerEvent) => {
  if (!isAreaMode || !areaModeContainer) return;
  const globalPoint = event.global;
  const localPoint = areaModeContainer.graphics.toLocal(globalPoint);

  setDragStart({ x: localPoint.x, y: localPoint.y });
  setIsDrawing(true);

  createSeatGridPreview();
};

export const onAreaModePointerMove = (event: PIXI.FederatedPointerEvent) => {
  if (!isDrawing || !dragStart || !areaModeContainer) return;

  const globalPoint = event.global;
  const localPoint = areaModeContainer.graphics.toLocal(globalPoint);

  updateSeatGridPreview(dragStart.x, dragStart.y, localPoint.x, localPoint.y);
};

// Add this import at the top
declare global {
  interface Window {
    __validateNewGrid?: (gridId: string) => void;
  }
}

export const onAreaModePointerUp = (event: PIXI.FederatedPointerEvent) => {
  if (!isDrawing || !dragStart || !areaModeContainer) return;

  const globalPoint = event.global;
  const localPoint = areaModeContainer.graphics.toLocal(globalPoint);

  const width = Math.abs(localPoint.x - dragStart.x);
  const height = Math.abs(localPoint.y - dragStart.y);

  let gridCreated = false;

  if (width > 40 && height > 40) {
    const beforeAreaModeContainer = cloneCanvasItem(areaModeContainer);

    const startX = Math.min(dragStart.x, localPoint.x);
    const startY = Math.min(dragStart.y, localPoint.y);

    const { rows, seatsPerRow } = calculateGridDimensions(width, height);
    const seatRadius = areaModeContainer.defaultSeatSettings.seatRadius;
    const gridName = `Grid ${areaModeContainer.children.length + 1}`;

    const seats = createSeatGrid(
      startX + seatRadius,
      startY + seatRadius,
      rows,
      seatsPerRow,
      areaModeContainer.defaultSeatSettings.seatSpacing,
      areaModeContainer.defaultSeatSettings.rowSpacing,
      gridName
    );

    const newGrid =
      areaModeContainer.children[areaModeContainer.children.length - 1];

    if (!areaModeContainer.graphics.children.includes(newGrid.graphics)) {
      areaModeContainer.graphics.addChild(newGrid.graphics);
    }

    const afterAreaModeContainer = cloneCanvasItem(areaModeContainer);

    const creationContext: ShapeContext = {
      topLevel: [],
      nested: [
        {
          id: newGrid.id,
          type: newGrid.type,
          parentId: areaModeContainer.id,
        },
      ],
      operation: "create-seat-grid",
      containerPositions: {
        [areaModeContainer.id]: {
          x: areaModeContainer.x,
          y: areaModeContainer.y,
        },
        [newGrid.id]: {
          x: newGrid.x,
          y: newGrid.y,
        },
      },
    };

    const action = useSeatMapStore.getState()._saveToHistory(
      {
        shapes: [beforeAreaModeContainer],
        context: creationContext,
      },
      {
        shapes: [afterAreaModeContainer],
        context: creationContext,
      }
    );

    SeatMapCollaboration.broadcastShapeChange(action);
    gridCreated = true;

    // ✅ Trigger validation for the new grid
    setTimeout(() => {
      if (window.__validateNewGrid) {
        window.__validateNewGrid(newGrid.id);
      }
    }, 100); // Small delay to ensure DOM updates
  }

  clearSeatGridPreview();
  setIsDrawing(false);
  setDragStart(null);

  if (gridCreated) {
    useSeatMapStore.getState().updateShapes([...shapes], false);
  }
};

export const alignSeats = (alignment: "left" | "center" | "right"): void => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  const seats: SeatShape[] = [];

  selectedShapes.forEach((shape) => {
    if (shape.type === "ellipse" && "gridId" in shape && "rowId" in shape) {
      const seat = shape as SeatShape;
      seats.push(seat);
    } else if (shape.type === "container" && "gridName" in shape) {
      const grid = shape as GridShape;
      grid.children.forEach((row: RowShape) => {
        seats.push(...row.children);
      });
    } else if (
      shape.type === "container" &&
      "rowName" in shape &&
      "gridId" in shape
    ) {
      const row = shape as RowShape;
      seats.push(...row.children);
    }
  });

  if (seats.length < 2) {
    return;
  }

  const beforeSeats = seats.map((seat) => ({
    ...seat,
    graphics: seat.graphics,
  }));

  const seatsByRow: Record<string, SeatShape[]> = {};

  seats.forEach((seat) => {
    if (!seatsByRow[seat.rowId]) {
      seatsByRow[seat.rowId] = [];
    }
    seatsByRow[seat.rowId].push(seat);
  });

  Object.values(seatsByRow).forEach((rowSeats) => {
    rowSeats.sort((a, b) => a.x - b.x);
  });

  const maxSeatsInRow = Math.max(
    ...Object.values(seatsByRow).map((rowSeats) => rowSeats.length)
  );

  const spacing = areaModeContainer?.defaultSeatSettings.seatSpacing || 25;

  Object.entries(seatsByRow).forEach(([rowId, rowSeats]) => {
    const seatCount = rowSeats.length;

    if (seatCount === 0) return;

    const rowMinX = Math.min(...rowSeats.map((s) => s.x));
    const rowMaxX = Math.max(...rowSeats.map((s) => s.x));
    const rowCenterX = (rowMinX + rowMaxX) / 2;

    let newPositions: number[] = [];

    switch (alignment) {
      case "left": {
        const globalLeftX = Math.min(
          ...Object.values(seatsByRow).map((seats) =>
            Math.min(...seats.map((s) => s.x))
          )
        );

        newPositions = rowSeats.map(
          (_, index) => globalLeftX + index * spacing
        );
        break;
      }

      case "right": {
        const globalRightX = Math.max(
          ...Object.values(seatsByRow).map((seats) =>
            Math.max(...seats.map((s) => s.x))
          )
        );

        newPositions = rowSeats.map(
          (_, index) => globalRightX - (seatCount - 1 - index) * spacing
        );
        break;
      }

      case "center": {
        if (seatCount === maxSeatsInRow) {
          const currentCenterX = rowCenterX;
          const halfSpan = ((seatCount - 1) * spacing) / 2;

          newPositions = rowSeats.map(
            (_, index) => currentCenterX - halfSpan + index * spacing
          );
        } else {
          const maxRowCenterX = calculateMaxRowCenter(
            seatsByRow,
            maxSeatsInRow,
            spacing
          );

          const middleSeatIndex = Math.floor((seatCount - 1) / 2);
          const isEvenCount = seatCount % 2 === 0;

          if (isEvenCount) {
            const leftMiddleIndex = middleSeatIndex;
            const betweenSeatsX = maxRowCenterX;

            newPositions = rowSeats.map((_, index) => {
              const offsetFromCenter = index - (leftMiddleIndex + 0.5);
              return betweenSeatsX + offsetFromCenter * spacing;
            });
          } else {
            const middleSeatX = maxRowCenterX;

            newPositions = rowSeats.map((_, index) => {
              const offsetFromMiddle = index - middleSeatIndex;
              return middleSeatX + offsetFromMiddle * spacing;
            });
          }
        }
        break;
      }
    }

    rowSeats.forEach((seat, index) => {
      const newX = newPositions[index];
      seat.x = newX;
      seat.graphics.position.set(newX, seat.y);
    });
  });

  const affectedRowIds = new Set<string>();
  seats.forEach((seat) => affectedRowIds.add(seat.rowId));

  const affectedRows: any[] = [];
  affectedRowIds.forEach((rowId) => {
    const row = getRowByIdFromAllGrids(rowId);
    if (row) {
      updateRowLabelPosition(row);
      affectedRows.push(row);
    }
  });

  updateMultipleRowLabelRotations(affectedRows);

  const afterSeats = seats.map((seat) => ({
    ...seat,
    graphics: seat.graphics,
  }));

  const shapes = useSeatMapStore.getState().shapes;
  useSeatMapStore.getState().updateShapes([...shapes], false);

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(selectedShapes);
  }

  const action = useSeatMapStore.getState()._saveToHistory(
    {
      shapes: beforeSeats,
      selectedShapes: selectedShapes,
      context: {
        topLevel: [],
        nested: [],
        operation: "modify",
      },
    },
    {
      shapes: afterSeats,
      selectedShapes: selectedShapes,
      context: {
        topLevel: [],
        nested: [],
        operation: "modify",
      },
    }
  );

  SeatMapCollaboration.broadcastShapeChange(action);
};

const calculateMaxRowCenter = (
  seatsByRow: Record<string, SeatShape[]>,
  maxSeatsInRow: number,
  spacing: number
): number => {
  const maxRow = Object.values(seatsByRow).find(
    (row) => row.length === maxSeatsInRow
  );

  if (!maxRow) {
    const allSeats = Object.values(seatsByRow).flat();
    const minX = Math.min(...allSeats.map((s) => s.x));
    const maxX = Math.max(...allSeats.map((s) => s.x));
    return (minX + maxX) / 2;
  }

  const sortedMaxRow = [...maxRow].sort((a, b) => a.x - b.x);
  const rowMinX = sortedMaxRow[0].x;
  const rowMaxX = sortedMaxRow[sortedMaxRow.length - 1].x;

  return (rowMinX + rowMaxX) / 2;
};
