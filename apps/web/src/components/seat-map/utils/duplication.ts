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
  ShapeContext,
  useSeatMapStore,
} from "../store/seat-map-store";
import {
  shapes,
  isAreaMode,
  areaModeContainer,
  shapeContainer,
  addShape,
} from "../variables";
import { updateSVGGraphics } from "../shapes/svg-shape";
import { updateImageGraphics } from "../shapes/image-shape";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { getSelectionTransform } from "../events/transform-events";
import { SeatMapCollaboration } from "../collaboration/seatmap-socket-client";
import { addSeatToGrid, getGridById } from "../shapes/grid-shape";
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
  const originalGrid = findGridShape(originalGridId);
  if (!originalGrid) {
    throw new Error(`Grid ${originalGridId} not found`);
  }

  const newGridId = generateShapeId();
  const newGridGraphics = new PIXI.Container();
  newGridGraphics.eventMode = "static";

  const newGrid: GridShape = {
    id: newGridId,
    name: `${originalGrid.gridName}`,
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
    gridName: `${originalGrid.gridName}`,
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
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
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

    // ✅ Create label if original had one
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
        originalSeat.x + DUPLICATE_OFFSET.x,
        originalSeat.y + DUPLICATE_OFFSET.y,
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

    newGrid.children.push(newRow);
    newGridGraphics.addChild(newRowGraphics);
  });

  return { newGrid, newSeats };
};

/**
 * ✅ Duplicate an entire row with new RowShape structure
 */
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
  const originalGrid = findGridShape(originalGridId);

  if (!originalRow || !originalGrid) {
    throw new Error(`Row ${originalRowId} or Grid ${originalGridId} not found`);
  }

  const newRowId = generateShapeId();
  const newRowGraphics = new PIXI.Container();
  newRowGraphics.eventMode = "static";

  const newRow: RowShape = {
    id: newRowId,
    name: `${originalRow.rowName}`,
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
    rowName: `${originalRow.rowName}`,
    seatSpacing: originalRow.seatSpacing,
    gridId: originalGridId,
    createdAt: new Date(),
    labelPlacement: originalRow.labelPlacement,
  };

  // ✅ Create label if original had one
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
      originalSeat.x + DUPLICATE_OFFSET.x,
      originalSeat.y + DUPLICATE_OFFSET.y,
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
    parseInt(original.name),
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

/**
 * ✅ Helper functions to find shapes in new structure
 */
const findGridShape = (gridId: string): GridShape | undefined => {
  if (!areaModeContainer) return undefined;
  return areaModeContainer.children.find(
    (grid) => grid.id === gridId
  ) as GridShape;
};

const findRowShape = (gridId: string, rowId: string): RowShape | undefined => {
  const grid = findGridShape(gridId);
  if (!grid) return undefined;
  return grid.children.find((row) => row.id === rowId) as RowShape;
};

