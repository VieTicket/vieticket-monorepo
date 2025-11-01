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
  GridData,
  RowData,
} from "../types";
import { generateShapeId } from "./stageTransform";
import { addShapeToStage } from "../shapes";
import { getEventManager } from "../events/event-manager";
import { useSeatMapStore } from "../store/seat-map-store";
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
import {
  createSeat,
  addSeatToGrid,
  getGridById,
  getRowById,
  getSeatsByGridId,
  getSeatsByRowId,
} from "../shapes/seats";

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
 * ✅ Enhanced seat duplication with proper grid/row management
 */
const duplicateSeat = (original: SeatShape): SeatShape => {
  // Get the original grid and row data
  const originalGrid = getGridById(original.gridId);
  const originalRow = getRowById(original.gridId, original.rowId);

  if (!originalGrid || !originalRow) {
    console.error(`Grid or row not found for seat ${original.id}`);
    // Fallback to basic duplication
    return duplicateBasicSeat(original);
  }

  // Use the actual grid settings, not default settings
  const gridSettings = originalGrid.seatSettings;

  const duplicated = createSeat(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y,
    original.rowId, // Keep same row initially, will be updated if needed
    original.gridId, // Keep same grid initially, will be updated if needed
    0, // Will be calculated properly
    0, // Will be calculated properly
    gridSettings, // Use actual grid settings
    true,
    generateShapeId(),
    false // Don't apply bend initially
  );

  // Copy all visual properties from original
  duplicated.name = `${original.name} Copy`;
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

  return duplicated;
};

/**
 * ✅ Fallback basic seat duplication
 */
