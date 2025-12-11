import * as PIXI from "pixi.js";
import {
  RowShape,
  SeatShape,
  SeatLabelStyle,
  GridShape,
  SeatGridSettings,
} from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { areaModeContainer, shapes } from "../variables";
import {
  cloneCanvasItem,
  cloneCanvasItems,
  ShapeContext,
  useSeatMapStore,
} from "../store/seat-map-store";
import { getSelectionTransform } from "../events/transform-events";
import {
  updateSeatGraphics,
  setSeatLabelVisibility,
  updateSeatLabelStyle,
  recreateSeat,
  createPixiTextStyle,
  DEFAULT_LABEL_STYLE,
  updateSeatLabelRotation,
  createSeat,
} from "./seat-shape";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";

/**
 * Get seats by row ID (updated for new structure)
 */
export const getSeatsByRowId = (rowId: string): SeatShape[] => {
  if (!areaModeContainer) return [];

  for (const grid of areaModeContainer.children) {
    const row = grid.children.find((r) => r.id === rowId);
    if (row) {
      return row.children;
    }
  }
  return [];
};

/**
 * Get row by ID (updated for new structure)
 */
export const getRowById = (
  gridId: string,
  rowId: string
): RowShape | undefined => {
  if (!areaModeContainer) return undefined;

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return undefined;

  return grid.children.find((r) => r.id === rowId) as RowShape;
};

/**
 * Get row from all grids by row ID
 */
export const getRowByIdFromAllGrids = (rowId: string): RowShape | undefined => {
  if (!areaModeContainer) return undefined;

  for (const grid of areaModeContainer.children) {
    const row = grid.children.find((r) => r.id === rowId);
    if (row) return row;
  }
  return undefined;
};

/**
 * Get grid by row ID
 */
export const getGridByRowId = (rowId: string): GridShape | undefined => {
  if (!areaModeContainer) return undefined;

  for (const grid of areaModeContainer.children) {
    const row = grid.children.find((r) => r.id === rowId);
    if (row) return grid;
  }
  return undefined;
};

export const resetRowBend = (rowId: string): void => {
  applyBendToRow(rowId, 0);
};

export const getSeatsInRow = (rowId: string): SeatShape[] => {
  if (!areaModeContainer) return [];

  for (const grid of areaModeContainer.children) {
    const row = grid.children.find((r) => r.id === rowId);
    if (row) {
      return row.children;
    }
  }
  return [];
};

/**
 * Select all seats in a row
 */
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

/**
 * Set labels visibility for all seats in a row
 */
export const setRowLabelsVisibility = (
  rowId: string,
  visible: boolean
): void => {
  const seats = getSeatsByRowId(rowId) as SeatShape[];
  seats.forEach((seat) => setSeatLabelVisibility(seat, visible));
};

/**
 * Update label style for all seats in a row
 */
export const updateRowLabelStyle = (
  rowId: string,
  styleUpdate: Partial<SeatLabelStyle>
): void => {
  const seats = getSeatsByRowId(rowId) as SeatShape[];
  seats.forEach((seat) => updateSeatLabelStyle(seat, styleUpdate));
};

/**
 * ✅ Updated updateRowGraphics to handle label positioning
 */
export const updateRowGraphics = (
  row: RowShape,
  gridByRow?: GridShape,
  updateRowLabel: boolean = true
): void => {
  const grid = gridByRow || getGridByRowId(row.id);

  if (!grid) {
    console.warn(`Row ${row.id} or its grid not found`);
    return;
  }

  // Update seat positions and graphics
  row.children.forEach((seat, index) => {
    seat.radiusX = grid.seatSettings.seatRadius;
    seat.radiusY = grid.seatSettings.seatRadius;
    seat.color = grid.seatSettings.seatColor;
    seat.strokeColor = grid.seatSettings.seatStrokeColor;
    seat.strokeWidth = grid.seatSettings.seatStrokeWidth;

    const effectiveSpacing =
      getCorrectSeatSpacing(grid) !== -1
        ? grid.seatSettings.seatSpacing
        : row.seatSpacing;
    const baseX =
      row.children[0].x -
      row.children.findIndex((s) => s.id === row.children[0].id) *
        effectiveSpacing;
    seat.x = baseX + index * effectiveSpacing;

    updateSeatGraphics(seat);
    updateSeatLabelRotation(seat, row, grid);
  });

  if (updateRowLabel) {
    updateRowLabelPosition(row);
  }
};

