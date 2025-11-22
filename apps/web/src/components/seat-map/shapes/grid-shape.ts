import * as PIXI from "pixi.js";
import {
  GridShape,
  SeatShape,
  SeatGridSettings,
  RowShape,
  SeatLabelStyle,
} from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { areaModeContainer } from "../variables";
import { cloneCanvasItem, useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "../events/transform-events";
import {
  createSeat,
  setSeatLabelVisibility,
  updateMultipleSeatLabelsRotation,
  updateSeatLabelStyle,
} from "./seat-shape";
import {
  createRowLabel,
  createRowShape,
  getRowById,
  recreateRowShape,
  updateRowGraphics,
  updateRowLabelPosition,
} from "./row-shape";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";

/**
 * Set seat grid settings
 */
export const setSeatGridSettings = (settings: Partial<SeatGridSettings>) => {
  if (!areaModeContainer) return;

  areaModeContainer.defaultSeatSettings = {
    ...areaModeContainer.defaultSeatSettings,
    ...settings,
  };
};

/**
 * Get seat settings from grid shape
 */
export const getSeatSettingsForGrid = (gridId: string): SeatGridSettings => {
  if (!areaModeContainer) {
    return {
      seatSpacing: 25,
      rowSpacing: 30,
      seatRadius: 8,
      seatColor: 0x4caf50,
      seatStrokeColor: 0x2e7d0f,
      seatStrokeWidth: 1,
      price: 0,
    };
  }

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (grid) {
    return grid.seatSettings;
  }

  return areaModeContainer.defaultSeatSettings;
};

/**
 * Get seats by grid ID (updated for new structure)
 */
export const getSeatsByGridId = (gridId: string): SeatShape[] => {
  if (!areaModeContainer) return [];

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return [];

  const allSeats: SeatShape[] = [];
  grid.children.forEach((row) => {
    allSeats.push(...row.children);
  });
  return allSeats;
};

/**
 * Get grid by ID (updated for new structure)
 */
export const getGridById = (gridId: string): GridShape | undefined => {
  if (!areaModeContainer) return undefined;
  return areaModeContainer.children.find((g) => g.id === gridId) as GridShape;
};

/**
 * Select all seats in a grid
 */
export const selectSeatsInGrid = (gridId: string): void => {
  if (!areaModeContainer) return;

  const seats = getSeatsByGridId(gridId);
  if (seats.length === 0) return;

  seats.forEach((seat) => (seat.selected = true));
  useSeatMapStore.getState().setSelectedShapes(seats);

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(seats);
  }
};

/**
 * Set labels visibility for all seats in a grid
 */
export const setGridLabelsVisibility = (
  gridId: string,
  visible: boolean
): void => {
  const seats = getSeatsByGridId(gridId) as SeatShape[];
  seats.forEach((seat) => setSeatLabelVisibility(seat, visible));
};

/**
 * Update label style for all seats in a grid
 */
export const updateGridLabelStyle = (
  gridId: string,
  styleUpdate: Partial<SeatLabelStyle>
): void => {
  const seats = getSeatsByGridId(gridId) as SeatShape[];
  seats.forEach((seat) => updateSeatLabelStyle(seat, styleUpdate));
};

/**
 * Add seat to grid (updated for new structure)
 */
export const addSeatToGrid = (seat: SeatShape): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.children.find(
    (g) => g.id === seat.gridId
  ) as GridShape;
  if (!grid) return;

  const row = grid.children.find((r) => r.id === seat.rowId) as RowShape;
  if (!row) return;

  if (!row.children.find((s) => s.id === seat.id)) {
    row.children.push(seat);
    row.graphics.addChild(seat.graphics);
  }
};

/**
 * Remove seat from grid (updated for new structure)
 */
export const removeSeatFromGrid = (seatId: string): void => {
  if (!areaModeContainer) return;

  for (const grid of areaModeContainer.children) {
    for (const row of grid.children) {
      const seatIndex = row.children.findIndex((seat) => seat.id === seatId);
      if (seatIndex !== -1) {
        row.children.splice(seatIndex, 1);
        return;
      }
    }
  }
};

