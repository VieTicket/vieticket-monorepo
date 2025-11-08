import * as PIXI from "pixi.js";
import { SeatShape, SeatGridSettings, GridData, RowData } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";
import { areaModeContainer, shapes } from "../variables";
import { cloneCanvasItem, useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "../events/transform-events";

// ✅ Setter for seat grid settings
export const setSeatGridSettings = (settings: Partial<SeatGridSettings>) => {
  areaModeContainer!.defaultSeatSettings = {
    ...areaModeContainer!.defaultSeatSettings,
    ...settings,
  };
};

// ✅ Create a single seat shape with proper typing
export const applyBendToRow = (rowId: string, bendValue: number): void => {
  if (!areaModeContainer) return;

  const seats = getSeatsByRowId(rowId);
  if (seats.length < 2) return;

  // Sort seats by x position to maintain order
  const sortedSeats = [...seats].sort((a, b) => a.x - b.x);

  // Calculate row bounds
  const minX = Math.min(...sortedSeats.map((seat) => seat.x));
  const maxX = Math.max(...sortedSeats.map((seat) => seat.x));
  const centerX = (minX + maxX) / 2;
  const rowWidth = maxX - minX;
  const baseY = sortedSeats[0].y; // Assume all seats in row have same base Y

  // Apply bend curve to each seat
  sortedSeats.forEach((seat) => {
    // Calculate normalized position along the row (-1 to 1)
    const normalizedX = (seat.x - centerX) / (rowWidth / 2);

    // Apply quadratic bend curve
    const bendOffset =
      bendValue * rowWidth * 0.5 * (1 - normalizedX * normalizedX);

    // Update seat position
    seat.y = baseY + bendOffset;
    seat.graphics.position.set(seat.x, seat.y);
  });
};

// ✅ Set bend value for a row
export const setRowBend = (rowId: string, bendValue: number): void => {
  if (!areaModeContainer) return;

  // Update row data
  for (const grid of areaModeContainer.grids) {
    const row = grid.rows.find((r) => r.id === rowId);
    if (row) {
      row.bend = bendValue;
      break;
    }
  }

  // Apply bend to seats
  applyBendToRow(rowId, bendValue);
};

// ✅ Get bend value for a row
export const getRowBend = (rowId: string): number => {
  if (!areaModeContainer) return 0;

  for (const grid of areaModeContainer.grids) {
    const row = grid.rows.find((r) => r.id === rowId);
    if (row) {
      return row.bend || 0;
    }
  }

  return 0;
};

// ✅ Reset bend for a row
export const resetRowBend = (rowId: string): void => {
  setRowBend(rowId, 0);
};

// ✅ Reset bend for all rows in a grid
export const resetGridBend = (gridId: string): void => {
  const grid = getGridById(gridId);
  if (!grid) return;

  grid.rows.forEach((row) => {
    resetRowBend(row.id);
  });
};

/**
 * ✅ Get seat settings from grid data, not default settings
 */
const getSeatSettingsForGrid = (gridId: string): SeatGridSettings => {
  const grid = getGridById(gridId);
  if (grid) {
    return grid.seatSettings;
  }

  // Fallback to default only if grid not found
  return (
    areaModeContainer?.defaultSeatSettings || {
      seatSpacing: 25,
      rowSpacing: 30,
      seatRadius: 8,
      seatColor: 0x4caf50,
      seatStrokeColor: 0x2e7d0f,
      seatStrokeWidth: 1,
      price: 0,
    }
  );
};

// ✅ Update createSeat to use grid-specific settings
export const createSeat = (
  x: number,
  y: number,
  rowId: string,
  gridId: string,
  rowNumber: number,
  seatNumber: number,
  settings?: SeatGridSettings, // Make optional, will get from grid if not provided
  addShapeEvents: boolean = true,
  id: string = generateShapeId(),
  applyRowBend: boolean = true
): SeatShape => {
  // ✅ Use grid-specific settings if not provided
  const seatSettings = settings || getSeatSettingsForGrid(gridId);

  const graphics = new PIXI.Graphics();

  // Draw seat as circle
  graphics
    .ellipse(0, 0, seatSettings.seatRadius, seatSettings.seatRadius)
    .fill(seatSettings.seatColor)
    .stroke({
      width: seatSettings.seatStrokeWidth,
      color: seatSettings.seatStrokeColor,
    });

  // ✅ Apply row bend if needed
  let finalY = y;
  if (applyRowBend) {
    const bendValue = getRowBend(rowId);
    if (bendValue !== 0) {
      // Calculate bend offset for this seat
      const rowSeats = getSeatsByRowId(rowId);
      if (rowSeats.length > 1) {
        const minX = Math.min(...rowSeats.map((s) => s.x));
        const maxX = Math.max(...rowSeats.map((s) => s.x));
        const centerX = (minX + maxX) / 2;
        const rowWidth = maxX - minX;

        if (rowWidth > 0) {
          const normalizedX = (x - centerX) / (rowWidth / 2);
          const bendOffset =
            bendValue * rowWidth * 0.5 * (1 - normalizedX * normalizedX);
          finalY = y + bendOffset;
        }
      }
    }
  }

  graphics.position.set(x, finalY);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
  graphics.interactive = true;

  const seat: SeatShape = {
    id,
    name: `${seatNumber + 1}`,
    type: "ellipse",
    graphics,
    x,
    y: finalY,
    radiusX: seatSettings.seatRadius,
    radiusY: seatSettings.seatRadius,
    color: seatSettings.seatColor,
    strokeColor: seatSettings.seatStrokeColor,
    strokeWidth: seatSettings.seatStrokeWidth,
    selected: false,
    visible: true,
    interactive: true,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    rowId,
    gridId,
  };

  const eventManager = getEventManager();
  if (eventManager && addShapeEvents) {
    eventManager.addShapeEvents(seat);
  }

  return seat;
};

// ✅ Update createSeatGrid to use proper settings and naming
export const createSeatGrid = (
  startX: number,
  startY: number,
  rows: number,
  seatsPerRow: number,
  seatSpacing?: number,
  rowSpacing?: number,
  gridName: string = `Grid ${areaModeContainer?.grids!.length! + 1}`,
  basePrice?: number
): SeatShape[] => {
  const seats: SeatShape[] = [];
  const gridId = generateShapeId();

  // ✅ Use provided values or defaults, but prefer grid-specific settings
  const effectiveSeatSpacing =
    seatSpacing || areaModeContainer?.defaultSeatSettings.seatSpacing || 25;
  const effectiveRowSpacing =
    rowSpacing || areaModeContainer?.defaultSeatSettings.rowSpacing || 30;
  const effectivePrice =
    basePrice ?? areaModeContainer?.defaultSeatSettings.price ?? 0;

  // ✅ Create grid data with proper structure
  const gridData: GridData = {
    id: gridId,
    name: gridName,
    rows: [],
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

  for (let row = 0; row < rows; row++) {
    const rowId = generateShapeId();

    // ✅ Create row data with proper structure
    const rowData: RowData = {
      id: rowId,
      name: `${String.fromCharCode(65 + row)}`, // A, B, C, etc.
      seats: [],
      bend: 0,
    };

    for (let seat = 0; seat < seatsPerRow; seat++) {
      // Center the seats within the spacing
      const seatX =
        startX + seat * effectiveSeatSpacing + effectiveSeatSpacing / 2;
      const seatY =
        startY + row * effectiveRowSpacing + effectiveRowSpacing / 2;

      const seatShape = createSeat(
        seatX,
        seatY,
        rowId,
        gridId,
        row,
        seat,
        gridData.seatSettings, // Use grid-specific settings
        true,
        generateShapeId()
      );

      // ✅ Better naming: Row A Seat 1, Row B Seat 2, etc.
      seatShape.name = `${seat + 1}`;

      seats.push(seatShape);
      rowData.seats.push(seatShape.id);
    }

    gridData.rows.push(rowData);
  }

  // ✅ Add grid data to area mode container
  if (areaModeContainer) {
    areaModeContainer.grids.push(gridData);
  }

  return seats;
};

// ✅ Update calculateGridDimensions to use grid-specific settings
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

export const selectSeatsInRow = (rowId: string): void => {
  if (!areaModeContainer) return;
  const seats = getSeatsByRowId(rowId);
  if (seats.length === 0) return;
  seats.forEach((seat) => (seat.selected = true));
  useSeatMapStore.getState().setSelectedShapes(seats);
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(seats);
  }
};

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

// ✅ Get seats by row ID
export const getSeatsByRowId = (rowId: string): SeatShape[] => {
  if (!areaModeContainer) return [];

  const allSeats = areaModeContainer.children.filter(
    (child): child is SeatShape => child.type === "ellipse"
  );

  return allSeats.filter((seat) => seat.rowId === rowId);
};

// ✅ Get seats by grid ID
export const getSeatsByGridId = (gridId: string): SeatShape[] => {
  if (!areaModeContainer) return [];

  const allSeats = areaModeContainer.children.filter(
    (child): child is SeatShape => child.type === "ellipse"
  );

  return allSeats.filter((seat) => seat.gridId === gridId);
};

// ✅ Get grid data by ID
export const getGridById = (gridId: string): GridData | undefined => {
  if (!areaModeContainer) return undefined;

  return areaModeContainer.grids.find((grid) => grid.id === gridId);
};

// ✅ Get row data by ID
export const getRowById = (
  gridId: string,
  rowId: string
): RowData | undefined => {
  const grid = getGridById(gridId);
  if (!grid) return undefined;

  return grid.rows.find((row) => row.id === rowId);
};

// ✅ Create new grid from selected seats
export const createNewGridFromSelection = () => {
  const updateShapes = useSeatMapStore.getState().updateShapes;
  const selectedShapes = useSeatMapStore.getState()
    .selectedShapes as SeatShape[];
  if (!areaModeContainer || selectedShapes.length === 0) return;

  const before = cloneCanvasItem(areaModeContainer);

  // Group seats by row
  const seatsByRow = new Map<string, SeatShape[]>();
  selectedShapes.forEach((seat) => {
    if (!seatsByRow.has(seat.rowId)) {
      seatsByRow.set(seat.rowId, []);
    }
    seatsByRow.get(seat.rowId)!.push(seat);
  });

  // Get original grid for copying settings
  const originalGrid = getGridById(selectedShapes[0].gridId);
  if (!originalGrid) return;

  // Create new grid
  const newGridId = generateShapeId();
  const newGrid: GridData = {
    id: newGridId,
    name: `${originalGrid.name}`,
    rows: [],
    seatSettings: { ...originalGrid.seatSettings }, // Copy settings
    createdAt: new Date(),
  };

  // Create new rows and update seat references
  seatsByRow.forEach((rowSeats, originalRowId) => {
    const originalRow = getRowById(originalGrid.id, originalRowId);
    if (!originalRow) return;

    const newRowId = generateShapeId();

    // Create new row with copied settings
    const newRow: RowData = {
      id: newRowId,
      name: `${originalRow.name}`,
      seats: [],
      bend: originalRow.bend,
      seatSpacing: originalRow.seatSpacing,
    };

    // Update seat references to new grid and row
    rowSeats.forEach((seat, index) => {
      seat.gridId = newGridId;
      seat.rowId = newRowId;
      seat.name = `${newRow.name} Seat ${index + 1}`;
      newRow.seats.push(seat.id);
    });

    newGrid.rows.push(newRow);

    const removeIndex = originalRow.seats.findIndex(
      (id) => rowSeats[0].id === id
    );
    if (removeIndex !== -1) {
      originalRow.seats.splice(removeIndex, rowSeats.length);
    }
  });

  // Add new grid to container
  areaModeContainer.grids.push(newGrid);
  // Update store and history
  updateShapes([...shapes], false);
  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection(selectedShapes);
  }

  const after = cloneCanvasItem(areaModeContainer);
  useSeatMapStore.getState().saveDirectHistory([before], [after]);
};