export const getCorrectSeatSpacing = (grid: GridShape): number => {
  const found = grid.children.every(
    (row) => row.seatSpacing !== grid.seatSettings.seatSpacing
  );
  return found ? grid.seatSettings.seatSpacing : -1;
};

/**
 * Update row settings (for UI interactions - applies changes to seats)
 */
export const updateRowSettings = (
  gridId: string,
  rowId: string,
  settingsUpdate: Partial<RowShape>
): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return;

  const row = grid.children.find((r) => r.id === rowId) as RowShape;
  if (!row) return;

  Object.assign(row, settingsUpdate);

  updateRowGraphics(row);
};

/**
 * Update multiple row settings
 */
export const updateMultipleRowSettings = (
  rowUpdates: Array<{
    gridId: string;
    rowId: string;
    settings: Partial<RowShape>;
  }>
): void => {
  rowUpdates.forEach(({ gridId, rowId, settings }) => {
    updateRowSettings(gridId, rowId, settings);
  });
};

/**
 * Add seats to an existing row
 */
export const addSeatsToRow = (
  gridId: string,
  rowId: string,
  count: number
): SeatShape | undefined => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return;

  const row = grid.children.find((r) => r.id === rowId) as RowShape;
  if (!row) return;

  const startIndex = row.children.length;
  const seatSpacing = row.seatSpacing || grid.seatSettings.seatSpacing;

  // ✅ Calculate the Y position pattern from existing seats
  let calculateSeatY = (index: number): number => {
    if (row.children.length === 0) {
      // No existing seats, start at Y = 0
      return 0;
    } else if (row.children.length === 1) {
      // Only one seat exists, maintain same Y
      return row.children[0].y;
    } else {
      // ✅ Multiple seats exist - extrapolate the bend pattern
      const sortedSeats = [...row.children].sort((a, b) => a.x - b.x);
      const lastSeat = sortedSeats[sortedSeats.length - 1];
      const secondLastSeat = sortedSeats[sortedSeats.length - 2];

      // Calculate the Y difference between the last two seats
      const yDelta = lastSeat.y - secondLastSeat.y;

      // For the first new seat, continue the pattern
      if (index === startIndex) {
        return lastSeat.y + yDelta;
      } else {
        // For subsequent new seats, continue extrapolating
        const offsetFromStart = index - startIndex;
        return lastSeat.y + yDelta * (offsetFromStart + 1);
      }
    }
  };
  let seat;
  for (let i = 0; i < count; i++) {
    const seatIndex = startIndex + i;
    const seatX = seatIndex * seatSpacing;
    const seatY = calculateSeatY(seatIndex); // ✅ Calculate Y based on bend pattern

    seat = createSeat(
      seatX,
      seatY, // ✅ Use the calculated Y position
      rowId,
      gridId,
      grid.children.indexOf(row),
      seatIndex,
      grid.seatSettings,
      true,
      generateShapeId()
    );
    seat.name = `${seatIndex + 1}`;
    row.children.push(seat);
    row.graphics.addChild(seat.graphics);
  }

  updateRowLabelPosition(row);
  return seat;
};

/**
 * Reverse seat labels in a row (e.g., 1,2,3 -> 3,2,1)
 */
export const reverseRowSeatLabels = (gridId: string, rowId: string): void => {
  if (!areaModeContainer) return;

  const row = getRowById(gridId, rowId);
  if (!row) return;

  const sortedSeats = [...row.children].sort((a, b) => a.x - b.x);
  const labels = sortedSeats.map((seat) => seat.name);
  labels.reverse();

  sortedSeats.forEach((seat, index) => {
    seat.name = labels[index];
    updateSeatGraphics(seat);
  });
};

/**
 * Renumber seats with custom start number and step
 */
export const renumberSeatsInRow = (
  gridId: string,
  rowId: string,
  startNumber: number,
  step: number
): void => {
  if (!areaModeContainer) return;

  const row = getRowById(gridId, rowId);
  if (!row) return;

  const sortedSeats = [...row.children].sort((a, b) => a.x - b.x);

  sortedSeats.forEach((seat, index) => {
    seat.name = `${startNumber + index * step}`;
    updateSeatGraphics(seat);
  });
};

/**
 * Rename row starting from a specific letter
 */