/**
 * Remove multiple seats from grid
 */
export const removeSeatsFromGrid = (seatIds: string[]): void => {
  if (!areaModeContainer) return;

  seatIds.forEach((seatId) => {
    removeSeatFromGrid(seatId);
  });
};

/**
 * Clean up empty grids (updated for new structure)
 */
export const cleanupEmptyGrids = (): void => {
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

/**
 * Create seat grid (updated for new structure)
 */
/**
 * Create seat grid (updated for new structure) - FIXED positioning
 */
export const createSeatGrid = (
  startX: number,
  startY: number,
  rows: number,
  seatsPerRow: number,
  seatSpacing?: number,
  rowSpacing?: number,
  gridName: string = `Grid ${areaModeContainer?.children.length! + 1}`,
  basePrice?: number
): SeatShape[] => {
  const seats: SeatShape[] = [];
  const gridId = generateShapeId();

  const effectiveSeatSpacing =
    seatSpacing || areaModeContainer?.defaultSeatSettings.seatSpacing || 25;
  const effectiveRowSpacing =
    rowSpacing || areaModeContainer?.defaultSeatSettings.rowSpacing || 30;
  const effectivePrice =
    basePrice ?? areaModeContainer?.defaultSeatSettings.price ?? 0;

  // Create grid graphics
  const gridGraphics = new PIXI.Container();
  gridGraphics.eventMode = "static";

  // Create GridShape
  const gridShape: GridShape = {
    id: gridId,
    name: gridName,
    type: "container",
    x: startX,
    y: startY,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    interactive: true,
    selected: false,
    expanded: true,
    graphics: gridGraphics,
    children: [],
    gridName,
    seatSettings: areaModeContainer?.defaultSeatSettings
      ? {
          ...areaModeContainer.defaultSeatSettings,
          price: effectivePrice,
        }
      : {
          seatSpacing: effectiveSeatSpacing,
          rowSpacing: effectiveRowSpacing,
          seatRadius: 8,
          seatColor: 0x4caf50,
          seatStrokeColor: 0x2e7d0f,
          seatStrokeWidth: 1,
          price: effectivePrice,
        },
    createdAt: new Date(),
  };

  // Set grid graphics position
  gridGraphics.position.set(startX, startY);

  // Create rows
  for (let row = 0; row < rows; row++) {
    const rowShape = createRowShape(
      gridId,
      `${String.fromCharCode(65 + row)}`,
      effectiveSeatSpacing
    );

    // ✅ Row position is relative to grid (0, 0)
    rowShape.x = 0;
    rowShape.y = row * effectiveRowSpacing;
    rowShape.graphics.position.set(0, row * effectiveRowSpacing);
    rowShape.labelPlacement = "none";

    // Create seats for this row
    for (let seat = 0; seat < seatsPerRow; seat++) {
      // ✅ Seat position is relative to row (0, 0)
      const seatX = seat * effectiveSeatSpacing;
      const seatY = 0; // Centered in row

      const seatShape = createSeat(
        seatX,
        seatY,
        rowShape.id,
        gridId,
        row,
        seat,
        gridShape.seatSettings,
        true,
        generateShapeId()
      );

      seatShape.name = `${seat + 1}`;

      seats.push(seatShape);
      rowShape.children.push(seatShape);
      rowShape.graphics.addChild(seatShape.graphics);
    }

    if (rowShape.labelPlacement !== "none") {
      rowShape.labelGraphics = createRowLabel(rowShape);
      rowShape.graphics.addChild(rowShape.labelGraphics);
      updateRowLabelPosition(rowShape);
    }

    gridShape.children.push(rowShape);
    gridGraphics.addChild(rowShape.graphics);
  }

  // Add grid to area mode container
  if (areaModeContainer) {
    areaModeContainer.children.push(gridShape);
  }

  return seats;
};

/**
 * Calculate grid dimensions
 */
export const calculateGridDimensions = (
  width: number,
  height: number,
  seatSpacing?: number,
  rowSpacing?: number
): { rows: number; seatsPerRow: number } => {
  const effectiveSeatSpacing =
    seatSpacing || areaModeContainer?.defaultSeatSettings.seatSpacing || 25;
  const effectiveRowSpacing =
    rowSpacing || areaModeContainer?.defaultSeatSettings.rowSpacing || 30;

  const seatsPerRow = Math.max(1, Math.floor(width / effectiveSeatSpacing));
  const rows = Math.max(1, Math.floor(height / effectiveRowSpacing));

  return { rows, seatsPerRow };
};

/**
 * Update grid graphics
 */
export const updateGridGraphics = (grid: GridShape): void => {
  const rowsMap = new Map<string, RowShape>();
  const gridsMap = new Map<string, GridShape>();
  const allSeats: SeatShape[] = [];

  gridsMap.set(grid.id, grid);

  grid.children.forEach((row, rowIndex) => {
    rowsMap.set(row.id, row);
    allSeats.push(...row.children);

    row.y = rowIndex * grid.seatSettings.rowSpacing;
    row.graphics.position.set(row.x, row.y);

    updateRowGraphics(row, grid);
  });
};

/**
 * Update grid settings
 */
export const updateGridSettings = (
  gridId: string,
  settingsUpdate: Partial<SeatGridSettings>
): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return;

  grid.seatSettings = { ...grid.seatSettings, ...settingsUpdate };
  grid.children.forEach((row) => {
    row.seatSpacing = grid.seatSettings.seatSpacing;
  });
  updateGridGraphics(grid);
};