// ✅ Remove seat from grid data
export const removeSeatFromGrid = (seatId: string): void => {
  if (!areaModeContainer) return;

  areaModeContainer.grids.forEach((grid) => {
    grid.rows.forEach((row) => {
      const seatIndex = row.seats.indexOf(seatId);
      if (seatIndex !== -1) {
        row.seats.splice(seatIndex, 1);
      }
    });
  });
};

// ✅ Remove multiple seats from grid data
export const removeSeatsFromGrid = (seatIds: string[]): void => {
  if (!areaModeContainer) return;

  seatIds.forEach((seatId) => {
    removeSeatFromGrid(seatId);
  });
};

// ✅ Add seat to grid data (for recreation)
export const addSeatToGrid = (seat: SeatShape): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.grids.find((g) => g.id === seat.gridId);
  if (!grid) {
    return;
  }

  const row = grid.rows.find((r) => r.id === seat.rowId);
  if (!row) {
    return;
  }

  // Add seat ID if not already present
  if (!row.seats.includes(seat.id)) {
    row.seats.push(seat.id);
  }
};

// ✅ Clean up empty rows and grids
export const cleanupEmptyGrids = (): void => {
  if (!areaModeContainer) return;

  // Remove empty rows
  areaModeContainer.grids.forEach((grid) => {
    grid.rows = grid.rows.filter((row) => row.seats.length > 0);
  });

  // Remove empty grids
  areaModeContainer.grids = areaModeContainer.grids.filter(
    (grid) => grid.rows.length > 0
  );
};