const getAllSeatsInGrid = (gridId: string): SeatShape[] => {
  const grid = findGridShape(gridId);
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

    if (seatsInGrid.length === allGridSeats.length) {
      try {
        const { newGrid, newSeats } = duplicateGrid(gridId, seatsInGrid);

        areaModeContainer!.children.push(newGrid);
        areaModeContainer!.graphics.addChild(newGrid.graphics);

        allNewSeats.push(...newSeats);
      } catch (error) {
        console.error(`Failed to duplicate grid ${gridId}:`, error);
        seatsInGrid.forEach((seat) => {
          allNewSeats.push(duplicateSeat(seat));
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
            const { newRow, newSeats } = duplicateRow(rowId, seatsInRow);

            const grid = findGridShape(gridId);
            if (grid) {
              grid.children.push(newRow);
              grid.graphics.addChild(newRow.graphics);
              allNewSeats.push(...newSeats);
            }
          } catch (error) {
            console.error(`Failed to duplicate row ${rowId}:`, error);
            seatsInRow.forEach((seat) => {
              allNewSeats.push(duplicateSeat(seat));
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

  return allNewSeats;
};

/**
 * ✅ Add shape to the appropriate container based on mode
 */
const addShapeToAppropriateContainer = (shape: CanvasItem): void => {
  if (isAreaMode && areaModeContainer) {
    // Handle area mode shapes
    if (shape.type === "container" && (shape as any).gridName) {
      // GridShape - add directly to area mode container
      const gridShape = shape as GridShape;
      areaModeContainer.children.push(gridShape);
      areaModeContainer.graphics.addChild(gridShape.graphics);
    } else if (shape.type === "container" && (shape as any).rowName) {
      // RowShape - find parent grid and add to it
      const rowShape = shape as RowShape;
      const parentGrid = areaModeContainer.children.find(
        (g) => g.id === rowShape.gridId
      ) as GridShape;
      if (parentGrid) {
        parentGrid.children.push(rowShape);
        parentGrid.graphics.addChild(rowShape.graphics);
      } else {
        console.warn(
          `Parent grid ${rowShape.gridId} not found for row ${rowShape.id}`
        );
      }
    } else if (shape.type === "ellipse" && (shape as any).rowId) {
      // SeatShape - find parent row and add to it
      const seatShape = shape as SeatShape;
      let addedToRow = false;

      for (const grid of areaModeContainer.children) {
        const row = grid.children.find((r) => r.id === seatShape.rowId);
        if (row) {
          row.children.push(seatShape);
          row.graphics.addChild(seatShape.graphics);
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
      // Regular shapes in area mode - add to area mode container
      // areaModeContainer.children.push(shape);
      // areaModeContainer.graphics.addChild(shape.graphics);
    }
  } else {
    // Regular mode - add to main shapes array and stage
    shapes.push(shape);
    if (shapeContainer) {
      shapeContainer.addChild(shape.graphics);
    }
  }

  // Add shape events if needed
  const eventManager = getEventManager();
  if (eventManager) {
    eventManager.addShapeEvents(shape);
  }
};

/**
 * ✅ Type guard to check if a shape is a seat
 */
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
        duplicated = await duplicateContainer(shape as ContainerGroup);
        break;
      default:
        console.warn(`Duplication not implemented for shape: ${shape}`);
        return null;
    }

    const eventManager = getEventManager();
    if (eventManager && enableEventListeners) {
      eventManager.addShapeEvents(duplicated);
    }

    return duplicated;
  } catch (error) {
    console.error("Failed to duplicate shape:", error);
    return null;
  }
};

export const duplicateSelectedShapes = async (): Promise<CanvasItem[]> => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  if (selectedShapes.length === 0) {
    console.warn("No shapes selected for duplication");
    return [];
  }

  try {
    const duplicatedShapes: CanvasItem[] = [];

    const selectedSeats = selectedShapes.filter((shape): shape is SeatShape =>
      isSeatShape(shape)
    );
    const selectedOtherShapes = selectedShapes.filter(
      (shape) => !isSeatShape(shape)
    );

    if (selectedSeats.length > 0 && isAreaMode && areaModeContainer) {
      const beforeAreaModeContainer = cloneCanvasItem(areaModeContainer);

      const duplicatedSeats = duplicateSeatsWithGridRowLogic(selectedSeats);

      duplicatedSeats.forEach((seat) => {
        addShapeToAppropriateContainer(seat);
      });

      duplicatedShapes.push(...duplicatedSeats);

      const afterAreaModeContainer = cloneCanvasItem(areaModeContainer);

      const duplicationContext: ShapeContext = {
        topLevel: [],
        nested: duplicatedSeats.map((seat) => ({
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

      const action = useSeatMapStore.getState()._saveToHistory(
        {
          shapes: [beforeAreaModeContainer],
          context: duplicationContext,
        },
        {
          shapes: [afterAreaModeContainer],
          context: duplicationContext,
        }
      );
      SeatMapCollaboration.broadcastShapeChange(action);
    }

    for (const shape of selectedOtherShapes) {
      const duplicated = await duplicateShape(shape);
      if (duplicated) {
        duplicatedShapes.push(duplicated);
        addShapeToAppropriateContainer(duplicated);
      }
    }

    if (selectedOtherShapes.length > 0 && duplicatedShapes.length > 0) {
      const regularShapesDuplicated = duplicatedShapes.filter(
        (s) => !isSeatShape(s)
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

    if (isAreaMode && areaModeContainer) {
      useSeatMapStore.getState().updateShapes([...shapes], false);
    } else {
      useSeatMapStore.getState().updateShapes([...shapes], false);
    }

    return duplicatedShapes;
  } catch (error) {
    console.error("Failed to duplicate selected shapes:", error);
    return [];
  }
};
