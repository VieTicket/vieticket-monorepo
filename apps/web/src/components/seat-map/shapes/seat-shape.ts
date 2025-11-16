import * as PIXI from "pixi.js";
import {
  SeatShape,
  SeatGridSettings,
  SeatLabelStyle,
  RowShape,
  GridShape,
} from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";
import { areaModeContainer } from "../variables";
import { addSeatToGrid, getSeatSettingsForGrid } from "./grid-shape";

export const DEFAULT_LABEL_STYLE: SeatLabelStyle = {
  fontFamily: "Arial",
  fontSize: 10,
  fill: "black",
  fontWeight: "normal",
  align: "center",
};

export const createPixiTextStyle = (
  labelStyle: SeatLabelStyle
): PIXI.TextStyle => {
  return new PIXI.TextStyle({
    fontFamily: labelStyle.fontFamily,
    fontSize: labelStyle.fontSize,
    fill: labelStyle.fill,
    fontWeight: labelStyle.fontWeight as PIXI.TextStyleFontWeight,
    align: labelStyle.align as PIXI.TextStyleAlign,
    stroke: labelStyle.strokeColor
      ? {
          color: labelStyle.strokeColor,
          width: labelStyle.strokeWidth || 0,
        }
      : undefined,
  });
};

export const createSeat = (
  x: number,
  y: number,
  rowId: string,
  gridId: string,
  rowNumber: number,
  seatNumber: number,
  settings?: SeatGridSettings,
  addShapeEvents: boolean = true,
  id: string = generateShapeId(),
  showLabel: boolean = true
): SeatShape => {
  const seatSettings = settings || getSeatSettingsForGrid(gridId);

  const pixiTextStyle = createPixiTextStyle(DEFAULT_LABEL_STYLE);

  const container = new PIXI.Container();
  container.eventMode = "static";
  container.cursor = "pointer";
  container.interactive = true;

  const seatGraphics = new PIXI.Graphics();
  seatGraphics
    .ellipse(0, 0, seatSettings.seatRadius, seatSettings.seatRadius)
    .fill(seatSettings.seatColor)
    .stroke({
      width: seatSettings.seatStrokeWidth,
      color: seatSettings.seatStrokeColor,
    });

  const labelText = `${seatNumber + 1}`;
  const labelGraphics = new PIXI.Text({
    text: labelText,
    style: pixiTextStyle,
  });

  labelGraphics.anchor.set(0.5, 0.5);
  labelGraphics.position.set(0, 0);
  labelGraphics.visible = showLabel;

  container.addChild(seatGraphics);
  container.addChild(labelGraphics);

  // ✅ Position relative to parent row
  container.position.set(x, y);

  const seat: SeatShape = {
    id,
    name: labelText,
    type: "ellipse",
    graphics: container,
    seatGraphics,
    labelGraphics,
    x, // Store relative position
    y, // Store relative position
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
    showLabel,
    labelStyle: DEFAULT_LABEL_STYLE,
  };

  const eventManager = getEventManager();
  if (eventManager && addShapeEvents) {
    eventManager.addShapeEvents(seat as any);
  }

  return seat;
};

export const recreateSeat = (
  seatData: SeatShape,
  addShapeEvents: boolean = true,
  canAddSeatToGrid: boolean = true,
  seatSettings?: SeatGridSettings // ✅ Add seatSettings parameter
): SeatShape => {
  const container = new PIXI.Container();
  container.eventMode = "static";
  container.cursor = "pointer";
  container.interactive = true;

  // ✅ Use provided seatSettings or fallback to seat's original data
  const effectiveSettings = seatSettings || {
    seatRadius: seatData.radiusX,
    seatColor: seatData.color,
    seatStrokeColor: seatData.strokeColor,
    seatStrokeWidth: seatData.strokeWidth,
    seatSpacing: 25, // Default fallback
    rowSpacing: 30, // Default fallback
    price: 0, // Default fallback
  };

  const seatGraphics = new PIXI.Graphics();
  seatGraphics
    .ellipse(0, 0, effectiveSettings.seatRadius, effectiveSettings.seatRadius)
    .fill(effectiveSettings.seatColor)
    .stroke({
      width: effectiveSettings.seatStrokeWidth,
      color: effectiveSettings.seatStrokeColor,
    });

  const labelStyle = seatData.labelStyle || DEFAULT_LABEL_STYLE;
  const pixiTextStyle = createPixiTextStyle(labelStyle);

  const labelGraphics = new PIXI.Text({
    text: seatData.name,
    style: pixiTextStyle,
  });

  labelGraphics.anchor.set(0.5, 0.5);
  labelGraphics.position.set(0, 0);
  labelGraphics.visible = seatData.showLabel ?? true;

  container.addChild(seatGraphics);
  container.addChild(labelGraphics);

  container.position.set(seatData.x, seatData.y);
  container.rotation = seatData.rotation || 0;
  container.scale.set(seatData.scaleX || 1, seatData.scaleY || 1);
  container.alpha = seatData.opacity || 1;
  container.visible = seatData.visible;

  const recreatedSeat: SeatShape = {
    id: seatData.id,
    name: seatData.name,
    type: "ellipse",
    graphics: container,
    seatGraphics,
    labelGraphics,
    x: seatData.x,
    y: seatData.y,
    // ✅ Apply settings from grid or use original data
    radiusX: effectiveSettings.seatRadius,
    radiusY: effectiveSettings.seatRadius,
    color: effectiveSettings.seatColor,
    strokeColor: effectiveSettings.seatStrokeColor,
    strokeWidth: effectiveSettings.seatStrokeWidth,
    selected: seatData.selected || false,
    visible: seatData.visible,
    interactive: seatData.interactive,
    rotation: seatData.rotation || 0,
    scaleX: seatData.scaleX || 1,
    scaleY: seatData.scaleY || 1,
    opacity: seatData.opacity || 1,
    rowId: seatData.rowId,
    gridId: seatData.gridId,
    showLabel: seatData.showLabel ?? true,
    labelStyle: labelStyle,
  };

  updateSeatLabelRotation(recreatedSeat);

  const eventManager = getEventManager();
  if (eventManager && addShapeEvents) {
    eventManager.addShapeEvents(recreatedSeat as any);
  }
  if (canAddSeatToGrid) addSeatToGrid(recreatedSeat);

  return recreatedSeat;
};

