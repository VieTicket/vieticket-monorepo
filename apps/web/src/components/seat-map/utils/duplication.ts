import * as PIXI from "pixi.js";
import {
  CanvasItem,
  ContainerGroup,
  RectangleShape,
  EllipseShape,
  SeatShape,
  TextShape,
  PolygonShape,
  ImageShape,
  SVGShape,
  GridShape,
  RowShape,
  AreaModeContainer,
} from "../types";
import { generateShapeId } from "./stageTransform";
import { addShapeToStage, createSeat, updateSeatGraphics } from "../shapes";
import { getEventManager } from "../events/event-manager";
import {
  cloneCanvasItem,
  cloneCanvasItems,
  ShapeContext,
  useSeatMapStore,
} from "../store/seat-map-store";
import {
  shapes,
  isAreaMode,
  areaModeContainer,
  shapeContainer,
  setPreviouslyClickedShape,
} from "../variables";
import { updateSVGGraphics } from "../shapes/svg-shape";
import { updateImageGraphics } from "../shapes/image-shape";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { getSelectionTransform } from "../events/transform-events";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";
import {
  addSeatToGrid,
  getGridById,
  updateGridGraphics,
} from "../shapes/grid-shape";
import {
  createRowLabel,
  getRowById,
  getSeatsByRowId,
  updateRowLabelPosition,
} from "../shapes/row-shape";

/**
 * Default offset for duplicated items
 */
const DUPLICATE_OFFSET = { x: 20, y: 20 };

/**
 * Duplicates a rectangle shape
 */
const duplicateRectangle = (original: RectangleShape): RectangleShape => {
  const graphics = new PIXI.Graphics();
  graphics
    .roundRect(
      -original.width / 2,
      -original.height / 2,
      original.width,
      original.height,
      original.cornerRadius
    )
    .fill(original.color)
    .stroke({ width: original.strokeWidth, color: original.strokeColor });

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.rotation = original.rotation;
  graphics.scale.set(original.scaleX, original.scaleY);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: RectangleShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name}`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  return duplicated;
};

/**
 * Duplicates an ellipse shape
 */
const duplicateEllipse = (
  original: EllipseShape | SeatShape
): EllipseShape | SeatShape => {
  if (isAreaMode && "rowId" in original && "gridId" in original) {
    return duplicateSeat(original);
  }

  const graphics = new PIXI.Graphics();

  const radialGradient = new PIXI.FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: 0xffff00 },
      { offset: 1, color: original.color },
    ],
    textureSpace: "local",
  });

  graphics
    .ellipse(0, 0, original.radiusX, original.radiusY)
    .fill(radialGradient);
  graphics.stroke({ width: original.strokeWidth, color: original.strokeColor });

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.rotation = original.rotation;
  graphics.scale.set(original.scaleX, original.scaleY);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: EllipseShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name}`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  return duplicated;
};

/**
 * Duplicates a text shape
 */
const duplicateText = (original: TextShape): TextShape => {
  const textGraphics = new PIXI.Text({
    text: original.text,
    style: {
      fontFamily: original.fontFamily,
      fontSize: original.fontSize,
      fill: original.color,
      align: original.textAlign,
    },
  });

  textGraphics.anchor.set(0.5, 0.5);
  textGraphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );

  textGraphics.rotation = original.rotation;
  textGraphics.scale.set(original.scaleX, original.scaleY);
  textGraphics.eventMode = "static";
  textGraphics.cursor = "pointer";

  const duplicated: TextShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name}`,
    graphics: textGraphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  return duplicated;
};

/**
 * Duplicates a polygon shape
 */
const duplicatePolygon = (original: PolygonShape): PolygonShape => {
  const graphics = new PIXI.Graphics();

  const duplicatedPoints = original.points.map((point) => ({
    x: point.x,
    y: point.y,
    radius: point.radius,
  }));

  const duplicated: PolygonShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name}`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    points: duplicatedPoints,
    selected: false,
  };

  updatePolygonGraphics(duplicated);

  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  return duplicated;
};

/**
 * Duplicates an image shape
 */