export const renameRowFromLetter = (
  gridId: string,
  rowId: string,
  startLetter: string
): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return;

  const row = grid.children.find((r) => r.id === rowId) as RowShape;
  if (!row) return;

  const startCharCode = startLetter.toUpperCase().charCodeAt(0);
  row.rowName = startLetter.toUpperCase();
  row.name = startLetter.toUpperCase();

  if (row.labelGraphics) {
    row.labelGraphics.text = row.rowName;
  }
};

/**
 * ✅ Create row label graphics
 */
export const createRowLabel = (
  row: RowShape,
  labelStyle?: SeatLabelStyle
): PIXI.Text => {
  const defaultLabelStyle = {
    fontFamily: "Arial",
    fontSize: 12,
    fill: "black",
    fontWeight: "bold",
    align: "center",
  };

  const style = createPixiTextStyle(labelStyle || defaultLabelStyle);
  const labelText = new PIXI.Text({
    text: row.rowName,
    style: style,
  });

  labelText.anchor.set(0.5, 0.5);
  return labelText;
};

/**
 * ✅ Restore row settings (for undo/redo - only updates row properties, not seats)
 */
export const restoreRowSettings = (
  gridId: string,
  rowId: string,
  settingsUpdate: Partial<RowShape>
): void => {
  if (!areaModeContainer) return;

  const grid = areaModeContainer.children.find(
    (g) => g.id === gridId
  ) as GridShape;
  if (!grid) return;

  const row = grid.children.find((r) => r.id === rowId) as RowShape;
  if (!row) return;

  // Only update the row properties, don't propagate to graphics/seats
  Object.assign(row, settingsUpdate);

  // Update only label-related graphics without recalculating seat positions
  if (settingsUpdate.rowName !== undefined && row.labelGraphics) {
    row.labelGraphics.text = settingsUpdate.rowName;
  }

  if (settingsUpdate.labelPlacement !== undefined) {
    if (settingsUpdate.labelPlacement === "none") {
      if (row.labelGraphics) {
        row.labelGraphics.visible = false;
      }
    } else {
      if (!row.labelGraphics) {
        row.labelGraphics = createRowLabel(row);
        row.graphics.addChild(row.labelGraphics);
      }
      row.labelGraphics.text = row.rowName;
      updateRowLabelPosition(row);
      updateRowLabelRotation(row);
    }
  }
};

export const restoreRowLabelPlacement = (
  row: RowShape,
  placement: "left" | "middle" | "right" | "none"
): void => {
  row.labelPlacement = placement;

  if (placement === "none") {
    if (row.labelGraphics) {
      row.labelGraphics.visible = false;
    }
    return;
  }

  // Create label if it doesn't exist
  if (!row.labelGraphics) {
    row.labelGraphics = createRowLabel(row);
    row.graphics.addChild(row.labelGraphics);
  }

  // Update label text and position
  row.labelGraphics.text = row.rowName;
  updateRowLabelPosition(row);
  updateRowLabelRotation(row);
};

export const updateRowLabelPosition = (row: RowShape): void => {
  if (
    !row.labelGraphics ||
    row.labelPlacement === "none" ||
    row.children.length === 0
  ) {
    if (row.labelGraphics) {
      row.labelGraphics.visible = false;
    }
    return;
  }
  row.labelGraphics.text = row.rowName || row.name;
  row.labelGraphics.visible = true;
  const seats = row.children;
  const sortedSeats = [...seats].sort((a, b) => a.x - b.x);

  if (sortedSeats.length === 0) return;

  const firstSeat = sortedSeats[0];
  const lastSeat = sortedSeats[sortedSeats.length - 1];

  let labelX: number;
  let labelY: number;

  switch (row.labelPlacement) {
    case "left":
      labelX = firstSeat.x - 20;
      if (sortedSeats.length === 1) {
        labelY = firstSeat.y;
      } else {
        // Use two nearest seats (leftmost two) to compute Y
        const a = sortedSeats[0];
        const b = sortedSeats[1];
        labelY = a.y + (a.y - b.y) / 2;
      }
      break;

    case "middle":
      labelX = (firstSeat.x + lastSeat.x) / 2;
      if (sortedSeats.length === 1) {
        labelY = firstSeat.y;
      } else if (sortedSeats.length < 4) {
        // Use two center seats when length < 4
        const n = sortedSeats.length;
        const leftIndex = Math.floor((n - 1) / 2);
        const rightIndex = leftIndex + 1;
        if (rightIndex < n) {
          const a = sortedSeats[leftIndex];
          const b = sortedSeats[rightIndex];
          labelY = a.y + (a.y - b.y) / 2;
        } else {
          labelY = sortedSeats[leftIndex].y;
        }
      } else {
        // Use four middle seats for n >= 4
        const n = sortedSeats.length;
        const start = Math.floor((n - 4) / 2);
        const middleSeats = sortedSeats.slice(start, start + 4);
        const avgY =
          middleSeats.reduce((sum, seat) => sum + seat.y, 0) /
          middleSeats.length;
        labelY = avgY;
      }
      break;

    case "right":
      labelX = lastSeat.x + 20;
      if (sortedSeats.length === 1) {
        labelY = lastSeat.y;
      } else {
        // Use two nearest seats (rightmost two) to compute Y
        const a = sortedSeats[sortedSeats.length - 1];
        const b = sortedSeats[sortedSeats.length - 2];
        labelY = a.y + (a.y - b.y) / 2;
      }
      break;

    default:
      return;
  }

  row.labelGraphics.position.set(labelX, labelY);
};
export const updateRowLabelRotation = (
  row: RowShape,
  grid?: GridShape
): void => {
  if (!row.labelGraphics || row.labelPlacement === "none") return;
  if (!grid) {
    grid = getGridByRowId(row.id);
  }
  const totalRotation = (row.rotation || 0) + (grid?.rotation || 0);
  row.labelGraphics.rotation = -totalRotation;
};