const duplicateBasicSeat = (original: SeatShape): SeatShape => {
  const graphics = new PIXI.Graphics();

  graphics
    .ellipse(0, 0, original.radiusX, original.radiusY)
    .fill(original.color)
    .stroke({
      width: original.strokeWidth,
      color: original.strokeColor,
    });

  graphics.position.set(
    original.x + DUPLICATE_OFFSET.x,
    original.y + DUPLICATE_OFFSET.y
  );
  graphics.rotation = original.rotation;
  graphics.scale.set(original.scaleX, original.scaleY);
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const duplicated: SeatShape = {
    ...original,
    id: generateShapeId(),
    name: `${original.name} Copy`,
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
const duplicateEllipse = (original: EllipseShape): EllipseShape => {
  // ✅ Check if this is actually a seat in area mode
  if (isAreaMode && "rowId" in original && "gridId" in original) {
    return duplicateSeat(original as SeatShape);
  }

  const graphics = new PIXI.Graphics();

  // Create the same gradient if it exists
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

  // Deep copy the points array
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

  // Update graphics with the new polygon
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
    // Get the original texture from the sprite
    const originalTexture = original.graphics.texture;

    // Create new sprite with the same texture
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

    // Update graphics
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
    // Use the same SVG content
    graphics.svg(original.svgContent);

    // Get bounds and center the graphics
    const bounds = graphics.getLocalBounds();
    graphics.pivot.set(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
  } catch (error) {
    console.error("Failed to duplicate SVG graphics:", error);
    // Fallback to error indicator
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

  // Update graphics with proper transforms
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
    // Create new container graphics
    const containerGraphics = new PIXI.Container();
    containerGraphics.eventMode = "static";
    containerGraphics.cursor = "pointer";
    containerGraphics.interactiveChildren = true;

    // Create the duplicated container
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

    // Recursively duplicate all children
    for (const child of original.children) {
      const duplicatedChild = await duplicateShape(child, false);
      if (duplicatedChild) {
        duplicated.children.push(duplicatedChild);
        containerGraphics.addChild(duplicatedChild.graphics);
      }
    }
    // Position the container
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

  // Group by grid and row
  seats.forEach((seat) => {
    // Group by grid
    if (!byGrid.has(seat.gridId)) {
      byGrid.set(seat.gridId, []);
    }
    byGrid.get(seat.gridId)!.push(seat);

    // Group by row
    if (!byRow.has(seat.rowId)) {
      byRow.set(seat.rowId, []);
    }
    byRow.get(seat.rowId)!.push(seat);
  });

  // Determine what type of duplication we need
  const gridIds = Array.from(byGrid.keys());
  const rowIds = Array.from(byRow.keys());

  if (gridIds.length === 1 && rowIds.length === 1) {
    // All seats from same row - single seats
    singleSeats.push(...seats);
  }

  return { byGrid, byRow, singleSeats };
};

/**
 * ✅ Duplicate an entire grid with new GridData
 */
const duplicateGrid = (
  originalGridId: string,
  seatsInGrid: SeatShape[]
): {
  newGrid: GridData;
  newSeats: SeatShape[];
} => {
  const originalGrid = getGridById(originalGridId);
  if (!originalGrid) {
    throw new Error(`Grid ${originalGridId} not found`);
  }

  const newGridId = generateShapeId();

  // Create new grid data
  const newGrid: GridData = {
    id: newGridId,
    name: `${originalGrid.name}`,
    rows: [],
    seatSettings: { ...originalGrid.seatSettings },
    createdAt: new Date(),
  };

  const newSeats: SeatShape[] = [];

  // Group seats by row in the original grid
  const seatsByRow = new Map<string, SeatShape[]>();
  seatsInGrid.forEach((seat) => {
    if (!seatsByRow.has(seat.rowId)) {
      seatsByRow.set(seat.rowId, []);
    }
    seatsByRow.get(seat.rowId)!.push(seat);
  });

  // Duplicate each row
  seatsByRow.forEach((rowSeats, originalRowId) => {
    const originalRow = getRowById(originalGridId, originalRowId);
    if (!originalRow) return;

    const newRowId = generateShapeId();

    // Create new row data
    const newRow: RowData = {
      id: newRowId,
      name: `${originalRow.name}`,
      seats: [],
      bend: originalRow.bend,
      seatSpacing: originalRow.seatSpacing,
    };

    // Duplicate seats in this row
    rowSeats.forEach((originalSeat) => {
      const newSeat = createSeat(
        originalSeat.x + DUPLICATE_OFFSET.x,
        originalSeat.y + DUPLICATE_OFFSET.y,
        newRowId,
        newGridId,
        0, // Row number will be calculated
        0, // Seat number will be calculated
        newGrid.seatSettings,
        true,
        generateShapeId(),
        true // Apply row bend
      );

      // Copy all properties from original
      newSeat.name = `${originalSeat.name} Copy`;
      newSeat.radiusX = originalSeat.radiusX;
      newSeat.radiusY = originalSeat.radiusY;
      newSeat.color = originalSeat.color;
      newSeat.strokeColor = originalSeat.strokeColor;
      newSeat.strokeWidth = originalSeat.strokeWidth;
      newSeat.rotation = originalSeat.rotation;
      newSeat.scaleX = originalSeat.scaleX;
      newSeat.scaleY = originalSeat.scaleY;
      newSeat.opacity = originalSeat.opacity;

      newSeats.push(newSeat);
      newRow.seats.push(newSeat.id);
    });

    newGrid.rows.push(newRow);
  });

  return { newGrid, newSeats };
};

/**
 * ✅ Duplicate an entire row with new RowData
 */
const duplicateRow = (
  originalRowId: string,
  seatsInRow: SeatShape[]
): {
  newRow: RowData;
  newSeats: SeatShape[];
} => {
  if (seatsInRow.length === 0) {
    throw new Error("No seats provided for row duplication");
  }

  const originalGridId = seatsInRow[0].gridId;
  const originalRow = getRowById(originalGridId, originalRowId);
  if (!originalRow) {
    throw new Error(`Row ${originalRowId} not found`);
  }

  const originalGrid = getGridById(originalGridId);
  if (!originalGrid) {
    throw new Error(`Grid ${originalGridId} not found`);
  }

  const newRowId = generateShapeId();

  // Create new row data
  const newRow: RowData = {
    id: newRowId,
    name: `${originalRow.name}`,
    seats: [],
    bend: originalRow.bend,
    seatSpacing: originalRow.seatSpacing,
  };

  const newSeats: SeatShape[] = [];

  // Duplicate all seats in the row
  seatsInRow.forEach((originalSeat) => {
    const newSeat = createSeat(
      originalSeat.x + DUPLICATE_OFFSET.x,
      originalSeat.y + DUPLICATE_OFFSET.y,
      newRowId,
      originalGridId, // Keep same grid
      0, // Row number will be calculated
      0, // Seat number will be calculated
      originalGrid.seatSettings, // Use grid settings
      true,
      generateShapeId(),
      true // Apply row bend
    );

    // Copy all properties from original
    newSeat.name = `${originalSeat.name} Copy`;
    newSeat.radiusX = originalSeat.radiusX;
    newSeat.radiusY = originalSeat.radiusY;
    newSeat.color = originalSeat.color;
    newSeat.strokeColor = originalSeat.strokeColor;
    newSeat.strokeWidth = originalSeat.strokeWidth;
    newSeat.rotation = originalSeat.rotation;
    newSeat.scaleX = originalSeat.scaleX;
    newSeat.scaleY = originalSeat.scaleY;
    newSeat.opacity = originalSeat.opacity;

    newSeats.push(newSeat);
    newRow.seats.push(newSeat.id);
  });

  return { newRow, newSeats };
};

/**
 * ✅ Enhanced seat-specific duplication logic
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

  // Handle complete grids (all seats from one or more grids)
  grouping.byGrid.forEach((seatsInGrid, gridId) => {
    const allGridSeats = getSeatsByGridId(gridId);

    if (seatsInGrid.length === allGridSeats.length) {
      // Complete grid selected - duplicate entire grid

      try {
        const { newGrid, newSeats } = duplicateGrid(gridId, seatsInGrid);

        // Add new grid to area mode container
        areaModeContainer!.grids.push(newGrid);

        allNewSeats.push(...newSeats);
      } catch (error) {
        console.error(`Failed to duplicate grid ${gridId}:`, error);
        // Fallback to individual seat duplication
        seatsInGrid.forEach((seat) => {
          allNewSeats.push(duplicateSeat(seat));
        });
      }
    } else {
      // Partial grid selected - check for complete rows
      const seatsByRowInGrid = new Map<string, SeatShape[]>();
      seatsInGrid.forEach((seat) => {
        if (!seatsByRowInGrid.has(seat.rowId)) {
          seatsByRowInGrid.set(seat.rowId, []);
        }
        seatsByRowInGrid.get(seat.rowId)!.push(seat);
      });

      seatsByRowInGrid.forEach((seatsInRow, rowId) => {
        const allRowSeats = getSeatsByRowId(rowId);

        if (seatsInRow.length === allRowSeats.length) {
          // Complete row selected - duplicate entire row

          try {
            const { newRow, newSeats } = duplicateRow(rowId, seatsInRow);

            // Add new row to the original grid
            const originalGrid = getGridById(gridId);
            if (originalGrid) {
              originalGrid.rows.push(newRow);
              allNewSeats.push(...newSeats);
            }
          } catch (error) {
            console.error(`Failed to duplicate row ${rowId}:`, error);
            // Fallback to individual seat duplication
            seatsInRow.forEach((seat) => {
              allNewSeats.push(duplicateSeat(seat));
            });
          }
        } else {
          // Partial row selected - duplicate individual seats

          seatsInRow.forEach((seat) => {
            const duplicatedSeat = duplicateSeat(seat);
            allNewSeats.push(duplicatedSeat);

            // Add seat to the original row
            const originalRow = getRowById(gridId, rowId);
            if (originalRow) {
              originalRow.seats.push(duplicatedSeat.id);
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
  if (isAreaMode && areaModeContainer && isSeatShape(shape)) {
    // ✅ Add seats to area mode container
    areaModeContainer.children.push(shape);
    areaModeContainer.graphics.addChild(shape.graphics);

    // ✅ Add seat to grid data structure
    addSeatToGrid(shape as SeatShape);

    // Position the graphics
    shape.graphics.position.set(shape.x, shape.y);
  } else {
    if (shapeContainer) {
      shapeContainer.addChild(shape.graphics);
      addShape(shape);
    }
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

/**
 * ✅ Enhanced duplicateSelectedShapes with proper grid/row handling
 */
export const duplicateSelectedShapes = async (): Promise<CanvasItem[]> => {
  const selectedShapes = useSeatMapStore.getState().selectedShapes;

  if (selectedShapes.length === 0) {
    console.warn("No shapes selected for duplication");
    return [];
  }

  try {
    const duplicatedShapes: CanvasItem[] = [];

    // ✅ Separate seats from other shapes
    const selectedSeats = selectedShapes.filter((shape): shape is SeatShape =>
      isSeatShape(shape)
    );
    const selectedOtherShapes = selectedShapes.filter(
      (shape) => !isSeatShape(shape)
    );

    // ✅ Handle seat duplication with grid/row logic
    if (selectedSeats.length > 0 && isAreaMode && areaModeContainer) {
      const duplicatedSeats = duplicateSeatsWithGridRowLogic(selectedSeats);

      // Add seats to area mode container
      duplicatedSeats.forEach((seat) => {
        addShapeToAppropriateContainer(seat);
      });

      duplicatedShapes.push(...duplicatedSeats);
    }

    // ✅ Handle regular shape duplication
    for (const shape of selectedOtherShapes) {
      const duplicated = await duplicateShape(shape);
      if (duplicated) {
        duplicatedShapes.push(duplicated);
        addShapeToAppropriateContainer(duplicated);
      }
    }

    // ✅ Save state after duplication for history
    if (duplicatedShapes.length > 0) {
      const afterState =
        isAreaMode && areaModeContainer
          ? [...areaModeContainer.children]
          : [...shapes];

      // ✅ Save to history with context
      useSeatMapStore.getState()._saveToHistory(
        {
          shapes: [],
          context: {
            topLevel: isAreaMode
              ? []
              : duplicatedShapes
                  .filter((s) => !isSeatShape(s))
                  .map((s) => ({
                    id: s.id,
                    type: s.type,
                    parentId: null,
                  })),
            nested: isAreaMode
              ? duplicatedShapes.map((s) => ({
                  id: s.id,
                  type: s.type,
                  parentId: areaModeContainer?.id || null,
                }))
              : [],
            operation: isAreaMode ? "duplicate-seats" : "duplicate-shapes",
          },
        },
        {
          shapes: afterState,
          context: {
            topLevel: isAreaMode
              ? []
              : duplicatedShapes
                  .filter((s) => !isSeatShape(s))
                  .map((s) => ({
                    id: s.id,
                    type: s.type,
                    parentId: null,
                  })),
            nested: isAreaMode
              ? duplicatedShapes.map((s) => ({
                  id: s.id,
                  type: s.type,
                  parentId: areaModeContainer?.id || null,
                }))
              : [],
            operation: isAreaMode ? "duplicate-seats" : "duplicate-shapes",
          },
        }
      );
    }

    // Select the duplicated shapes
    useSeatMapStore.getState().setSelectedShapes(duplicatedShapes, false);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform && duplicatedShapes.length > 0) {
      // Clear original selections
      selectedShapes.forEach((shape) => {
        shape.selected = false;
      });

      // Select duplicated shapes
      duplicatedShapes.forEach((shape) => {
        shape.selected = true;
      });
      selectionTransform.updateSelection(duplicatedShapes);
    }

    useSeatMapStore.getState().updateShapes([...shapes], false);

    return duplicatedShapes;
  } catch (error) {
    console.error("Failed to duplicate selected shapes:", error);
    return [];
  }
};