export const updateSeatGraphics = (seat: SeatShape): void => {
  if (!seat.graphics || !seat.seatGraphics || !seat.labelGraphics) return;

  seat.seatGraphics.clear();
  seat.seatGraphics
    .ellipse(0, 0, seat.radiusX, seat.radiusY)
    .fill(seat.color)
    .stroke({
      width: seat.strokeWidth,
      color: seat.strokeColor,
    });

  seat.labelGraphics.text = seat.name;
  seat.labelGraphics.style = createPixiTextStyle(seat.labelStyle);
  seat.labelGraphics.visible = seat.showLabel;

  seat.graphics.position.set(seat.x, seat.y);
  seat.graphics.rotation = seat.rotation || 0;
  seat.graphics.scale.set(seat.scaleX || 1, seat.scaleY || 1);
  seat.graphics.alpha = seat.opacity || 1;
  seat.graphics.visible = seat.visible;
};

export const updateSeatLabelRotation = (
  seat: SeatShape,
  row?: RowShape,
  grid?: GridShape
): void => {
  if (!seat.labelGraphics) return;

  let totalRotation = seat.rotation || 0;

  // If row is not provided, find it
  if (!row && areaModeContainer) {
    for (const g of areaModeContainer.children) {
      const foundRow = g.children.find((r) => r.id === seat.rowId);
      if (foundRow) {
        row = foundRow;
        // If grid is also not provided, use the found grid
        if (!grid) {
          grid = g;
        }
        break;
      }
    }
  }

  // If grid is not provided but we have row, find the grid
  if (!grid && row && areaModeContainer) {
    grid = areaModeContainer.children.find((g) => g.id === row!.gridId);
  }

  // Add row rotation if available
  if (row) {
    totalRotation += row.rotation || 0;
  }

  // Add grid rotation if available
  if (grid) {
    totalRotation += grid.rotation || 0;
  }

  // Counter-rotate the label to keep it readable
  seat.labelGraphics.rotation = -totalRotation;
};

export const updateMultipleSeatLabelsRotation = (
  seats: SeatShape[],
  rowsMap?: Map<string, RowShape>,
  gridsMap?: Map<string, GridShape>
): void => {
  // Group seats by rowId for efficient processing
  const seatsByRow = new Map<string, SeatShape[]>();

  seats.forEach((seat) => {
    if (seat.type === "ellipse" && seat.labelGraphics) {
      if (!seatsByRow.has(seat.rowId)) {
        seatsByRow.set(seat.rowId, []);
      }
      seatsByRow.get(seat.rowId)!.push(seat);
    }
  });

  // Process seats by row to reuse row and grid lookups
  seatsByRow.forEach((rowSeats, rowId) => {
    let row: RowShape | undefined = rowsMap?.get(rowId);
    let grid: GridShape | undefined;

    // If row not provided in map, find it once for this row
    if (!row && areaModeContainer) {
      for (const g of areaModeContainer.children) {
        const foundRow = g.children.find((r) => r.id === rowId);
        if (foundRow) {
          row = foundRow;
          grid = g;
          break;
        }
      }
    } else if (row && !grid) {
      // If we have row but no grid, get grid from map or find it
      grid = gridsMap?.get(row.gridId);
      if (!grid && areaModeContainer) {
        grid = areaModeContainer.children.find((g) => g.id === row!.gridId);
      }
    }

    // Update all seats in this row with the same row and grid
    rowSeats.forEach((seat) => {
      updateSeatLabelRotation(seat, row, grid);
    });
  });
};

export const setSeatSelected = (seat: SeatShape, selected: boolean): void => {
  seat.selected = selected;

  if (selected) {
    seat.seatGraphics.tint = 0x00ff00;
    seat.labelGraphics.style = createPixiTextStyle({
      ...seat.labelStyle,
      fill: 0x000000,
    });
  } else {
    seat.seatGraphics.tint = 0xffffff;
    seat.labelGraphics.style = createPixiTextStyle(seat.labelStyle);
  }

  updateSeatLabelRotation(seat);
};

export const setSeatAvailable = (seat: SeatShape, available: boolean): void => {
  if (available) {
    seat.color = seat.color;
    seat.seatGraphics.alpha = 1;
    seat.labelGraphics.alpha = 1;
  } else {
    seat.seatGraphics.tint = 0x888888;
    seat.seatGraphics.alpha = 0.5;
    seat.labelGraphics.alpha = 0.5;
  }

  updateSeatGraphics(seat);
};

export const setSeatLabelVisibility = (
  seat: SeatShape,
  visible: boolean
): void => {
  seat.showLabel = visible;
  seat.labelGraphics.visible = visible;
};

export const updateSeatLabel = (seat: SeatShape, newLabel: string): void => {
  seat.name = newLabel;
  seat.labelGraphics.text = newLabel;
};

export const updateSeatLabelStyle = (
  seat: SeatShape,
  styleUpdate: Partial<SeatLabelStyle>
): void => {
  seat.labelStyle = { ...seat.labelStyle, ...styleUpdate };
  updateSeatGraphics(seat);
};