// ✅ Get seat data for recreation
export const getSeatCreationData = (
  seatId: string
): {
  gridId: string;
  rowId: string;
  rowNumber: number;
  seatNumber: number;
  settings: SeatGridSettings;
} | null => {
  if (!areaModeContainer) return null;

  for (const grid of areaModeContainer.grids) {
    for (let rowIndex = 0; rowIndex < grid.rows.length; rowIndex++) {
      const row = grid.rows[rowIndex];
      const seatIndex = row.seats.indexOf(seatId);

      if (seatIndex !== -1) {
        return {
          gridId: grid.id,
          rowId: row.id,
          rowNumber: rowIndex,
          seatNumber: seatIndex,
          settings: grid.seatSettings,
        };
      }
    }
  }

  return null;
};

// ✅ Recreate seat with proper grid data
export const recreateSeat = (
  seatData: SeatShape,
  addShapeEvents: boolean = true
): SeatShape => {
  const recreatedSeat = createSeat(
    seatData.x,
    seatData.y,
    seatData.rowId,
    seatData.gridId,
    0, // Will be updated below
    0, // Will be updated below
    areaModeContainer?.defaultSeatSettings || {
      seatSpacing: 25,
      rowSpacing: 30,
      seatRadius: 8,
      seatColor: 0x4caf50,
      seatStrokeColor: 0x2e7d0f,
      seatStrokeWidth: 1,
      price: 100000,
    },
    addShapeEvents,
    seatData.id
  );

  // Copy all properties from original seat data
  Object.assign(recreatedSeat, seatData, {
    graphics: recreatedSeat.graphics, // Keep the new graphics
  });

  // Add seat back to grid data
  addSeatToGrid(recreatedSeat);

  return recreatedSeat;
};