/**
 * Update multiple grid settings
 */
export const updateMultipleGridSettings = (
  gridIds: string[],
  settingsUpdate: Partial<SeatGridSettings>
): void => {
  gridIds.forEach((gridId) => {
    updateGridSettings(gridId, settingsUpdate);
  });
};

/**
 * Update all graphics
 */
export const updateAllGraphics = (): void => {
  if (!areaModeContainer) return;

  areaModeContainer.children.forEach((grid) => {
    updateGridGraphics(grid);
  });
};

/**
 * Update all seats
 */
export const updateAllSeats = (): void => {
  updateAllGraphics();
};

/**
 * Preserve seat individual settings
 */
export const preserveSeatIndividualSettings = (seatIds: string[]): void => {
  if (!areaModeContainer) return;

  const allSeats = areaModeContainer.children.flatMap((grid) =>
    grid.children.flatMap((row) => row.children)
  );

  seatIds.forEach((seatId) => {
    const seat = allSeats.find((s) => s.id === seatId);
    if (seat) {
      const { updateSeatGraphics } = require("./seat-shape");
      updateSeatGraphics(seat);
    }
  });
};

/**
 * ✅ Recreate GridShape
 */
export async function recreateGridShape(
  gridData: GridShape
): Promise<GridShape> {
  const gridGraphics = new PIXI.Container();
  gridGraphics.eventMode = "static";

  const recreatedGrid: GridShape = {
    id: gridData.id,
    name: gridData.name,
    type: "container",
    x: gridData.x,
    y: gridData.y,
    rotation: gridData.rotation || 0,
    scaleX: gridData.scaleX || 1,
    scaleY: gridData.scaleY || 1,
    opacity: gridData.opacity || 1,
    visible: gridData.visible,
    interactive: gridData.interactive,
    selected: gridData.selected || false,
    expanded: gridData.expanded,
    graphics: gridGraphics,
    children: [],
    gridName: gridData.gridName,
    seatSettings: { ...gridData.seatSettings },
    createdAt: gridData.createdAt,
  };

  // ✅ Recreate RowShape children with grid's seat settings
  if (gridData.children && gridData.children.length > 0) {
    for (let rowIndex = 0; rowIndex < gridData.children.length; rowIndex++) {
      const rowData = gridData.children[rowIndex];
      try {
        // ✅ If row spacing changed, update row Y position
        const updatedRowData = {
          ...rowData,
          y: rowIndex * recreatedGrid.seatSettings.rowSpacing, // Apply new row spacing
        };

        const recreatedRow = await recreateRowShape(
          updatedRowData,
          recreatedGrid.seatSettings // ✅ Pass grid's seat settings to row recreation
        );

        recreatedGrid.children.push(recreatedRow);
        gridGraphics.addChild(recreatedRow.graphics);
      } catch (error) {
        console.error(`Failed to recreate row in grid:`, error);
      }
    }
  }

  gridGraphics.position.set(recreatedGrid.x, recreatedGrid.y);
  gridGraphics.rotation = recreatedGrid.rotation;
  gridGraphics.scale.set(recreatedGrid.scaleX, recreatedGrid.scaleY);
  gridGraphics.alpha = recreatedGrid.opacity;
  gridGraphics.visible = recreatedGrid.visible;

  return recreatedGrid;
}