const duplicateImage = async (original: ImageShape): Promise<ImageShape> => {
  try {
    const originalTexture = original.graphics.texture;

    const sprite = new PIXI.Sprite(originalTexture);
    sprite.anchor.set(0.5, 0.5);
    sprite.eventMode = "static";
    sprite.cursor = "pointer";

    const duplicated: ImageShape = {
      ...original,
      id: generateShapeId(),
      name: `${original.name}`,
      graphics: sprite,
      x: original.x + DUPLICATE_OFFSET.x,
      y: original.y + DUPLICATE_OFFSET.y,
      selected: false,
    };

    updateImageGraphics(duplicated);

    return duplicated;
  } catch (error) {
    console.error("Failed to duplicate image:", error);
    throw new Error("Failed to duplicate image");
  }
};

/**
 * Duplicates an SVG shape
 */
const duplicateSVG = (original: SVGShape): SVGShape => {
  const graphics = new PIXI.Graphics();

  try {
    graphics.svg(original.svgContent);

    const bounds = graphics.getLocalBounds();
    graphics.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  } catch (error) {
    console.error("Failed to duplicate SVG graphics:", error);
    graphics
      .circle(0, 0, 30)
      .fill(0xffffff)
      .stroke({ width: 2, color: 0xff0000 });

    graphics
      .moveTo(-15, -15)
      .lineTo(15, 15)
      .moveTo(15, -15)
      .lineTo(-15, 15)
      .stroke({ width: 3, color: 0xff0000 });

    graphics.pivot.set(0, 0);
  }

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: SVGShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name}`,
    graphics,
    x: original.x + DUPLICATE_OFFSET.x,
    y: original.y + DUPLICATE_OFFSET.y,
    selected: false,
  };

  updateSVGGraphics(duplicated);

  return duplicated;
};

/**
 * Duplicates a container and all its children
 */
const duplicateContainer = async (
  original: ContainerGroup
): Promise<ContainerGroup> => {
  try {
    const containerGraphics = new PIXI.Container();
    containerGraphics.eventMode = "static";
    containerGraphics.cursor = "pointer";
    containerGraphics.interactiveChildren = true;

    const duplicated: ContainerGroup = {
      ...original,
      id: generateShapeId(),
      name: `${original.name}`,
      graphics: containerGraphics,
      x: original.x + DUPLICATE_OFFSET.x,
      y: original.y + DUPLICATE_OFFSET.y,
      children: [],
      selected: false,
    };

    for (const child of original.children) {
      const duplicatedChild = await duplicateShape(child, false);
      if (duplicatedChild) {
        duplicated.children.push(duplicatedChild);
        containerGraphics.addChild(duplicatedChild.graphics);
      }
    }
    containerGraphics.position.set(duplicated.x, duplicated.y);
    containerGraphics.rotation = duplicated.rotation;
    containerGraphics.scale.set(duplicated.scaleX, duplicated.scaleY);
    containerGraphics.alpha = duplicated.opacity;
    containerGraphics.visible = duplicated.visible;

    return duplicated;
  } catch (error) {
    console.error("Failed to duplicate container:", error);
    throw new Error("Failed to duplicate container");
  }
};

/**
 * ✅ Analyze selection and group seats by grid and row
 */
interface SeatGrouping {
  byGrid: Map<string, SeatShape[]>;
  byRow: Map<string, SeatShape[]>;
  singleSeats: SeatShape[];
}

const analyzeSelectedSeats = (seats: SeatShape[]): SeatGrouping => {
  const byGrid = new Map<string, SeatShape[]>();
  const byRow = new Map<string, SeatShape[]>();
  const singleSeats: SeatShape[] = [];

  seats.forEach((seat) => {
    if (!byGrid.has(seat.gridId)) {
      byGrid.set(seat.gridId, []);
    }
    byGrid.get(seat.gridId)!.push(seat);

    if (!byRow.has(seat.rowId)) {
      byRow.set(seat.rowId, []);
    }
    byRow.get(seat.rowId)!.push(seat);
  });

  const gridIds = Array.from(byGrid.keys());
  const rowIds = Array.from(byRow.keys());

  if (gridIds.length === 1 && rowIds.length === 1) {
    singleSeats.push(...seats);
  }

  return { byGrid, byRow, singleSeats };
};

/**
 * ✅ Duplicate an entire grid with new GridShape structure
 */
const duplicateGrid = (
  originalGridId: string,
  seatsInGrid: SeatShape[]
): {
  newGrid: GridShape;
  newSeats: SeatShape[];
} => {
  const originalGrid = getGridById(originalGridId);
  if (!originalGrid) {
    throw new Error(`Grid ${originalGridId} not found`);
  }

  const newGridId = generateShapeId();
  const newGridGraphics = new PIXI.Container();
  newGridGraphics.eventMode = "static";
  const newGridName = areaModeContainer?.children.length
    ? `Grid ${areaModeContainer.children.length + 1}`
    : "Grid 1";
  const newGrid: GridShape = {
    id: newGridId,
    name: newGridName,
    type: "container",
    x: originalGrid.x + DUPLICATE_OFFSET.x,
    y: originalGrid.y + DUPLICATE_OFFSET.y,
    rotation: originalGrid.rotation,
    scaleX: originalGrid.scaleX,
    scaleY: originalGrid.scaleY,
    opacity: originalGrid.opacity,
    visible: originalGrid.visible,
    interactive: originalGrid.interactive,
    selected: false,
    expanded: originalGrid.expanded,
    graphics: newGridGraphics,
    children: [],
    gridName: newGridName,
    seatSettings: { ...originalGrid.seatSettings },
    createdAt: new Date(),
  };

  const newSeats: SeatShape[] = [];
  const seatsByRow = new Map<string, SeatShape[]>();

  seatsInGrid.forEach((seat) => {
    if (!seatsByRow.has(seat.rowId)) {
      seatsByRow.set(seat.rowId, []);
    }
    seatsByRow.get(seat.rowId)!.push(seat);
  });

  const sortedRows = Array.from(seatsByRow.entries()).sort((a, b) => {
    const rowA = findRowShape(originalGridId, a[0]);
    const rowB = findRowShape(originalGridId, b[0]);
    if (!rowA || !rowB) return 0;
    return rowA.rowName.localeCompare(rowB.rowName);
  });

  sortedRows.forEach(([originalRowId, rowSeats], rowIndex) => {
    const originalRow = findRowShape(originalGridId, originalRowId);
    if (!originalRow) return;

    const newRowId = generateShapeId();
    const newRowGraphics = new PIXI.Container();
    newRowGraphics.eventMode = "static";

    const newRow: RowShape = {
      id: newRowId,
      name: `${originalRow.rowName}`,
      type: "container",
      x: originalRow.x,
      y: originalRow.y,
      rotation: originalRow.rotation,
      scaleX: originalRow.scaleX,
      scaleY: originalRow.scaleY,
      opacity: originalRow.opacity,
      visible: true,
      interactive: true,
      selected: false,
      expanded: originalRow.expanded,
      graphics: newRowGraphics,
      children: [],
      rowName: `${originalRow.rowName}`,
      seatSpacing: originalRow.seatSpacing,
      gridId: newGridId,
      createdAt: new Date(),
      labelPlacement: originalRow.labelPlacement,
    };

    if (originalRow.labelPlacement !== "none") {
      newRow.labelGraphics = createRowLabel(newRow);
      newRowGraphics.addChild(newRow.labelGraphics);
    }

    const sortedSeats = rowSeats.sort((a, b) => {
      const aNum = parseInt(a.name);
      const bNum = parseInt(b.name);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.x - b.x;
    });

    sortedSeats.forEach((originalSeat, seatIndex) => {
      const newSeat = createSeat(
        originalSeat.x,
        originalSeat.y,
        newRowId,
        newGridId,
        rowIndex,
        seatIndex,
        newGrid.seatSettings,
        true,
        generateShapeId(),
        true
      );

      newSeat.radiusX = originalSeat.radiusX;
      newSeat.radiusY = originalSeat.radiusY;
      newSeat.color = originalSeat.color;
      newSeat.strokeColor = originalSeat.strokeColor;
      newSeat.strokeWidth = originalSeat.strokeWidth;
      newSeat.rotation = originalSeat.rotation;
      newSeat.scaleX = originalSeat.scaleX;
      newSeat.scaleY = originalSeat.scaleY;
      newSeat.opacity = originalSeat.opacity;
      newSeat.showLabel = originalSeat.showLabel;
      newSeat.labelStyle = { ...originalSeat.labelStyle };

      newSeats.push(newSeat);
      newRow.children.push(newSeat);
      newRowGraphics.addChild(newSeat.graphics);
    });

    if (newRow.labelGraphics && newRow.labelPlacement !== "none") {
      updateRowLabelPosition(newRow);
    }

    newRowGraphics.position.set(newRow.x, newRow.y);
    newRowGraphics.rotation = newRow.rotation;
    newRowGraphics.scale.set(newRow.scaleX, newRow.scaleY);
    newRowGraphics.alpha = newRow.opacity;
    newRowGraphics.visible = newRow.visible;

    newGrid.children.push(newRow);
    newGridGraphics.addChild(newRowGraphics);
  });

  newGridGraphics.position.set(newGrid.x, newGrid.y);
  newGridGraphics.rotation = newGrid.rotation;
  newGridGraphics.scale.set(newGrid.scaleX, newGrid.scaleY);
  newGridGraphics.alpha = newGrid.opacity;
  newGridGraphics.visible = newGrid.visible;

  return { newGrid, newSeats };
};

const duplicateRow = (
  originalRowId: string,
  seatsInRow: SeatShape[]
): {
  newRow: RowShape;
  newSeats: SeatShape[];
} => {
  if (seatsInRow.length === 0) {
    throw new Error("No seats provided for row duplication");
  }

  const originalGridId = seatsInRow[0].gridId;
  const originalRow = findRowShape(originalGridId, originalRowId);
  const originalGrid = getGridById(originalGridId);

  if (!originalRow || !originalGrid) {
    throw new Error(`Row ${originalRowId} or Grid ${originalGridId} not found`);
  }

  const newRowId = generateShapeId();
  const newRowGraphics = new PIXI.Container();
  newRowGraphics.eventMode = "static";

  const newRow: RowShape = {
    id: newRowId,
    name: `${originalRow.rowName} Copy`,
    type: "container",
    x: originalRow.x + DUPLICATE_OFFSET.x,
    y: originalRow.y + DUPLICATE_OFFSET.y,
    rotation: originalRow.rotation,
    scaleX: originalRow.scaleX,
    scaleY: originalRow.scaleY,
    opacity: originalRow.opacity,
    visible: originalRow.visible,
    interactive: originalRow.interactive,
    selected: false,
    expanded: originalRow.expanded,
    graphics: newRowGraphics,
    children: [],
    rowName: `${originalRow.rowName} Copy`,
    seatSpacing: originalRow.seatSpacing,
    gridId: originalGridId,
    createdAt: new Date(),
    labelPlacement: originalRow.labelPlacement,
  };

  if (originalRow.labelPlacement !== "none") {
    newRow.labelGraphics = createRowLabel(newRow);
    newRowGraphics.addChild(newRow.labelGraphics);
  }

  const newSeats: SeatShape[] = [];

  const sortedSeats = seatsInRow.sort((a, b) => {
    const aNum = parseInt(a.name);
    const bNum = parseInt(b.name);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.x - b.x;
  });

  const rowIndex = originalGrid.children.findIndex(
    (row) => row.id === originalRowId
  );

  sortedSeats.forEach((originalSeat, seatIndex) => {
    const newSeat = createSeat(
      originalSeat.x,
      originalSeat.y,
      newRowId,
      originalGridId,
      rowIndex >= 0 ? rowIndex : 0,
      seatIndex,
      originalGrid.seatSettings,
      true,
      generateShapeId(),
      true
    );

    newSeat.radiusX = originalSeat.radiusX;
    newSeat.radiusY = originalSeat.radiusY;
    newSeat.color = originalSeat.color;
    newSeat.strokeColor = originalSeat.strokeColor;
    newSeat.strokeWidth = originalSeat.strokeWidth;
    newSeat.rotation = originalSeat.rotation;
    newSeat.scaleX = originalSeat.scaleX;
    newSeat.scaleY = originalSeat.scaleY;
    newSeat.opacity = originalSeat.opacity;
    newSeat.showLabel = originalSeat.showLabel;
    newSeat.labelStyle = { ...originalSeat.labelStyle };

    newSeats.push(newSeat);
    newRow.children.push(newSeat);
    newRowGraphics.addChild(newSeat.graphics);
  });

  if (newRow.labelGraphics && newRow.labelPlacement !== "none") {
    updateRowLabelPosition(newRow);
  }

  newRowGraphics.position.set(newRow.x, newRow.y);
  newRowGraphics.rotation = newRow.rotation;
  newRowGraphics.scale.set(newRow.scaleX, newRow.scaleY);
  newRowGraphics.alpha = newRow.opacity;
  newRowGraphics.visible = newRow.visible;

  return { newRow, newSeats };
};

/**
 * ✅ Helper functions to find shapes in new structure
 */
const duplicateSeat = (original: SeatShape): SeatShape => {
  const originalGrid = getGridById(original.gridId);
  const originalRow = getRowById(original.gridId, original.rowId);

  if (!originalGrid || !originalRow) {
    console.error(`Grid or row not found for seat ${original.id}`);
    return { ...original };
  }

  const allSeatsInRow = getSeatsByRowId(original.rowId);
  const rowIndex = originalGrid.children.findIndex(
    (row: RowShape) => row.id === original.rowId
  );

  const gridSettings = originalGrid.seatSettings;

  const duplicated = createSeat(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y,
    original.rowId,
    original.gridId,
    rowIndex >= 0 ? rowIndex : 0,
    parseInt(original.name) - 1,
    gridSettings,
    true,
    generateShapeId(),
    false
  );

  duplicated.radiusX = original.radiusX;
  duplicated.radiusY = original.radiusY;
  duplicated.color = original.color;
  duplicated.strokeColor = original.strokeColor;
  duplicated.strokeWidth = original.strokeWidth;
  duplicated.rotation = original.rotation;
  duplicated.scaleX = original.scaleX;
  duplicated.scaleY = original.scaleY;
  duplicated.opacity = original.opacity;
  duplicated.selected = false;
  duplicated.showLabel = original.showLabel;
  duplicated.labelStyle = { ...original.labelStyle };

  updateSeatGraphics(duplicated);

  return duplicated;
};

const findRowShape = (gridId: string, rowId: string): RowShape | undefined => {
  const grid = getGridById(gridId);
  if (!grid) return undefined;
  return grid.children.find((row) => row.id === rowId) as RowShape;
};

const getAllSeatsInGrid = (gridId: string): SeatShape[] => {
  const grid = getGridById(gridId);
  if (!grid) return [];

  const allSeats: SeatShape[] = [];
  grid.children.forEach((row) => {
    allSeats.push(...row.children);
  });
  return allSeats;
};

const getAllSeatsInRow = (rowId: string): SeatShape[] => {
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
 * ✅ Enhanced seat-specific duplication logic (updated for new structure)
 */
const duplicateSeatsWithGridRowLogic = (
  selectedSeats: SeatShape[]
): SeatShape[] => {
  if (!areaModeContainer) {
    console.error("Area mode container not found");
    return [];
  }

  const grouping = analyzeSelectedSeats(selectedSeats);
  const allNewSeats: SeatShape[] = [];

  grouping.byGrid.forEach((seatsInGrid, gridId) => {
    const allGridSeats = getAllSeatsInGrid(gridId);
    const originalGrid = getGridById(gridId);

    if (!originalGrid) {
      console.error(`Grid ${gridId} not found`);
      return;
    }

    if (seatsInGrid.length === allGridSeats.length) {
      try {
        console.log(`Duplicating entire grid ${gridId}`);
        const { newGrid, newSeats } = duplicateGrid(gridId, seatsInGrid);

        areaModeContainer!.children.push(newGrid);
        areaModeContainer!.graphics.addChild(newGrid.graphics);

        allNewSeats.push(...newSeats);
        console.log(
          `✅ Successfully duplicated grid with ${newSeats.length} seats`
        );
      } catch (error) {
        console.error(`Failed to duplicate grid ${gridId}:`, error);
        seatsInGrid.forEach((seat) => {
          const duplicatedSeat = duplicateSeat(seat);
          allNewSeats.push(duplicatedSeat);

          const row = findRowShape(gridId, seat.rowId);
          if (row) {
            row.children.push(duplicatedSeat);
            row.graphics.addChild(duplicatedSeat.graphics);
          }
        });
      }
    } else {
      const seatsByRowInGrid = new Map<string, SeatShape[]>();
      seatsInGrid.forEach((seat) => {
        if (!seatsByRowInGrid.has(seat.rowId)) {
          seatsByRowInGrid.set(seat.rowId, []);
        }
        seatsByRowInGrid.get(seat.rowId)!.push(seat);
      });

      seatsByRowInGrid.forEach((seatsInRow, rowId) => {
        const allRowSeats = getAllSeatsInRow(rowId);

        if (seatsInRow.length === allRowSeats.length) {
          try {
            console.log(`Duplicating entire row ${rowId}`);
            const { newRow, newSeats } = duplicateRow(rowId, seatsInRow);

            originalGrid.children.push(newRow);
            originalGrid.graphics.addChild(newRow.graphics);

            allNewSeats.push(...newSeats);
            console.log(
              `✅ Successfully duplicated row with ${newSeats.length} seats`
            );
          } catch (error) {
            console.error(`Failed to duplicate row ${rowId}:`, error);
            seatsInRow.forEach((seat) => {
              const duplicatedSeat = duplicateSeat(seat);
              allNewSeats.push(duplicatedSeat);

              const row = findRowShape(gridId, rowId);
              if (row) {
                row.children.push(duplicatedSeat);
                row.graphics.addChild(duplicatedSeat.graphics);
              }
            });
          }
        } else {
          seatsInRow.forEach((seat) => {
            const duplicatedSeat = duplicateSeat(seat);
            allNewSeats.push(duplicatedSeat);

            const row = findRowShape(gridId, rowId);
            if (row) {
              row.children.push(duplicatedSeat);
              row.graphics.addChild(duplicatedSeat.graphics);
            }
          });
        }
      });
    }
  });

  console.log(`✅ Total duplicated seats: ${allNewSeats.length}`);
  return allNewSeats;
};

/**
 * ✅ Add shape to the appropriate container based on mode
 */
const addShapeToAppropriateContainer = (shape: CanvasItem): void => {
  if (shape.type === "container" && "gridName" in shape) {
    const gridShape = shape as GridShape;
    if (!areaModeContainer!.children.find((g) => g.id === gridShape.id)) {
      areaModeContainer!.children.push(gridShape);
      areaModeContainer!.graphics.addChild(gridShape.graphics);
    }
  } else if (shape.type === "container" && "rowName" in shape) {
    const rowShape = shape as RowShape;
    const parentGrid = getGridById(rowShape.gridId);
    if (parentGrid) {
      if (!parentGrid.children.find((r) => r.id === rowShape.id)) {
        parentGrid.children.push(rowShape);
        parentGrid.graphics.addChild(rowShape.graphics);
      }
    } else {
      console.warn(
        `Parent grid ${rowShape.gridId} not found for row ${rowShape.id}`
      );
    }
  } else if (shape.type === "ellipse" && "rowId" in shape) {
    const seatShape = shape as SeatShape;
    let addedToRow = false;

    for (const grid of areaModeContainer!.children) {
      const row = getRowById(grid.id, seatShape.rowId);
      if (row) {
        if (!row.children.find((s) => s.id === seatShape.id)) {
          row.children.push(seatShape);
          row.graphics.addChild(seatShape.graphics);
        }
        addedToRow = true;
        break;
      }
    }

    if (!addedToRow) {
      console.warn(
        `Parent row ${seatShape.rowId} not found for seat ${seatShape.id}`
      );
    }
  } else {
    if (!shapes.find((s) => s.id === shape.id)) {
      shapes.push(shape);
      if (shapeContainer) {
        shapeContainer.addChild(shape.graphics);
      }
      console.log(`✅ Added shape ${shape.name} to regular mode`);
    }
  }

  const eventManager = getEventManager();
  if (eventManager) {
    eventManager.addShapeEvents(shape);
  }
};

/**
 * ✅ Type guards for area mode shapes
 */
const isAreaModeShape = (
  shape: CanvasItem
): shape is SeatShape | RowShape | GridShape => {
  return isSeatShape(shape) || isRowShape(shape) || isGridShape(shape);
};

const isRowShape = (shape: CanvasItem): shape is RowShape => {
  return (
    shape.type === "container" &&
    "rowName" in shape &&
    "gridId" in shape &&
    typeof (shape as any).rowName === "string" &&
    typeof (shape as any).gridId === "string"
  );
};

const isGridShape = (shape: CanvasItem): shape is GridShape => {
  return (
    shape.type === "container" &&
    "gridName" in shape &&
    "seatSettings" in shape &&
    typeof (shape as any).gridName === "string"
  );
};

const isSeatShape = (shape: CanvasItem): shape is SeatShape => {
  return (
    shape.type === "ellipse" &&
    "rowId" in shape &&
    "gridId" in shape &&
    typeof (shape as any).rowId === "string" &&
    typeof (shape as any).gridId === "string"
  );
};

/**
 * Duplicates a single shape based on its type
 */
export const duplicateShape = async (
  shape: CanvasItem,
  enableEventListeners: boolean = true
): Promise<CanvasItem | null> => {
  try {
    let duplicated: CanvasItem;

    if (isSeatShape(shape) && isAreaMode && areaModeContainer) {
      const seatShapes = [shape as SeatShape];
      const smartDuplicatedSeats = duplicateSeatsWithGridRowLogic(seatShapes);

      if (smartDuplicatedSeats.length > 0) {
        return smartDuplicatedSeats[0];
      } else {
        duplicated = duplicateSeat(shape as SeatShape);
      }
    } else {
      switch (shape.type) {
        case "rectangle":
          duplicated = duplicateRectangle(shape as RectangleShape);
          break;
        case "ellipse":
          duplicated = duplicateEllipse(shape as EllipseShape);
          break;
        case "text":
          duplicated = duplicateText(shape as TextShape);
          break;
        case "polygon":
          duplicated = duplicatePolygon(shape as PolygonShape);
          break;
        case "image":
          duplicated = await duplicateImage(shape as ImageShape);
          break;
        case "svg":
          duplicated = duplicateSVG(shape as SVGShape);
          break;
        case "container":
          if ("gridName" in shape) {
            const gridShape = shape as GridShape;
            const allGridSeats = getAllSeatsInGrid(gridShape.id);
            const { newGrid } = duplicateGrid(gridShape.id, allGridSeats);
            duplicated = newGrid;
          } else if ("rowName" in shape) {
            const rowShape = shape as RowShape;
            const allRowSeats = getAllSeatsInRow(rowShape.id);
            const { newRow } = duplicateRow(rowShape.id, allRowSeats);
            duplicated = newRow;
          } else {
            duplicated = await duplicateContainer(shape as ContainerGroup);
          }
          break;
        default:
          console.warn(`Duplication not implemented for shape: ${shape.type}`);
          return null;
      }
    }

    const eventManager = getEventManager();
    if (
      eventManager &&
      enableEventListeners &&
      duplicated.type !== "container"
    ) {
      eventManager.addShapeEvents(duplicated);
    }

    console.log(
      `✅ Successfully duplicated ${shape.type} shape: ${shape.name}`
    );

    return duplicated;
  } catch (error) {
    console.error(`Failed to duplicate ${shape.type} shape:`, error);
    return null;
  }
};

export const duplicateSelectedShapes = async (): Promise<CanvasItem[]> => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;
  console.log("duplication", selectedShapes);
  if (selectedShapes.length === 0) {
    return [];
  }
  setPreviouslyClickedShape(selectedShapes[0]);

  try {
    const duplicatedShapes: CanvasItem[] = [];

    const seatShapes = selectedShapes.filter((shape): shape is SeatShape =>
      isSeatShape(shape)
    );
    const areaModeContainerShapes = selectedShapes.filter(
      (shape): shape is RowShape | GridShape =>
        isRowShape(shape) || isGridShape(shape)
    );
    const regularShapes = selectedShapes.filter(
      (shape) =>
        !isSeatShape(shape) && !isRowShape(shape) && !isGridShape(shape)
    );

    if (seatShapes.length > 0 && isAreaMode && areaModeContainer) {
      console.log(`Duplicating ${seatShapes.length} seats with smart logic`);

      const smartDuplicatedSeats = duplicateSeatsWithGridRowLogic(seatShapes);
      duplicatedShapes.push(...smartDuplicatedSeats);

      const afterAreaModeForSeats = cloneCanvasItem(areaModeContainer);

      if (smartDuplicatedSeats.length > 0) {
        const context: ShapeContext = {
          topLevel: [],
          nested: [
            ...smartDuplicatedSeats.map((seat) => ({
              id: seat.id,
              type: "ellipse" as const,
              parentId: seat.rowId,
            })),
          ],
          operation: "duplicate-seats",
          containerPositions: {
            [areaModeContainer.id]: {
              x: areaModeContainer.x,
              y: areaModeContainer.y,
            },
          },
        };

        const areaModeAction = useSeatMapStore.getState()._saveToHistory(
          {
            shapes: [],
            selectedShapes: seatShapes,
            context,
          },
          {
            shapes: [afterAreaModeForSeats as any],
            selectedShapes: smartDuplicatedSeats,
            context,
          }
        );
        SeatMapCollaboration.broadcastShapeChange(areaModeAction);
      }
    }

    if (areaModeContainerShapes.length > 0) {
      console.log(
        `Duplicating ${areaModeContainerShapes.length} area mode container shapes`
      );

      for (const shape of areaModeContainerShapes) {
        const duplicated = await duplicateShape(shape);
        if (duplicated) {
          duplicatedShapes.push(duplicated);
          addShapeToAppropriateContainer(duplicated);
        }
      }

      const afterAreaModeForContainers = cloneCanvasItems(
        areaModeContainerShapes
      );

      if (duplicatedShapes.filter((s) => isAreaModeShape(s)).length > 0) {
        const duplicatedAreaModeShapes = duplicatedShapes.filter((s) =>
          isAreaModeShape(s)
        ) as (SeatShape | RowShape | GridShape)[];

        const context: ShapeContext = {
          topLevel: [],
          nested: [
            {
              id: areaModeContainer!.id,
              type: "container",
              parentId: null,
            },

            ...duplicatedAreaModeShapes
              .filter((s) => isGridShape(s))
              .map((grid) => ({
                id: grid.id,
                type: "container" as const,
                parentId: areaModeContainer!.id,
              })),

            ...duplicatedAreaModeShapes
              .filter((s) => isRowShape(s))
              .map((row) => ({
                id: row.id,
                type: "container" as const,
                parentId: (row as RowShape).gridId,
              })),

            ...duplicatedAreaModeShapes
              .filter((s) => isSeatShape(s))
              .map((seat) => ({
                id: seat.id,
                type: "ellipse" as const,
                parentId: (seat as SeatShape).rowId,
              })),
          ],
          operation: "duplicate-containers",
          containerPositions: {
            [areaModeContainer!.id]: {
              x: areaModeContainer!.x,
              y: areaModeContainer!.y,
            },
          },
        };

        const areaModeContainerAction = useSeatMapStore
          .getState()
          ._saveToHistory(
            {
              shapes: [],
              selectedShapes: areaModeContainerShapes,
              context,
            },
            {
              shapes: [afterAreaModeForContainers as any],
              selectedShapes: duplicatedAreaModeShapes,
              context,
            }
          );
        SeatMapCollaboration.broadcastShapeChange(areaModeContainerAction);
      }
    }

    if (regularShapes.length > 0) {
      for (const shape of regularShapes) {
        const duplicated = await duplicateShape(shape);
        if (duplicated) {
          duplicatedShapes.push(duplicated);
          addShapeToAppropriateContainer(duplicated);
        }
      }

      const regularShapesDuplicated = duplicatedShapes.filter(
        (s) => !isAreaModeShape(s)
      );

      if (regularShapesDuplicated.length > 0) {
        const regularShapesContext: ShapeContext = {
          topLevel: regularShapesDuplicated.map((s) => ({
            id: s.id,
            type: s.type,
            parentId: null,
          })),
          nested: [],
          operation: "duplicate-shapes",
          containerPositions: {},
        };

        const action = useSeatMapStore.getState()._saveToHistory(
          {
            shapes: [],
            context: regularShapesContext,
          },
          {
            shapes: [...shapes],
            context: regularShapesContext,
          }
        );
        SeatMapCollaboration.broadcastShapeChange(action);
      }
    }

    if (seatShapes.length > 0 && (!isAreaMode || !areaModeContainer)) {
      for (const seat of seatShapes) {
        const duplicated = await duplicateShape(seat);
        if (duplicated) {
          duplicatedShapes.push(duplicated);
          addShapeToAppropriateContainer(duplicated);
        }
      }
    }

    useSeatMapStore.getState().setSelectedShapes(duplicatedShapes, false);

    const selectionTransform = getSelectionTransform();
    if (selectionTransform && duplicatedShapes.length > 0) {
      selectedShapes.forEach((shape) => {
        shape.selected = false;
      });

      duplicatedShapes.forEach((shape) => {
        shape.selected = true;
      });
      selectionTransform.updateSelection(duplicatedShapes);
    }

    useSeatMapStore.getState().updateShapes([...shapes], false);

    console.log(
      `✅ Successfully duplicated ${duplicatedShapes.length} shapes:`,
      {
        seats: seatShapes.length,
        areaModeContainers: areaModeContainerShapes.length,
        regularShapes: regularShapes.length,
      }
    );

    return duplicatedShapes;
  } catch (error) {
    console.error("Failed to duplicate selected shapes:", error);
    return [];
  }
};