// ✅ Get pricing information for a seat
export const getSeatPrice = (seatId: string): number => {
  if (!areaModeContainer) return 0;

  for (const grid of areaModeContainer.grids) {
    for (const row of grid.rows) {
      if (row.seats.includes(seatId)) {
        // Return row price if set, otherwise grid price
        return grid.seatSettings.price;
      }
    }
  }

  return 0;
};

// ✅ Get total revenue for a grid
export const getGridRevenue = (gridId: string): number => {
  const grid = getGridById(gridId);
  if (!grid) return 0;

  let totalRevenue = 0;

  grid.rows.forEach((row) => {
    const rowPrice = grid.seatSettings.price;
    totalRevenue += row.seats.length * rowPrice;
  });

  return totalRevenue;
};

// ✅ Get total revenue for all grids
export const getTotalRevenue = (): number => {
  if (!areaModeContainer) return 0;

  return areaModeContainer.grids.reduce((total, grid) => {
    return total + getGridRevenue(grid.id);
  }, 0);
};

// ✅ Simple seat graphics update - only updates visual appearance
export const updateSeatGraphics = (seat: SeatShape): void => {
  if (!seat.graphics) return;

  // Clear and redraw graphics with current seat properties
  seat.graphics.clear();
  seat.graphics
    .ellipse(0, 0, seat.radiusX, seat.radiusY)
    .fill(seat.color)
    .stroke({
      width: seat.strokeWidth,
      color: seat.strokeColor,
    });

  // Update position and transforms
  seat.graphics.position.set(seat.x, seat.y);
  seat.graphics.rotation = seat.rotation || 0;
  seat.graphics.scale.set(seat.scaleX || 1, seat.scaleY || 1);
  seat.graphics.alpha = seat.opacity || 1;
  seat.graphics.visible = seat.visible;
};