export const createNewGridFromSelection = () => {
  const updateShapes = useSeatMapStore.getState().updateShapes;
  const selectedShapes = useSeatMapStore.getState()
    .selectedShapes as SeatShape[];
  if (!areaModeContainer || selectedShapes.length === 0) return;

  // ✅ Capture the original grid state before extraction
  const originalGrid = getGridById(selectedShapes[0].gridId);
  if (!originalGrid) return;
  const originalGridClone = cloneCanvasItem(originalGrid);

  const newGrid = extractToNewGrid(selectedShapes, originalGrid);
  if (!newGrid) return;

  const modifiedOriginalGrid = cloneCanvasItem(originalGrid);
  const newGridClone = cloneCanvasItem(newGrid);

  // ✅ Save to history using _saveToHistory with proper context
  const context = {
    topLevel: [
      { id: originalGrid.id, type: "grid", parentId: null },
      { id: newGrid.id, type: "grid", parentId: null },
    ],
    nested: [],
    operation: "grid-extract",
  };

  const action = useSeatMapStore.getState()._saveToHistory(
    {
      shapes: [originalGridClone], // Before state: original grid
      selectedShapes: selectedShapes,
      context,
    },
    {
      shapes: [modifiedOriginalGrid, newGridClone], // After state: both grids
      selectedShapes: [newGrid],
      context,
    }
  );

  // Update with the entire shapes array
  const shapes = useSeatMapStore.getState().shapes;
  updateShapes([...shapes], false, undefined, false);
  SeatMapCollaboration.broadcastShapeChange(action);
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection([newGrid]);
  }
};

