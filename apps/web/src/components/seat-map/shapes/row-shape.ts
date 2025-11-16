import * as PIXI from "pixi.js";
import {
  RowShape,
  SeatShape,
  SeatLabelStyle,
  GridShape,
  SeatGridSettings,
} from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { areaModeContainer } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { getSelectionTransform } from "../events/transform-events";
import {
  updateSeatGraphics,
  setSeatLabelVisibility,
  updateSeatLabelStyle,
  recreateSeat,
  createPixiTextStyle,
  DEFAULT_LABEL_STYLE,
  updateSeatLabelRotation,
} from "./seat-shape";

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
  gridByRow?: GridShape
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

  updateRowLabelPosition(row);
};

export const getCorrectSeatSpacing = (grid: GridShape): number => {
  const found = grid.children.every(
    (row) => row.seatSpacing !== grid.seatSettings.seatSpacing
  );
  return found ? grid.seatSettings.seatSpacing : -1;
};

/**
 * Update row settings
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
  console.log(sortedSeats);
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
 * ✅ Set row label placement
 */
export const setRowLabelPlacement = (
  rowId: string,
  placement: "left" | "middle" | "right" | "none"
): void => {
  const row = getRowByIdFromAllGrids(rowId);
  if (!row) return;

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
export async function recreateRowShape(
  rowData: RowShape,
  seatSettings?: SeatGridSettings // ✅ Add seatSettings parameter
): Promise<RowShape> {
  const rowGraphics = new PIXI.Container();
  rowGraphics.eventMode = "static";

  // ✅ Get effective seat spacing from settings or row data
  const effectiveSeatSpacing =
    seatSettings?.seatSpacing || rowData.seatSpacing || 25;

  const recreatedRow: RowShape = {
    id: rowData.id,
    name: rowData.name,
    type: "container",
    x: rowData.x,
    y: rowData.y,
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
    seatSpacing: effectiveSeatSpacing, // ✅ Apply updated seat spacing
    gridId: rowData.gridId,
    createdAt: rowData.createdAt,
    labelPlacement: rowData.labelPlacement || "none",
  };

  // ✅ Recreate seats with updated settings
  if (rowData.children && rowData.children.length > 0) {
    for (let i = 0; i < rowData.children.length; i++) {
      const seatData = rowData.children[i];
      try {
        // ✅ If seatSettings provided, apply spacing to seat positions
        if (seatSettings) {
          // Update seat position based on new spacing
          const seatWithUpdatedPosition = {
            ...seatData,
            x: i * effectiveSeatSpacing, // Apply new spacing
          };

          const recreatedSeat = recreateSeat(
            seatWithUpdatedPosition,
            true,
            false, // Don't auto-add to grid during recreation
            seatSettings // ✅ Pass settings to seat recreation
          );

          recreatedRow.children.push(recreatedSeat);
          rowGraphics.addChild(recreatedSeat.graphics);
        } else {
          // Use original positions and settings
          const recreatedSeat = recreateSeat(seatData, true, false);
          recreatedRow.children.push(recreatedSeat);
          rowGraphics.addChild(recreatedSeat.graphics);
        }
      } catch (error) {
        console.error(`❌ Failed to recreate seat in row:`, error);
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