// ✅ Update all seats in a row with row-specific settings and positioning
export const updateRowGraphics = (rowId: string): void => {
  const row = getRowByIdFromAllGrids(rowId);
  const grid = getGridByRowId(rowId);

  if (!row || !grid) {
    console.warn(`Row ${rowId} or its grid not found`);
    return;
  }

  const rowSeats = getSeatsByRowId(rowId);
  if (rowSeats.length === 0) return;

  // Sort seats by X position to maintain order
  const sortedSeats = [...rowSeats].sort((a, b) => a.x - b.x);

  // Apply row-specific settings to each seat
  sortedSeats.forEach((seat, index) => {
    // Update seat properties from grid settings (rows don't override visual properties yet)
    seat.radiusX = grid.seatSettings.seatRadius;
    seat.radiusY = grid.seatSettings.seatRadius;
    seat.color = grid.seatSettings.seatColor;
    seat.strokeColor = grid.seatSettings.seatStrokeColor;
    seat.strokeWidth = grid.seatSettings.seatStrokeWidth;

    // Apply row-specific positioning
    const effectiveSpacing = row.seatSpacing || grid.seatSettings.seatSpacing;
    const baseX =
      sortedSeats[0].x -
      sortedSeats.findIndex((s) => s.id === sortedSeats[0].id) *
        effectiveSpacing;
    seat.x = baseX + index * effectiveSpacing;

    // Apply row bend if it exists
    if (row.bend && row.bend !== 0) {
      const rowWidth = (sortedSeats.length - 1) * effectiveSpacing;
      const centerX = baseX + rowWidth / 2;
      const normalizedX =
        rowWidth > 0 ? (seat.x - centerX) / (rowWidth / 2) : 0;
      const bendOffset =
        row.bend * rowWidth * 0.5 * (1 - normalizedX * normalizedX);
      seat.y = sortedSeats[0].y + bendOffset;
    }

    // Update the graphics
    updateSeatGraphics(seat);
  });
};

// ✅ Update all seats in a grid with grid-specific settings and positioning
export const updateGridGraphics = (gridId: string): void => {
  const grid = getGridById(gridId);
  if (!grid) {
    console.warn(`Grid ${gridId} not found`);
    return;
  }

  const gridSeats = getSeatsByGridId(gridId);
  if (gridSeats.length === 0) return;

  // Group seats by row
  const seatsByRow = new Map<string, SeatShape[]>();
  gridSeats.forEach((seat) => {
    if (!seatsByRow.has(seat.rowId)) {
      seatsByRow.set(seat.rowId, []);
    }
    seatsByRow.get(seat.rowId)!.push(seat);
  });

  // Get grid positioning reference
  const firstSeat = gridSeats[0];
  const gridStartX = firstSeat.x;
  const gridStartY = firstSeat.y;

  // Update each row in the grid
  grid.rows.forEach((row, rowIndex) => {
    const rowSeats = seatsByRow.get(row.id);
    if (!rowSeats || rowSeats.length === 0) return;

    // Sort seats in this row
    const sortedRowSeats = [...rowSeats].sort((a, b) => a.x - b.x);

    sortedRowSeats.forEach((seat, seatIndex) => {
      // Apply grid-level settings
      seat.radiusX = grid.seatSettings.seatRadius;
      seat.radiusY = grid.seatSettings.seatRadius;
      seat.color = grid.seatSettings.seatColor;
      seat.strokeColor = grid.seatSettings.seatStrokeColor;
      seat.strokeWidth = grid.seatSettings.seatStrokeWidth;

      // Apply grid-level positioning
      seat.x = gridStartX + seatIndex * grid.seatSettings.seatSpacing;
      seat.y = gridStartY + rowIndex * grid.seatSettings.rowSpacing;

      // Apply row bend if it exists
      if (row.bend && row.bend !== 0) {
        const rowWidth =
          (sortedRowSeats.length - 1) * grid.seatSettings.seatSpacing;
        const centerX = seat.x + rowWidth / 2;
        const normalizedX =
          rowWidth > 0 ? (seat.x - centerX) / (rowWidth / 2) : 0;
        const bendOffset =
          row.bend * rowWidth * 0.5 * (1 - normalizedX * normalizedX);
        seat.y += bendOffset;
      }

      // Update the graphics
      updateSeatGraphics(seat);
    });
  });
};