export function extractToNewGrid(
  selectedShapes: SeatShape[],
  originalGrid: GridShape,
  gridId?: string
): GridShape | undefined {
  const seatsByRow = new Map<string, SeatShape[]>();
  selectedShapes.forEach((seat) => {
    if (!seatsByRow.has(seat.rowId)) {
      seatsByRow.set(seat.rowId, []);
    }
    seatsByRow.get(seat.rowId)!.push(seat);
  });

  // ✅ Sort rows by their Y position to maintain order
  const sortedRowEntries = Array.from(seatsByRow.entries()).sort(
    ([, seatsA], [, seatsB]) => {
      const rowA = getRowById(originalGrid.id, seatsA[0].rowId);
      const rowB = getRowById(originalGrid.id, seatsB[0].rowId);
      return (rowA?.y || 0) - (rowB?.y || 0);
    }
  );

  // ✅ Get the first seat of the first row that was selected
  const firstRowSeats = sortedRowEntries[0][1];
  const firstRowOriginalRow = getRowById(
    originalGrid.id,
    sortedRowEntries[0][0]
  );
  if (!firstRowOriginalRow) return;

  // Sort seats in first row by X position to get the leftmost seat
  const firstSeat = firstRowSeats.sort((a, b) => a.x - b.x)[0];

  // ✅ Calculate the world position of the first seat WITHOUT rotation (for subtraction)
  const firstSeatWorldX = originalGrid.x + firstRowOriginalRow.x + firstSeat.x;
  const firstSeatWorldY = originalGrid.y + firstRowOriginalRow.y + firstSeat.y;

  // ✅ Get rotation values for grid and row
  const gridRotation = originalGrid.rotation || 0;
  const rowRotation = firstRowOriginalRow.rotation || 0;
  const totalRotation = gridRotation + rowRotation;

  // ✅ Calculate the rotated position of the first seat for grid placement
  let rotatedFirstSeatX = firstSeatWorldX;
  let rotatedFirstSeatY = firstSeatWorldY;

  if (totalRotation !== 0) {
    // Calculate relative position of first seat to grid center
    const relativeX = firstRowOriginalRow.x + firstSeat.x;
    const relativeY = firstRowOriginalRow.y + firstSeat.y;

    // Apply grid rotation
    const cos = Math.cos(gridRotation);
    const sin = Math.sin(gridRotation);

    const rotatedRelativeX = relativeX * cos - relativeY * sin;
    const rotatedRelativeY = relativeX * sin + relativeY * cos;

    // If row has additional rotation, apply it
    if (rowRotation !== 0) {
      const rowCos = Math.cos(rowRotation);
      const rowSin = Math.sin(rowRotation);

      // Apply row rotation to seat position relative to row
      const seatRelativeToRowX = firstSeat.x;
      const seatRelativeToRowY = firstSeat.y;

      const rotatedSeatX =
        seatRelativeToRowX * rowCos - seatRelativeToRowY * rowSin;
      const rotatedSeatY =
        seatRelativeToRowX * rowSin + seatRelativeToRowY * rowCos;

      // Combine with rotated row position
      rotatedFirstSeatX = originalGrid.x + rotatedRelativeX + rotatedSeatX;
      rotatedFirstSeatY = originalGrid.y + rotatedRelativeY + rotatedSeatY;
    } else {
      // Only grid rotation
      rotatedFirstSeatX = originalGrid.x + rotatedRelativeX;
      rotatedFirstSeatY = originalGrid.y + rotatedRelativeY;
    }
  }

  const newGridId = gridId || generateShapeId();
  const newGridGraphics = new PIXI.Container();
  const newGridName = areaModeContainer!.children.length + 1;
  newGridGraphics.eventMode = "static";

  // ✅ Set the position of the new grid to the ROTATED position of the first seat
  const newGrid: GridShape = {
    id: newGridId,
    name: `Grid ${newGridName}`,
    type: "container",
    x: rotatedFirstSeatX,
    y: rotatedFirstSeatY,
    rotation: originalGrid.rotation || 0, // ✅ Inherit rotation
    scaleX: originalGrid.scaleX || 1, // ✅ Inherit scale X
    scaleY: originalGrid.scaleY || 1, // ✅ Inherit scale Y
    opacity: originalGrid.opacity || 1, // ✅ Inherit opacity
    visible: originalGrid.visible, // ✅ Inherit visibility
    interactive: originalGrid.interactive, // ✅ Inherit interactivity
    selected: false,
    expanded: originalGrid.expanded, // ✅ Inherit expanded state
    graphics: newGridGraphics,
    children: [],
    gridName: `Grid ${newGridName}`,
    seatSettings: { ...originalGrid.seatSettings }, // ✅ Deep copy seat settings
    createdAt: new Date(),
  };

  // ✅ Apply all transform properties to graphics
  newGridGraphics.position.set(newGrid.x, newGrid.y);
  newGridGraphics.rotation = newGrid.rotation;
  newGridGraphics.scale.set(newGrid.scaleX, newGrid.scaleY);
  newGridGraphics.alpha = newGrid.opacity;
  newGridGraphics.visible = newGrid.visible;

  sortedRowEntries.forEach(([originalRowId, rowSeats]) => {
    const originalRow = getRowById(originalGrid.id, originalRowId);
    if (!originalRow) return;

    const newRow = createRowShape(
      newGridId,
      `${originalRow.rowName}`,
      originalRow.seatSpacing
    );

    // ✅ Calculate row position relative to the first seat's position (WITHOUT rotation)
    const originalRowWorldX = originalGrid.x + originalRow.x;
    const originalRowWorldY = originalGrid.y + originalRow.y;

    // ✅ Use the NON-ROTATED first seat coordinates for subtraction
    newRow.x = originalRowWorldX - firstSeatWorldX;
    newRow.y = originalRowWorldY - firstSeatWorldY;

    // ✅ Inherit row transform properties from original row
    newRow.rotation = originalRow.rotation || 0;
    newRow.scaleX = originalRow.scaleX || 1;
    newRow.scaleY = originalRow.scaleY || 1;
    newRow.opacity = originalRow.opacity || 1;
    newRow.visible = originalRow.visible;
    newRow.interactive = originalRow.interactive;
    newRow.expanded = originalRow.expanded;

    // ✅ Inherit row-specific properties
    newRow.seatSpacing = originalRow.seatSpacing;
    newRow.labelPlacement = originalRow.labelPlacement || "none";

    // ✅ Apply all transform properties to row graphics
    newRow.graphics.position.set(newRow.x, newRow.y);
    newRow.graphics.rotation = newRow.rotation;
    newRow.graphics.scale.set(newRow.scaleX, newRow.scaleY);
    newRow.graphics.alpha = newRow.opacity;
    newRow.graphics.visible = newRow.visible;

    // Remove seats from original row
    originalRow.children = originalRow.children.filter(
      (seat: SeatShape) => !rowSeats.find((rs) => rs.id === seat.id)
    );

    // ✅ Sort seats by their X position to maintain order
    const sortedSeats = rowSeats.sort((a, b) => a.x - b.x);

    sortedSeats.forEach((seat, index) => {
      // Remove from original graphics
      if (seat.graphics.parent) {
        seat.graphics.parent.removeChild(seat.graphics);
      }

      // ✅ Calculate original world position of this seat (WITHOUT rotation)
      const originalSeatWorldX = originalGrid.x + originalRow.x + seat.x;
      const originalSeatWorldY = originalGrid.y + originalRow.y + seat.y;

      // ✅ Subtract using NON-ROTATED first seat coordinates
      const newLocalX = originalSeatWorldX - firstSeatWorldX - newRow.x;
      const newLocalY = originalSeatWorldY - firstSeatWorldY - newRow.y;

      seat.name = `${index + 1}`;

      // Update seat properties
      seat.gridId = newGridId;
      seat.rowId = newRow.id;

      // ✅ Set seat position relative to first seat (non-rotated coordinates)
      seat.x = newLocalX;
      seat.y = newLocalY;

      // ✅ Update graphics position to match logical position
      seat.graphics.position.set(seat.x, seat.y);

      // Add to new row
      newRow.children.push(seat);
      newRow.graphics.addChild(seat.graphics);
    });

    // ✅ Recreate row label if it exists
    if (newRow.labelPlacement !== "none") {
      newRow.labelGraphics = createRowLabel(newRow);
      newRow.graphics.addChild(newRow.labelGraphics);
      updateRowLabelPosition(newRow);
    }

    newGrid.children.push(newRow);
    newGridGraphics.addChild(newRow.graphics);
  });

  // Add new grid to area mode container
  areaModeContainer!.children.push(newGrid);

  // Add new grid graphics to area mode container graphics
  if (areaModeContainer!.graphics) {
    areaModeContainer!.graphics.addChild(newGridGraphics);
  }

  // ✅ Update graphics for all affected rows to ensure proper event handling
  newGrid.children.forEach((row) => {
    updateRowGraphics(row, newGrid, false);
  });
  return newGrid;
}
