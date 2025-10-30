import * as PIXI from "pixi.js";
import { SeatShape } from "../types";
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
  cloneCanvasItems,
  ShapeContext,
  useSeatMapStore,
} from "../store/seat-map-store";
import { createSeatGrid, calculateGridDimensions } from "../shapes/seats";
import {
  createPreviewGraphics,
  updatePreviewShape,
  clearPreview,
} from "../preview";
import { getSelectionTransform } from "./transform-events";

// ✅ Enter area mode for a specific container
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

// ✅ Exit area mode and restore all shapes
export const exitAreaMode = () => {
  if (!isAreaMode) return;

  try {
    // Restore all shapes to interactive
    shapes.forEach((shape) => {
      if (shape.id !== areaModeContainer?.id) {
        shape.interactive = true;
        shape.graphics.interactive = true;
        shape.graphics.alpha = shape.opacity;
      }
    });

    if (areaModeContainer) {
      areaModeContainer.interactive = false;
      areaModeContainer.graphics.interactiveChildren = false;
      areaModeContainer.graphics.interactive = false;
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

// ✅ Area mode pointer down - start seat grid drawing
export const onAreaModePointerDown = (event: PIXI.FederatedPointerEvent) => {
  if (!isAreaMode || !areaModeContainer) return;
  const globalPoint = event.global;
  const localPoint = areaModeContainer.graphics.toLocal(globalPoint);

  setDragStart({ x: localPoint.x, y: localPoint.y });
  setIsDrawing(true);

  // Create preview graphics for the grid area
  createPreviewGraphics();
};

// ✅ Area mode pointer move - preview seat grid
export const onAreaModePointerMove = (event: PIXI.FederatedPointerEvent) => {
  if (!isDrawing || !dragStart || !areaModeContainer) return;

  const globalPoint = event.global;
  const localPoint = areaModeContainer.graphics.toLocal(globalPoint);

  // Update preview rectangle to show the grid area
  updatePreviewShape(dragStart.x, dragStart.y, localPoint.x, localPoint.y);
};

export const onAreaModePointerUp = (event: PIXI.FederatedPointerEvent) => {
  if (!isDrawing || !dragStart || !areaModeContainer) return;

  const globalPoint = event.global;
  const localPoint = areaModeContainer.graphics.toLocal(globalPoint);

  const width = Math.abs(localPoint.x - dragStart.x);
  const height = Math.abs(localPoint.y - dragStart.y);

  let gridCreated = false;

  // Only create grid if the area is large enough
  if (width > 40 && height > 40) {
    const startX = Math.min(dragStart.x, localPoint.x);
    const startY = Math.min(dragStart.y, localPoint.y);

    // Calculate number of seats based on dimensions and spacing
    const { rows, seatsPerRow } = calculateGridDimensions(width, height);

    // ✅ Create the seat grid with proper naming
    const gridName = `Grid ${areaModeContainer.grids.length + 1}`;
    const seats = createSeatGrid(
      startX,
      startY,
      rows,
      seatsPerRow,
      areaModeContainer!.defaultSeatSettings.seatSpacing,
      areaModeContainer!.defaultSeatSettings.rowSpacing,
      gridName
    );

    // Add seats to area mode container
    seats.forEach((seat) => {
      areaModeContainer!.children.push(seat);
      areaModeContainer!.graphics.addChild(seat.graphics);

      // Set up seat graphics position
      seat.graphics.position.set(seat.x, seat.y);
    });

    // ✅ Clone the state AFTER creating seats
    const afterAreaModeContainer = cloneCanvasItems(seats);

    // ✅ Build creation context similar to deleteShapes
    const creationContext: ShapeContext = {
      topLevel: [], // No top-level shapes created (seats are nested in container)
      nested: seats.map((seat) => ({
        id: seat.id,
        type: seat.type,
        parentId: areaModeContainer!.id,
      })),
      operation: "create-seat-grid",
      containerPositions: {
        [areaModeContainer!.id]: {
          x: areaModeContainer!.x,
          y: areaModeContainer!.y,
        },
      },
    };

    // ✅ Save to history directly with creation context
    useSeatMapStore.getState()._saveToHistory(
      {
        shapes: [],
        context: creationContext,
      },
      {
        shapes: afterAreaModeContainer,
        context: creationContext,
      }
    );

    gridCreated = true;
  }

  // Clean up
  clearPreview();
  setIsDrawing(false);
  setDragStart(null);

  // ✅ Update store WITHOUT saving history (we already saved it above)
  if (gridCreated) {
    useSeatMapStore.getState().updateShapes([...shapes], false);
  }
};

// ✅ Alignment utilities (unchanged)
export const alignSeats = (alignment: "left" | "center" | "right"): void => {
  const seats: SeatShape[] = useSeatMapStore.getState()
    .selectedShapes as SeatShape[];
  if (seats.length < 2) return;

  // ✅ Group seats by rowId
  const seatsByRow: Record<string, SeatShape[]> = {};

  seats.forEach((seat) => {
    if (!seatsByRow[seat.rowId]) {
      seatsByRow[seat.rowId] = [];
    }
    seatsByRow[seat.rowId].push(seat);
  });

  // ✅ Sort seats within each row by their original position (x coordinate)
  Object.values(seatsByRow).forEach((rowSeats) => {
    rowSeats.sort((a, b) => a.x - b.x);
  });

  // ✅ Find the maximum number of seats in any row
  const maxSeatsInRow = Math.max(
    ...Object.values(seatsByRow).map((rowSeats) => rowSeats.length)
  );

  // ✅ Get seat spacing from grid settings
  const spacing = areaModeContainer?.defaultSeatSettings.seatSpacing || 25;

  // ✅ Process each row
  Object.entries(seatsByRow).forEach(([rowId, rowSeats]) => {
    const seatCount = rowSeats.length;

    if (seatCount === 0) return;

    // ✅ Calculate row bounds
    const rowMinX = Math.min(...rowSeats.map((s) => s.x));
    const rowMaxX = Math.max(...rowSeats.map((s) => s.x));
    const rowCenterX = (rowMinX + rowMaxX) / 2;
    const rowY = rowSeats[0].y; // All seats in a row should have the same Y

    let newPositions: number[] = [];

    switch (alignment) {
      case "left": {
        // ✅ Align all rows to the leftmost position of any row
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
        // ✅ Align all rows to the rightmost position of any row
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
        // ✅ Advanced center alignment based on max row count
        if (seatCount === maxSeatsInRow) {
          // ✅ This row has the maximum seats - keep its center as reference
          const currentCenterX = rowCenterX;
          const halfSpan = ((seatCount - 1) * spacing) / 2;

          newPositions = rowSeats.map(
            (_, index) => currentCenterX - halfSpan + index * spacing
          );
        } else {
          // ✅ This row has fewer seats - align to the center of max row
          const maxRowCenterX = calculateMaxRowCenter(
            seatsByRow,
            maxSeatsInRow,
            spacing
          );

          // ✅ Find middle seat(s) for anchor
          const middleSeatIndex = Math.floor((seatCount - 1) / 2);
          const isEvenCount = seatCount % 2 === 0;

          if (isEvenCount) {
            // ✅ Even number of seats - center between two middle seats
            const leftMiddleIndex = middleSeatIndex;
            const rightMiddleIndex = middleSeatIndex + 1;
            const betweenSeatsX = maxRowCenterX;

            newPositions = rowSeats.map((_, index) => {
              const offsetFromCenter = index - (leftMiddleIndex + 0.5);
              return betweenSeatsX + offsetFromCenter * spacing;
            });
          } else {
            // ✅ Odd number of seats - center the middle seat
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

    // ✅ Apply new positions to seats
    rowSeats.forEach((seat, index) => {
      const newX = newPositions[index];
      seat.x = newX;
      seat.graphics.position.set(newX, seat.y);
    });
  });

  // ✅ Update store to reflect changes
  useSeatMapStore
    .getState()
    .updateShapes(areaModeContainer?.children || [], true);
};

// ✅ Helper function to calculate the center X of the row with maximum seats
const calculateMaxRowCenter = (
  seatsByRow: Record<string, SeatShape[]>,
  maxSeatsInRow: number,
  spacing: number
): number => {
  // ✅ Find a row that has the maximum number of seats
  const maxRow = Object.values(seatsByRow).find(
    (row) => row.length === maxSeatsInRow
  );

  if (!maxRow) {
    // ✅ Fallback: calculate center from all seats
    const allSeats = Object.values(seatsByRow).flat();
    const minX = Math.min(...allSeats.map((s) => s.x));
    const maxX = Math.max(...allSeats.map((s) => s.x));
    return (minX + maxX) / 2;
  }

  // ✅ Calculate the center of the max row
  const sortedMaxRow = [...maxRow].sort((a, b) => a.x - b.x);
  const rowMinX = sortedMaxRow[0].x;
  const rowMaxX = sortedMaxRow[sortedMaxRow.length - 1].x;

  return (rowMinX + rowMaxX) / 2;
};