// ✅ Update all seats in all grids
export const updateAllGraphics = (): void => {
  if (!areaModeContainer) return;

  areaModeContainer.grids.forEach((grid) => {
    updateGridGraphics(grid.id);
  });
};

// ✅ Helper functions for finding data
export const getRowByIdFromAllGrids = (rowId: string): RowData | undefined => {
  if (!areaModeContainer) return undefined;

  for (const grid of areaModeContainer.grids) {
    const row = grid.rows.find((r) => r.id === rowId);
    if (row) return row;
  }
  return undefined;
};

const getGridByRowId = (rowId: string): GridData | undefined => {
  if (!areaModeContainer) return undefined;

  for (const grid of areaModeContainer.grids) {
    const row = grid.rows.find((r) => r.id === rowId);
    if (row) return grid;
  }
  return undefined;
};

// ✅ Simple update functions that call the appropriate graphics update
export const updateGridSettings = (
  gridId: string,
  settingsUpdate: Partial<SeatGridSettings>
): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.grids.find((g) => g.id === gridId);
  if (!grid) return;

  // Update grid settings
  grid.seatSettings = { ...grid.seatSettings, ...settingsUpdate };

  // Update all graphics in this grid
  updateGridGraphics(gridId);
};

export const updateRowSettings = (
  gridId: string,
  rowId: string,
  settingsUpdate: Partial<RowData>
): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.grids.find((g) => g.id === gridId);
  if (!grid) return;

  const row = grid.rows.find((r) => r.id === rowId);
  if (!row) return;

  // Update row settings
  Object.assign(row, settingsUpdate);

  // Update all graphics in this row
  updateRowGraphics(rowId);
};

// ✅ Bulk update functions
export const updateMultipleGridSettings = (
  gridIds: string[],
  settingsUpdate: Partial<SeatGridSettings>
): void => {
  gridIds.forEach((gridId) => {
    updateGridSettings(gridId, settingsUpdate);
  });
};

export const updateMultipleRowSettings = (
  rowUpdates: Array<{
    gridId: string;
    rowId: string;
    settings: Partial<RowData>;
  }>
): void => {
  rowUpdates.forEach(({ gridId, rowId, settings }) => {
    updateRowSettings(gridId, rowId, settings);
  });
};

// ✅ Force update functions for specific use cases
export const forceGridSettingsOnAllSeats = (gridId: string): void => {
  updateGridGraphics(gridId);
};

export const forceRowSettingsOnRowSeats = (rowId: string): void => {
  updateRowGraphics(rowId);
};

export const preserveSeatIndividualSettings = (seatIds: string[]): void => {
  if (!areaModeContainer) return;

  const allSeats = areaModeContainer.children.filter(
    (child): child is SeatShape => child.type === "ellipse"
  );

  seatIds.forEach((seatId) => {
    const seat = allSeats.find((s) => s.id === seatId);
    if (seat) {
      updateSeatGraphics(seat);
    }
  });
};

// ✅ Legacy function wrappers for backward compatibility
export const updateRowSeats = (rowId: string): void => {
  updateRowGraphics(rowId);
};

export const updateGridSeats = (gridId: string): void => {
  updateGridGraphics(gridId);
};

export const updateAllSeats = (): void => {
  updateAllGraphics();
};