export const updateMultipleRowLabelRotations = (rows: RowShape[]): void => {
  // Group rows by gridId for efficient grid lookup
  const rowsByGrid = new Map<string, RowShape[]>();

  rows.forEach((row) => {
    if (!rowsByGrid.has(row.gridId)) {
      rowsByGrid.set(row.gridId, []);
    }
    rowsByGrid.get(row.gridId)!.push(row);
  });

  // Process rows by grid to reuse grid lookup
  rowsByGrid.forEach((gridRows, gridId) => {
    const grid = areaModeContainer?.children.find((g) => g.id === gridId);

    gridRows.forEach((row) => {
      if (row.labelGraphics && row.labelPlacement !== "none") {
        const totalRotation = (row.rotation || 0) + (grid?.rotation || 0);
        row.labelGraphics.rotation = -totalRotation;
      }
    });
  });
};

export const updateSeatLabelNumberingInRow = (
  row: RowShape,
  numberingStyle: "numerical" | "alphabetical" = "numerical",
  order: "asc" | "desc" = "asc"
): void => {
  const grid = getGridByRowId(row.id);
  const swap = (row.rotation + (grid?.rotation || 0)) % (2 * Math.PI);
  if (swap > Math.PI / 2 && swap < (3 * Math.PI) / 2) {
    order = order === "asc" ? "desc" : "asc";
  }
  const sortedSeats = row.children.sort((a, b) => {
    if (order === "desc") {
      return b.x - a.x;
    } else {
      return a.x - b.x;
    }
  });

  sortedSeats.forEach((seat, index) => {
    if (numberingStyle === "numerical") {
      seat.name = (index + 1).toString();
    } else if (numberingStyle === "alphabetical") {
      seat.name = String.fromCharCode(65 + index);
    }
    updateSeatGraphics(seat);
  });
};

export const applyBendToRow = (
  rowId: string,
  bendValue: number,
  originalPositions?: Map<string, { x: number; y: number }>
): void => {
  if (!areaModeContainer) return;

  const row = getRowByIdFromAllGrids(rowId);
  const grid = getGridByRowId(rowId);

  if (!row || !grid) return;

  const seats = getSeatsByRowId(rowId);
  if (seats.length < 2) return;

  const sortedSeats = [...seats].sort((a, b) => a.x - b.x);

  let originalXPositions: number[];
  let baseY: number;

  if (originalPositions) {
    originalXPositions = sortedSeats
      .map((seat) => originalPositions.get(seat.id)?.x)
      .filter((x): x is number => x !== undefined);

    const firstOriginal = originalPositions.get(sortedSeats[0].id);
    baseY = firstOriginal?.y || sortedSeats[0].y;
  } else {
    originalXPositions = sortedSeats.map((seat) => seat.x);
    baseY = sortedSeats[0].y;
  }

  if (originalXPositions.length === 0) return;

  const minX = Math.min(...originalXPositions);
  const maxX = Math.max(...originalXPositions);
  const centerX = (minX + maxX) / 2;
  const rowWidth = maxX - minX;

  if (rowWidth === 0) return;

  sortedSeats.forEach((seat, index) => {
    const originalX = originalPositions?.get(seat.id)?.x || seat.x;

    const normalizedX = (originalX - centerX) / (rowWidth / 2);

    const bendOffset =
      bendValue * rowWidth * 0.5 * (1 - normalizedX * normalizedX);

    if (originalPositions) {
      seat.x = originalX;
    }
    seat.y = baseY + bendOffset;

    seat.graphics.position.set(seat.x, seat.y);
    // ✅ Update seat label rotation with row and grid passed
    updateSeatLabelRotation(seat, row, grid);
  });

  // Update row label position after bending is applied
  if (row) {
    updateRowLabelPosition(row);
    updateRowLabelRotation(row);
  }
};

/**
 * ✅ Handle label placement change for all rows in a grid with history saving
 */
export const handleRowsLabelPlacementChange = (
  grid: GridShape,
  placement: "left" | "middle" | "right" | "none"
): void => {
  if (!areaModeContainer) return;

  // ✅ Store original values for before state
  const beforeRows = cloneCanvasItems(grid.children);

  // Apply the label placement change to all rows
  grid.children.forEach((row) => {
    setRowLabelPlacement(row, placement);
  });
  // Update shapes without automatic history saving
  useSeatMapStore.getState().updateShapes([...shapes], false, undefined, false);

  // ✅ Context-based history saving for MODIFY operation
  const context: ShapeContext = {
    topLevel: [],
    nested: [
      // Include the grid
      {
        id: grid.id,
        type: "container",
        parentId: areaModeContainer.id,
      },
      // Include all affected rows
      ...grid.children.map((row) => ({
        id: row.id,
        type: "container",
        parentId: grid.id,
      })),
    ],
    operation: "modify",
    containerPositions: {
      [areaModeContainer.id]: {
        x: areaModeContainer.x,
        y: areaModeContainer.y,
      },
    },
  };

  const action = useSeatMapStore.getState()._saveToHistory(
    {
      shapes: beforeRows,
      selectedShapes: grid.children,
      context,
    },
    {
      shapes: grid.children,
      selectedShapes: grid.children,
      context,
    }
  );

  // Broadcast to collaborators
  SeatMapCollaboration.broadcastShapeChange(action);
};

export const handleRowLabelPlacementChange = (
  row: RowShape,
  placement: "left" | "middle" | "right" | "none"
): void => {
  if (!areaModeContainer) return;

  // Find the grid that contains this row
  const grid = getGridByRowId(row.id);
  if (!grid) {
    console.warn(`Grid not found for row ${row.id}`);
    return;
  }

  // ✅ Store original values for before state
  const beforeRow = cloneCanvasItem(row);

  // Apply the label placement change
  setRowLabelPlacement(row, placement);

  // Update shapes without automatic history saving
  useSeatMapStore.getState().updateShapes([...shapes], false, undefined, false);

  // ✅ Context-based history saving for MODIFY operation
  const context: ShapeContext = {
    topLevel: [],
    nested: [
      {
        id: row.id,
        type: "container",
        parentId: grid.id,
      },
    ],
    operation: "modify",
    containerPositions: {
      [areaModeContainer.id]: {
        x: areaModeContainer.x,
        y: areaModeContainer.y,
      },
    },
  };

  const action = useSeatMapStore.getState()._saveToHistory(
    {
      shapes: [beforeRow],
      selectedShapes: [row],
      context,
    },
    {
      shapes: [row],
      selectedShapes: [row],
      context,
    }
  );

  // Broadcast to collaborators
  SeatMapCollaboration.broadcastShapeChange(action);
};

/**
 * ✅ Set row label placement
 */
export const setRowLabelPlacement = (
  row: RowShape,
  placement: "left" | "middle" | "right" | "none"
): void => {
  row.labelPlacement = placement;

  if (placement === "none") {
    if (row.labelGraphics) {
      row.labelGraphics.visible = false;
    }
    return;
  }

  // Create label if it doesn't exist
  if (!row.labelGraphics) {
    row.labelGraphics = createRowLabel(row);
    row.graphics.addChild(row.labelGraphics);
  }

  // Update label text and position
  row.labelGraphics.text = row.rowName;
  updateRowLabelPosition(row);
  updateRowLabelRotation(row);
};

/**
 * ✅ Update row label text
 */
export const updateRowLabelText = (rowId: string, newText: string): void => {
  const row = getRowByIdFromAllGrids(rowId);
  if (!row || !row.labelGraphics) return;

  row.labelGraphics.text = newText;
  row.rowName = newText;
};

/**
 * ✅ Updated createRowShape with label properties
 */
export const createRowShape = (
  gridId: string,
  rowName: string,
  seatSpacing?: number
): RowShape => {
  const rowGraphics = new PIXI.Container();
  rowGraphics.eventMode = "static";

  const rowShape: RowShape = {
    id: generateShapeId(),
    name: rowName,
    type: "container",
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    interactive: true,
    selected: false,
    expanded: true,
    graphics: rowGraphics,
    children: [],
    rowName,
    seatSpacing: seatSpacing || 25,
    gridId,
    createdAt: new Date(),
    labelPlacement: "left",
  };

  rowShape.labelGraphics = createRowLabel(rowShape);
  rowGraphics.addChild(rowShape.labelGraphics);
  updateRowLabelPosition(rowShape);

  return rowShape;
};

/**
 * ✅ Updated recreateRowShape with label support
 */
/**
 * ✅ Updated recreateRowShape - preserving exact coordinates
 */
export async function recreateRowShape(
  rowData: RowShape,
  seatSettings?: SeatGridSettings, // Only used for applying new settings (grid updates)
  preserveOriginalCoordinates: boolean = true // ✅ New flag to control coordinate preservation
): Promise<RowShape> {
  const rowGraphics = new PIXI.Container();
  rowGraphics.eventMode = "static";

  const recreatedRow: RowShape = {
    id: rowData.id,
    name: rowData.name,
    type: "container",
    x: rowData.x, // ✅ Always preserve original X
    y: rowData.y, // ✅ Always preserve original Y
    rotation: rowData.rotation || 0,
    scaleX: rowData.scaleX || 1,
    scaleY: rowData.scaleY || 1,
    opacity: rowData.opacity || 1,
    visible: rowData.visible,
    interactive: rowData.interactive,
    selected: rowData.selected || false,
    expanded: rowData.expanded,
    graphics: rowGraphics,
    children: [],
    rowName: rowData.rowName,
    seatSpacing: rowData.seatSpacing, // ✅ Preserve original seat spacing unless explicitly updating
    gridId: rowData.gridId,
    createdAt: rowData.createdAt,
    labelPlacement: rowData.labelPlacement || "none",
  };

  // ✅ Only apply new seat settings if specifically provided AND not preserving coordinates
  if (seatSettings && !preserveOriginalCoordinates) {
    recreatedRow.seatSpacing = seatSettings.seatSpacing;
  }

  // ✅ Recreate seats with exact coordinate preservation
  if (rowData.children && rowData.children.length > 0) {
    for (let i = 0; i < rowData.children.length; i++) {
      const seatData = rowData.children[i];
      try {
        let seatToRecreate = seatData;

        // ✅ Only modify seat positions if explicitly updating settings AND not preserving coordinates
        if (seatSettings && !preserveOriginalCoordinates) {
          seatToRecreate = {
            ...seatData,
            x: i * seatSettings.seatSpacing, // Apply new spacing only when updating
          };
        }
        // ✅ Otherwise, use exact original coordinates

        const recreatedSeat = recreateSeat(
          seatToRecreate,
          true,
          false, // Don't auto-add to grid during recreation
          preserveOriginalCoordinates ? undefined : seatSettings // Only apply settings if not preserving coordinates
        );

        recreatedRow.children.push(recreatedSeat);
        rowGraphics.addChild(recreatedSeat.graphics);
      } catch (error) {
        console.error(`Failed to recreate seat in row:`, error);
      }
    }
  }

  // ✅ Recreate label if it should be visible
  if (recreatedRow.labelPlacement !== "none") {
    recreatedRow.labelGraphics = createRowLabel(recreatedRow);
    rowGraphics.addChild(recreatedRow.labelGraphics);
    updateRowLabelPosition(recreatedRow);
  }

  rowGraphics.position.set(recreatedRow.x, recreatedRow.y);
  rowGraphics.rotation = recreatedRow.rotation;
  rowGraphics.scale.set(recreatedRow.scaleX, recreatedRow.scaleY);
  rowGraphics.alpha = recreatedRow.opacity;
  rowGraphics.visible = recreatedRow.visible;

  return recreatedRow;
}
