import * as PIXI from "pixi.js";
import {
  CanvasItem,
  FreeShape,
  GridShape,
  PolygonShape,
  RowShape,
  SeatShape,
  SVGShape,
} from "../types";
import {
  stage,
  zoom,
  shapes,
  setWasTransformed,
  setShapes,
  isAreaMode,
  areaModeContainer,
} from "../variables";
import { cloneCanvasItems, useSeatMapStore } from "../store/seat-map-store";
import { calculateGroupBounds, BoundingBox } from "../utils/bounds";
import {
  findParentContainer,
  getWorldCoordinates,
  updatePolygonGraphics,
} from "../shapes";
import { updateSVGGraphics } from "../shapes/svg-shape";
import {
  updateMultipleSeatLabelsRotation,
  updateSeatLabelRotation,
} from "../shapes/seat-shape";
import {
  getGridByRowId,
  getRowByIdFromAllGrids,
  getSeatsInRow,
  updateMultipleRowLabelRotations,
  updateRowLabelPosition,
  updateRowLabelRotation,
} from "../shapes/row-shape";
import { before } from "node:test";
import { createPolygonEdges, getGuideLines } from "../guide-lines";

export interface TransformHandle {
  type: "corner" | "edge" | "rotate" | "bend" | "vertex" | "control-point";
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "rotate"
    | "bend"
    | `vertex-${number}`
    | `cp-${number}`;
  graphics: PIXI.Graphics;
}

interface BendInfo {
  type: "single-row" | "multi-row" | "grid" | null;
  rowIds: string[];
  gridIds: string[];
  rows: RowShape[];
  grids: GridShape[];
  allSeats: SeatShape[];
}

interface TransformState {
  isTransforming: boolean;
  transformType:
    | "move"
    | "scale"
    | "rotate"
    | "bend"
    | "vertex"
    | "control-point"
    | null;
  transformStart: { x: number; y: number } | null;
  transformPosition: string;
  originalTransforms: Array<{
    scaleX: number;
    scaleY: number;
    rotation: number;
    x: number;
    y: number;
  }>;
  originalPolygonPoints: { x: number; y: number }[];
  accumulatedRotation: number;
  hasReachedThreshold: boolean;
  affectedRowIds: string[];
  bendType: "single-row" | "multi-row" | "grid" | null;
  editingVertexIndex: number;
  originalSeatPositions: Map<string, { x: number; y: number }>;
  cachedBendInfo: BendInfo | null;
}

export class SelectionTransform {
  private selectedShapes: CanvasItem[] = [];
  private boundingBox: BoundingBox | null = null;
  private handles: TransformHandle[] = [];
  private polygonVertexHandles: TransformHandle[] = [];
  private freeShapeHandles: TransformHandle[] = [];
  private container: PIXI.Container;
  private state: TransformState = {
    isTransforming: false,
    transformType: null,
    transformStart: null,
    transformPosition: "",
    originalTransforms: [],
    originalPolygonPoints: [],
    accumulatedRotation: 0,
    hasReachedThreshold: false,
    originalSeatPositions: new Map(),
    affectedRowIds: [],
    bendType: null,
    editingVertexIndex: -1,
    cachedBendInfo: null,
  };
  private readonly rotationThreshold = Math.PI * 7;

  constructor(container: PIXI.Container) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.createHandles();
    this.createFreeShapeHandles();
  }

  private createHandles() {
    const handleConfigs = [
      { type: "corner", position: "top-left", cursor: "nw-resize" },
      { type: "corner", position: "top-right", cursor: "ne-resize" },
      { type: "corner", position: "bottom-left", cursor: "sw-resize" },
      { type: "corner", position: "bottom-right", cursor: "se-resize" },
      { type: "edge", position: "top", cursor: "n-resize" },
      { type: "edge", position: "bottom", cursor: "s-resize" },
      { type: "edge", position: "left", cursor: "w-resize" },
      { type: "edge", position: "right", cursor: "e-resize" },
      { type: "rotate", position: "rotate", cursor: "grab" },
      { type: "bend", position: "bend", cursor: "ns-resize" },
    ] as const;

    this.handles = handleConfigs.map(({ type, position, cursor }) => {
      const graphics = this.createHandleGraphics(type, cursor);
      graphics.on("pointerdown", (event) => {
        this.onHandlePointerDown(event, type, position);
      });

      this.container.addChild(graphics);
      return { type, position, graphics };
    });
    const maxVertices = 15;

    for (let i = 0; i < maxVertices; i++) {
      const graphics = this.createHandleGraphics("vertex", "resize");
      graphics.on("pointerdown", (event) =>
        this.onVertexHandlePointerDown(event, i)
      );

      this.container.addChild(graphics);
      this.polygonVertexHandles.push({
        type: "vertex",
        position: `vertex-${i}`,
        graphics,
      });
    }
  }

  private createFreeShapeHandles() {
    const maxPoints = 20;
    const maxControlPoints = maxPoints * 2;

    for (let i = 0; i < maxPoints; i++) {
      const graphics = this.createHandleGraphics("vertex", "move");
      graphics.on("pointerdown", (event) =>
        this.onFreeShapeVertexHandlePointerDown(event, i)
      );

      this.container.addChild(graphics);
      this.freeShapeHandles.push({
        type: "vertex",
        position: `vertex-${i}`,
        graphics,
      });
    }

    for (let i = 0; i < maxPoints; i++) {
      const cp1Graphics = this.createHandleGraphics("control-point", "move");
      cp1Graphics.on("pointerdown", (event) =>
        this.onFreeShapeControlPointHandlePointerDown(event, i, "cp1")
      );

      this.container.addChild(cp1Graphics);
      this.freeShapeHandles.push({
        type: "control-point",
        position: `cp-${i}`,
        graphics: cp1Graphics,
      });

      const cp2Graphics = this.createHandleGraphics("control-point", "move");
      cp2Graphics.on("pointerdown", (event) =>
        this.onFreeShapeControlPointHandlePointerDown(event, i, "cp2")
      );

      this.container.addChild(cp2Graphics);
      this.freeShapeHandles.push({
        type: "control-point",
        position: `cp-${i}`,
        graphics: cp2Graphics,
      });
    }
  }

  private createHandleGraphics(type: string, cursor: string): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    const handleSize = 8;

    if (type === "rotate") {
      graphics
        .circle(0, 0, handleSize / 2)
        .fill(0x00ff00)
        .stroke({ width: 2, color: 0x008800 });
    } else if (type === "vertex") {
      graphics
        .circle(0, 0, handleSize / 1.5)
        .fill(0xffaa00)
        .stroke({ width: 2, color: 0x008800 });
    } else if (type === "control-point") {
      graphics
        .circle(0, 0, handleSize / 2.5)
        .fill(0xff6b6b)
        .stroke({ width: 1, color: 0xcc0000 });
    } else if (type === "bend") {
      const bendInfo = this.getBendInfo();
      let fillColor = 0xff9500;
      let strokeColor = 0xcc7700;

      if (bendInfo.type === "grid") {
        fillColor = 0xff3366;
        strokeColor = 0xcc1144;
      } else if (bendInfo.type === "multi-row") {
        fillColor = 0x9933ff;
        strokeColor = 0x7722cc;
      }

      graphics
        .poly([
          { x: 0, y: -handleSize / 2 },
          { x: handleSize / 2, y: 0 },
          { x: 0, y: handleSize / 2 },
          { x: -handleSize / 2, y: 0 },
        ])
        .fill(fillColor)
        .stroke({ width: 2, color: strokeColor });
    } else {
      graphics
        .rect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
        .fill(0x0099ff)
        .stroke({ width: 2, color: 0x0066cc });
    }

    graphics.eventMode = "static";
    graphics.cursor = cursor;
    graphics.visible = false;
    return graphics;
  }

  private getBendInfo(): BendInfo {
    if (this.state.cachedBendInfo) {
      return this.state.cachedBendInfo;
    }

    if (!isAreaMode || this.selectedShapes.length === 0 || !areaModeContainer) {
      const emptyInfo: BendInfo = {
        type: null,
        rowIds: [],
        gridIds: [],
        rows: [],
        grids: [],
        allSeats: [],
      };
      this.state.cachedBendInfo = emptyInfo;
      return emptyInfo;
    }

    const rows: RowShape[] = [];
    const grids: GridShape[] = [];
    const allSeats: SeatShape[] = [];
    const rowIds: string[] = [];
    const gridIds: string[] = [];

    const containerShapes = this.selectedShapes.filter(
      (shape) => shape.type === "container"
    );

    if (containerShapes.length > 0) {
      const gridShapes = containerShapes.filter(
        (shape) => "gridName" in shape
      ) as GridShape[];

      gridShapes.forEach((grid) => {
        grids.push(grid);
        gridIds.push(grid.id);
        rows.push(...grid.children);
        rowIds.push(...grid.children.map((row) => row.id));

        grid.children.forEach((row) => {
          allSeats.push(...row.children);
        });
      });

      const rowShapes = containerShapes.filter(
        (shape) => "rowName" in shape && "gridId" in shape
      ) as RowShape[];

      rowShapes.forEach((row) => {
        rows.push(row);
        rowIds.push(row.id);

        if (!gridIds.includes(row.gridId)) {
          const grid = areaModeContainer!.children.find(
            (g) => g.id === row.gridId
          );
          if (grid) {
            grids.push(grid);
            gridIds.push(grid.id);
          }
        }

        allSeats.push(...row.children);
      });

      let bendType: "single-row" | "multi-row" | "grid" | null;

      if (gridShapes.length > 0) {
        bendType = "grid";
      } else if (rowShapes.length === 1) {
        bendType = "single-row";
      } else {
        bendType = "multi-row";
      }

      const bendInfo: BendInfo = {
        type: bendType,
        rowIds,
        gridIds,
        rows,
        grids,
        allSeats,
      };

      this.state.cachedBendInfo = bendInfo;
      return bendInfo;
    }

    const seatShapes = this.selectedShapes.filter(
      (shape): shape is SeatShape =>
        shape.type === "ellipse" && "rowId" in shape && "gridId" in shape
    );

    if (seatShapes.length === 0) {
      const emptyInfo: BendInfo = {
        type: null,
        rowIds: [],
        gridIds: [],
        rows: [],
        grids: [],
        allSeats: [],
      };
      this.state.cachedBendInfo = emptyInfo;
      return emptyInfo;
    }

    const uniqueRowIds = [...new Set(seatShapes.map((seat) => seat.rowId))];
    const uniqueGridIds = [...new Set(seatShapes.map((seat) => seat.gridId))];

    const rowsMap = new Map<string, RowShape>();
    const gridsMap = new Map<string, GridShape>();

    uniqueGridIds.forEach((gridId) => {
      const grid = areaModeContainer!.children.find((g) => g.id === gridId);
      if (grid) {
        grids.push(grid);
        gridIds.push(grid.id);
        gridsMap.set(grid.id, grid);

        uniqueRowIds.forEach((rowId) => {
          const row = grid.children.find((r) => r.id === rowId);
          if (row && !rowsMap.has(row.id)) {
            rows.push(row);
            rowIds.push(row.id);
            rowsMap.set(row.id, row);
          }
        });
      }
    });

    allSeats.push(...seatShapes);

    let bendType: "single-row" | "multi-row" | "grid" | null;

    if (uniqueRowIds.length === 1) {
      const rowId = uniqueRowIds[0];
      const row = rowsMap.get(rowId);

      if (row && seatShapes.length === row.children.length) {
        bendType = "single-row";
      } else {
        bendType = "single-row";
      }
    } else if (uniqueGridIds.length === 1) {
      const grid = gridsMap.get(uniqueGridIds[0]);

      if (grid) {
        const totalSeatsInGrid = grid.children.reduce(
          (total, row) => total + row.children.length,
          0
        );

        if (
          seatShapes.length === totalSeatsInGrid &&
          uniqueRowIds.length === grid.children.length
        ) {
          bendType = "grid";
        } else {
          bendType = "multi-row";
        }
      } else {
        bendType = "multi-row";
      }
    } else {
      bendType = "multi-row";
    }

    const bendInfo: BendInfo = {
      type: bendType,
      rowIds,
      gridIds,
      rows,
      grids,
      allSeats,
    };

    this.state.cachedBendInfo = bendInfo;
    return bendInfo;
  }

  private clearBendInfoCache() {
    this.state.cachedBendInfo = null;
  }

  private shouldShowBendHandle(): boolean {
    const bendInfo = this.getBendInfo();

    return (
      bendInfo.type !== null &&
      ((bendInfo.type === "single-row" && this.selectedShapes.length >= 2) ||
        bendInfo.type === "multi-row" ||
        bendInfo.type === "grid" ||
        this.selectedShapes.some((shape) => shape.type === "container"))
    );
  }

  private updatePolygonVertexHandles() {
    this.polygonVertexHandles.forEach((handle) => {
      handle.graphics.visible = false;
    });

    if (this.selectedShapes.length !== 1) return;

    const shape = this.selectedShapes[0];
    if (shape.type !== "polygon") return;

    const polygon = shape as PolygonShape;
    const numVertices = Math.min(
      polygon.points.length,
      this.polygonVertexHandles.length
    );

    for (let i = 0; i < numVertices; i++) {
      const handle = this.polygonVertexHandles[i];
      const point = polygon.points[i];

      // ✅ Apply polygon transformations to the point
      const transformedPoint = this.transformPointWithPolygon(point, polygon);

      handle.graphics.visible = true;
      handle.graphics.x = transformedPoint.x;
      handle.graphics.y = transformedPoint.y;
      handle.graphics.scale.set(1 / zoom);
    }
  }

  private transformPointWithPolygon(
    localPoint: { x: number; y: number },
    polygon: PolygonShape
  ): { x: number; y: number } {
    // Start with the local point relative to polygon center
    let transformedX = localPoint.x;
    let transformedY = localPoint.y;

    // Apply polygon scale
    const scaleX = polygon.scaleX || 1;
    const scaleY = polygon.scaleY || 1;
    transformedX *= scaleX;
    transformedY *= scaleY;

    // Apply polygon rotation
    const rotation = polygon.rotation || 0;
    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = transformedX * cos - transformedY * sin;
      const rotatedY = transformedX * sin + transformedY * cos;
      transformedX = rotatedX;
      transformedY = rotatedY;
    }

    // Add polygon position to get world position
    let worldX = polygon.x + transformedX;
    let worldY = polygon.y + transformedY;

    // ✅ Check if polygon is inside a parent container and apply parent transformations
    const parentContainer = findParentContainer(polygon);
    if (parentContainer) {
      // Get world coordinates of the parent container
      const parentWorldCoords = getWorldCoordinates(parentContainer);

      // The polygon's position is relative to its parent, so we need to transform it
      // First, get the polygon's position relative to parent
      const relativeToParentX = polygon.x;
      const relativeToParentY = polygon.y;

      // Apply parent transformations to the relative position
      let parentTransformedX = relativeToParentX + transformedX;
      let parentTransformedY = relativeToParentY + transformedY;

      // Apply parent scale
      const parentScaleX = parentContainer.scaleX || 1;
      const parentScaleY = parentContainer.scaleY || 1;
      parentTransformedX *= parentScaleX;
      parentTransformedY *= parentScaleY;

      // Apply parent rotation
      const parentRotation = parentContainer.rotation || 0;
      if (parentRotation !== 0) {
        const cos = Math.cos(parentRotation);
        const sin = Math.sin(parentRotation);
        const rotatedX = parentTransformedX * cos - parentTransformedY * sin;
        const rotatedY = parentTransformedX * sin + parentTransformedY * cos;
        parentTransformedX = rotatedX;
        parentTransformedY = rotatedY;
      }

      // Add parent world position
      worldX = parentWorldCoords.x + parentTransformedX;
      worldY = parentWorldCoords.y + parentTransformedY;
    }

    return { x: worldX, y: worldY };
  }

  private handleVertexMove(deltaX: number, deltaY: number) {
    if (
      this.state.transformType !== "vertex" ||
      this.selectedShapes.length !== 1
    )
      return;

    const polygon = this.selectedShapes[0] as PolygonShape;
    if (polygon.type !== "polygon") return;

    const vertexIndex = this.state.editingVertexIndex;
    if (vertexIndex < 0 || vertexIndex >= polygon.points.length) return;

    const currentWorldPoint = this.transformPointWithPolygon(
      this.state.originalPolygonPoints[vertexIndex],
      polygon
    );
    const newWorldX = currentWorldPoint.x + deltaX;
    const newWorldY = currentWorldPoint.y + deltaY;

    // ✅ Apply enhanced snapping with guide lines
    const guideLines = getGuideLines();
    let snappedWorldPoint = { x: newWorldX, y: newWorldY };

    if (guideLines) {
      const snapPoints = this.getVertexSnapPoints(polygon, vertexIndex);
      const polygonEdges = this.getPolygonEdgesForVertex(polygon, vertexIndex);

      // Apply enhanced snapping
      snappedWorldPoint = this.applyEnhancedVertexSnapping(
        newWorldX,
        newWorldY,
        snapPoints,
        polygonEdges,
        guideLines
      );

      // ✅ Show guide lines during vertex editing
      guideLines.showSnapGuides(
        snappedWorldPoint.x,
        snappedWorldPoint.y,
        snapPoints
      );
      guideLines.showPolygonEdgeGuides(
        snappedWorldPoint.x,
        snappedWorldPoint.y,
        polygonEdges
      );
    }

    // Transform snapped world coordinates back to local polygon space
    const snappedLocalDelta = this.worldToLocalDelta(
      snappedWorldPoint.x - currentWorldPoint.x,
      snappedWorldPoint.y - currentWorldPoint.y,
      polygon
    );

    const originalPoint = this.state.originalPolygonPoints[vertexIndex];
    polygon.points[vertexIndex] = {
      ...originalPoint,
      x: originalPoint.x + snappedLocalDelta.x,
      y: originalPoint.y + snappedLocalDelta.y,
    };

    updatePolygonGraphics(polygon);

    // ✅ Update handle position using the new transformed coordinates
    const handle = this.polygonVertexHandles[vertexIndex];
    if (handle) {
      const worldPoint = this.transformPointWithPolygon(
        polygon.points[vertexIndex],
        polygon
      );
      handle.graphics.x = worldPoint.x;
      handle.graphics.y = worldPoint.y;
    }

    this.updateSelection(this.selectedShapes);
  }

  private applyEnhancedVertexSnapping = (
    x: number,
    y: number,
    snapPoints: Array<{ x: number; y: number }>,
    polygonEdges: Array<{
      start: { x: number; y: number };
      end: { x: number; y: number };
      slope: number | null;
      intercept: number | null;
    }>,
    guideLines: any
  ): { x: number; y: number } => {
    const GUIDE_LINE_SNAP_THRESHOLD = 5; // 5px threshold for guide line snapping

    let finalX = x;
    let finalY = y;

    // First apply grid snapping
    const gridSnap = guideLines.snapToGrid(x, y);

    // Then apply object snapping
    const objectSnap = guideLines.snapToPoints(x, y, snapPoints);

    // ✅ Apply polygon edge snapping
    const edgeSnap = guideLines.snapToPolygonEdges(x, y, polygonEdges);

    // Check for guide line alignment (vertical and horizontal lines through snap points)
    let alignedToVerticalGuide = false;
    let alignedToHorizontalGuide = false;

    // Check if current position is near any vertical guide lines
    for (const point of snapPoints) {
      const distanceToVerticalLine = Math.abs(x - point.x);
      if (distanceToVerticalLine <= GUIDE_LINE_SNAP_THRESHOLD) {
        finalX = point.x; // Snap to the vertical guide line
        alignedToVerticalGuide = true;
        break;
      }
    }

    // Check if current position is near any horizontal guide lines
    for (const point of snapPoints) {
      const distanceToHorizontalLine = Math.abs(y - point.y);
      if (distanceToHorizontalLine <= GUIDE_LINE_SNAP_THRESHOLD) {
        finalY = point.y; // Snap to the horizontal guide line
        alignedToHorizontalGuide = true;
        break;
      }
    }

    // ✅ Check for polygon edge alignment (highest priority)
    const edgeDistance = Math.sqrt(
      Math.pow(edgeSnap.x - x, 2) + Math.pow(edgeSnap.y - y, 2)
    );
    if (edgeDistance < GUIDE_LINE_SNAP_THRESHOLD) {
      return edgeSnap; // Polygon edge snapping takes highest priority
    }

    // If not aligned to guide lines, use standard snapping priority
    if (!alignedToVerticalGuide) {
      const gridDistanceX = Math.abs(gridSnap.x - x);
      const objectDistanceX = Math.abs(objectSnap.x - x);
      finalX = objectDistanceX < gridDistanceX ? objectSnap.x : gridSnap.x;
    }

    if (!alignedToHorizontalGuide) {
      const gridDistanceY = Math.abs(gridSnap.y - y);
      const objectDistanceY = Math.abs(objectSnap.y - y);
      finalY = objectDistanceY < gridDistanceY ? objectSnap.y : gridSnap.y;
    }

    return { x: finalX, y: finalY };
  };

  private getVertexSnapPoints(
    currentPolygon: PolygonShape,
    excludeVertexIndex: number
  ): Array<{ x: number; y: number }> {
    const snapPoints: Array<{ x: number; y: number }> = [];

    // Add snap points from other shapes
    shapes.forEach((shape) => {
      if (shape.type === "container" || shape.id === currentPolygon.id) return;

      // Add shape center
      snapPoints.push({ x: shape.x, y: shape.y });

      // Add shape corners/edges based on type
      if (shape.type === "rectangle") {
        const halfWidth = shape.width / 2;
        const halfHeight = shape.height / 2;

        snapPoints.push(
          { x: shape.x - halfWidth, y: shape.y - halfHeight }, // Top-left
          { x: shape.x + halfWidth, y: shape.y - halfHeight }, // Top-right
          { x: shape.x - halfWidth, y: shape.y + halfHeight }, // Bottom-left
          { x: shape.x + halfWidth, y: shape.y + halfHeight }, // Bottom-right
          { x: shape.x, y: shape.y - halfHeight }, // Top-center
          { x: shape.x, y: shape.y + halfHeight }, // Bottom-center
          { x: shape.x - halfWidth, y: shape.y }, // Left-center
          { x: shape.x + halfWidth, y: shape.y } // Right-center
        );
      } else if (shape.type === "ellipse") {
        snapPoints.push(
          { x: shape.x - shape.radiusX, y: shape.y }, // Left
          { x: shape.x + shape.radiusX, y: shape.y }, // Right
          { x: shape.x, y: shape.y - shape.radiusY }, // Top
          { x: shape.x, y: shape.y + shape.radiusY } // Bottom
        );
      } else if (shape.type === "polygon" && shape.points) {
        // Add existing polygon points
        shape.points.forEach((point) => {
          snapPoints.push({ x: shape.x + point.x, y: shape.y + point.y });
        });
      }
    });

    // Add other vertices from the current polygon (excluding the one being edited)
    currentPolygon.points.forEach((point, index) => {
      if (index !== excludeVertexIndex) {
        const worldPoint = this.transformPointWithPolygon(
          point,
          currentPolygon
        );
        snapPoints.push(worldPoint);
      }
    });

    return snapPoints;
  }

  private getPolygonEdgesForVertex(
    currentPolygon: PolygonShape,
    excludeVertexIndex: number
  ): Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    slope: number | null;
    intercept: number | null;
  }> {
    const allEdges: Array<{
      start: { x: number; y: number };
      end: { x: number; y: number };
      slope: number | null;
      intercept: number | null;
    }> = [];

    // Get edges from other polygon shapes (excluding current polygon)
    shapes.forEach((shape) => {
      if (
        shape.type === "polygon" &&
        shape.id !== currentPolygon.id &&
        shape.points &&
        shape.points.length >= 3
      ) {
        // Convert relative points to world coordinates
        const worldPoints = shape.points.map((point) => ({
          x: shape.x + point.x,
          y: shape.y + point.y,
        }));

        const edges = createPolygonEdges(worldPoints);
        allEdges.push(...edges);
      }
    });

    // Add edges from current polygon (excluding edges connected to the vertex being edited)
    if (currentPolygon.points.length >= 3) {
      const worldPoints = currentPolygon.points.map((point) =>
        this.transformPointWithPolygon(point, currentPolygon)
      );

      // Create edges but exclude ones connected to the vertex being edited
      for (let i = 0; i < worldPoints.length; i++) {
        const nextIndex = (i + 1) % worldPoints.length;

        // Skip edges that involve the vertex being edited
        if (i === excludeVertexIndex || nextIndex === excludeVertexIndex) {
          continue;
        }

        const start = worldPoints[i];
        const end = worldPoints[nextIndex];
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;

        let slope: number | null;
        let intercept: number | null;

        if (Math.abs(deltaX) < 0.001) {
          slope = null;
          intercept = start.x;
        } else {
          slope = deltaY / deltaX;
          intercept = start.y - slope * start.x;
        }

        allEdges.push({ start, end, slope, intercept });
      }
    }

    return allEdges;
  }

  private worldToLocalDelta(
    worldDeltaX: number,
    worldDeltaY: number,
    polygon: PolygonShape
  ): { x: number; y: number } {
    let localDeltaX = worldDeltaX;
    let localDeltaY = worldDeltaY;

    // Reverse parent container transformations if polygon is nested
    const parentContainer = findParentContainer(polygon);
    if (parentContainer) {
      // Reverse parent rotation
      const parentRotation = -(parentContainer.rotation || 0);
      if (parentRotation !== 0) {
        const cos = Math.cos(parentRotation);
        const sin = Math.sin(parentRotation);
        const rotatedX = localDeltaX * cos - localDeltaY * sin;
        const rotatedY = localDeltaX * sin + localDeltaY * cos;
        localDeltaX = rotatedX;
        localDeltaY = rotatedY;
      }

      // Reverse parent scale
      const parentScaleX = parentContainer.scaleX || 1;
      const parentScaleY = parentContainer.scaleY || 1;
      if (parentScaleX !== 0) localDeltaX /= parentScaleX;
      if (parentScaleY !== 0) localDeltaY /= parentScaleY;
    }

    // Reverse polygon rotation
    const polygonRotation = -(polygon.rotation || 0);
    if (polygonRotation !== 0) {
      const cos = Math.cos(polygonRotation);
      const sin = Math.sin(polygonRotation);
      const rotatedX = localDeltaX * cos - localDeltaY * sin;
      const rotatedY = localDeltaX * sin + localDeltaY * cos;
      localDeltaX = rotatedX;
      localDeltaY = rotatedY;
    }

    // Reverse polygon scale
    const polygonScaleX = polygon.scaleX || 1;
    const polygonScaleY = polygon.scaleY || 1;
    if (polygonScaleX !== 0) localDeltaX /= polygonScaleX;
    if (polygonScaleY !== 0) localDeltaY /= polygonScaleY;

    return { x: localDeltaX, y: localDeltaY };
  }

  private worldToLocalDeltaMatrix(
    worldDeltaX: number,
    worldDeltaY: number,
    polygon: PolygonShape
  ): { x: number; y: number } {
    // Get the inverse of the polygon's world transform matrix
    const worldTransform = polygon.graphics.worldTransform;
    const inverseMatrix = worldTransform.clone().invert();

    // Transform the delta vector
    const deltaPoint = new PIXI.Point(worldDeltaX, worldDeltaY);
    const origin = new PIXI.Point(0, 0);

    // Apply inverse transform to both points
    const transformedDelta = inverseMatrix.apply(deltaPoint);
    const transformedOrigin = inverseMatrix.apply(origin);

    // Get the local delta
    return {
      x: transformedDelta.x - transformedOrigin.x,
      y: transformedDelta.y - transformedOrigin.y,
    };
  }

  private onVertexHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    vertexIndex: number
  ) {
    event.stopPropagation();
    if (!stage || this.selectedShapes.length !== 1) return;

    const polygon = this.selectedShapes[0] as PolygonShape;
    if (polygon.type !== "polygon") return;

    const localPoint = event.getLocalPosition(stage);

    const guideLines = getGuideLines();
    if (guideLines && stage) {
      const bounds = stage.getBounds();
      guideLines.createGrid(bounds.width * 2, bounds.height * 2);
    }

    this.state = {
      ...this.state,
      isTransforming: true,
      editingVertexIndex: vertexIndex,
      transformType: "vertex",
      transformStart: { x: localPoint.x, y: localPoint.y },
      originalPolygonPoints: [...polygon.points],
    };
  }

  private onFreeShapeVertexHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    pointIndex: number
  ) {
    event.stopPropagation();
    if (!stage || this.selectedShapes.length !== 1) return;

    const freeShape = this.selectedShapes[0] as FreeShape;
    if (freeShape.type !== "freeshape") return;

    const localPoint = event.getLocalPosition(stage);

    this.state = {
      ...this.state,
      isTransforming: true,
      editingVertexIndex: pointIndex,
      transformType: "vertex",
      transformStart: { x: localPoint.x, y: localPoint.y },
      originalPolygonPoints: freeShape.points.map((p) => ({ x: p.x, y: p.y })),
    };
  }

  private onFreeShapeControlPointHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    pointIndex: number,
    controlPointType: "cp1" | "cp2"
  ) {
    event.stopPropagation();
    if (!stage || this.selectedShapes.length !== 1) return;

    const freeShape = this.selectedShapes[0] as FreeShape;
    if (freeShape.type !== "freeshape") return;

    const localPoint = event.getLocalPosition(stage);

    this.state = {
      ...this.state,
      isTransforming: true,
      editingVertexIndex: pointIndex,
      transformType: "control-point",
      transformStart: { x: localPoint.x, y: localPoint.y },
      originalPolygonPoints: freeShape.points.map((p) => ({
        x: p.x,
        y: p.y,
        cp1x: p.cp1x,
        cp1y: p.cp1y,
        cp2x: p.cp2x,
        cp2y: p.cp2y,
      })),
    };
  }

  private drawControlPointLine(x1: number, y1: number, x2: number, y2: number) {
    const line = new PIXI.Graphics();
    line
      .moveTo(x1, y1)
      .lineTo(x2, y2)
      .stroke({
        width: 1 / zoom,
        color: 0x666666,
        alpha: 0.6,
      });

    this.container.addChildAt(line, 0);
  }

  private onHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    type: string,
    position: string
  ) {
    event.stopPropagation();
    if (!stage) return;

    const localPoint = event.getLocalPosition(stage);
    this.clearBendInfoCache();
    const bendInfo = this.getBendInfo();

    const originalSeatPositions = new Map<string, { x: number; y: number }>();

    if (type === "bend") {
      bendInfo.allSeats.forEach((seat) => {
        originalSeatPositions.set(seat.id, { x: seat.x, y: seat.y });
      });
    }

    this.state = {
      ...this.state,
      isTransforming: true,
      transformStart: { x: localPoint.x, y: localPoint.y },
      transformPosition: position,
      transformType:
        type === "rotate" ? "rotate" : type === "bend" ? "bend" : "scale",
      accumulatedRotation: 0,
      hasReachedThreshold: false,
      affectedRowIds: bendInfo.rowIds,
      bendType: bendInfo.type,
      originalSeatPositions,
      originalTransforms: this.selectedShapes.map((shape) => ({
        scaleX: shape.scaleX || 1,
        scaleY: shape.scaleY || 1,
        rotation: shape.rotation || 0,
        x: shape.x,
        y: shape.y,
      })),
    };
  }

  public onTransformPointerMove(event: PIXI.FederatedPointerEvent) {
    if (!this.state.isTransforming || !this.state.transformStart || !stage)
      return;

    const stageMovePoint = event.getLocalPosition(stage);
    const deltaX = stageMovePoint.x - this.state.transformStart.x;
    const deltaY = stageMovePoint.y - this.state.transformStart.y;

    if (this.state.transformType === "vertex") {
      this.handleVertexMove(deltaX, deltaY);
    } else if (this.state.transformType === "scale" && !isAreaMode) {
      this.handleScale(deltaX, deltaY);
    } else if (this.state.transformType === "rotate") {
      this.handleRotate(deltaX, deltaY);
    } else if (this.state.transformType === "bend") {
      this.handleBend(deltaY);
    }
  }

  private handleBend(deltaY: number) {
    if (!this.boundingBox) return;

    const bendInfo = this.getBendInfo();

    if (bendInfo.type === null || bendInfo.rows.length === 0) return;

    let bendSensitivity = 0.001;

    if (bendInfo.type === "grid") {
      bendSensitivity = 0.0005;
    } else if (bendInfo.type === "multi-row") {
      bendSensitivity = 0.0007;
    }

    const currentBendValue = deltaY * bendSensitivity;
    const clampedBendValue = Math.max(-0.5, Math.min(0.5, currentBendValue));

    bendInfo.rows.forEach((row) => {
      this.applyBendToRowIncremental(row, clampedBendValue);
    });

    updateMultipleRowLabelRotations(bendInfo.rows);

    this.updateSelection(this.selectedShapes);
  }
  private applyBendToRowIncremental(row: RowShape, bendValue: number) {
    const rowSeats = row.children;
    if (rowSeats.length < 2) return;

    const sortedSeats = [...rowSeats].sort((a, b) => a.x - b.x);

    // Get original positions from transform start
    const originalPositions = sortedSeats
      .map((seat) => ({
        seat,
        original: this.state.originalSeatPositions.get(seat.id),
      }))
      .filter((item) => item.original !== undefined);

    if (originalPositions.length === 0) return;

    const originalXPositions = originalPositions.map(
      (item) => item.original!.x
    );
    const minX = Math.min(...originalXPositions);
    const maxX = Math.max(...originalXPositions);
    const rowCenterX = (minX + maxX) / 2;
    const rowWidth = maxX - minX;

    if (rowWidth === 0) return;

    // ✅ Calculate the existing bend state from original positions
    const calculateExistingBend = (): number => {
      if (originalPositions.length < 3) return 0;

      // Find the seat closest to center
      let centerSeat = originalPositions[0];
      let minDistanceToCenter = Math.abs(
        originalPositions[0].original!.x - rowCenterX
      );

      originalPositions.forEach((item) => {
        const distance = Math.abs(item.original!.x - rowCenterX);
        if (distance < minDistanceToCenter) {
          minDistanceToCenter = distance;
          centerSeat = item;
        }
      });

      // Calculate baseline from edge seats
      const leftEdge = originalPositions.find(
        (item) => item.original!.x === minX
      );
      const rightEdge = originalPositions.find(
        (item) => item.original!.x === maxX
      );

      if (!leftEdge || !rightEdge) return 0;

      const edgeBaseline = (leftEdge.original!.y + rightEdge.original!.y) / 2;
      const centerOffset = centerSeat.original!.y - edgeBaseline;

      // Convert back to bend value
      const maxPossibleOffset = rowWidth * 0.5;
      return maxPossibleOffset > 0 ? centerOffset / maxPossibleOffset : 0;
    };

    const existingBendValue = calculateExistingBend();
    const totalBendValue = existingBendValue + bendValue;
    const clampedTotalBend = Math.max(-0.5, Math.min(0.5, totalBendValue));

    // Calculate baseline Y (average of edge seats)
    const leftEdgeY =
      originalPositions.find((item) => item.original!.x === minX)?.original!
        .y || originalPositions[0].original!.y;
    const rightEdgeY =
      originalPositions.find((item) => item.original!.x === maxX)?.original!
        .y || originalPositions[originalPositions.length - 1].original!.y;
    const baselineY = (leftEdgeY + rightEdgeY) / 2;

    // ✅ Apply total bend from baseline
    originalPositions.forEach(({ seat, original }) => {
      if (!original) return;

      const normalizedX = (original.x - rowCenterX) / (rowWidth / 2);
      const totalBendOffset =
        clampedTotalBend * rowWidth * 0.5 * (1 - normalizedX * normalizedX);

      seat.x = original.x;
      seat.y = baselineY + totalBendOffset;
      seat.graphics.position.set(seat.x, seat.y);
    });

    updateRowLabelPosition(row);
  }

  public onTransformPointerUp() {
    if (!this.state.isTransforming) return;

    const transformType = this.state.transformType;
    const editingVertexIndex = this.state.editingVertexIndex;
    const originalPolygonPoints = [...this.state.originalPolygonPoints];

    if (transformType === "vertex") {
      const guideLines = getGuideLines();
      if (guideLines) {
        guideLines.clearAll();
      }
    }

    if (transformType === "vertex" && editingVertexIndex !== null) {
      const beforeState = cloneCanvasItems(this.selectedShapes);

      if (
        this.selectedShapes.length === 1 &&
        this.selectedShapes[0].type === "polygon"
      ) {
        const polygon = beforeState[0] as PolygonShape;
        polygon.points = [...originalPolygonPoints];
      }

      const afterState = cloneCanvasItems(this.selectedShapes);

      const hasChanged = this.hasVertexChangedWithData(
        editingVertexIndex,
        originalPolygonPoints
      );
      if (hasChanged) {
        setShapes([...shapes]);
        useSeatMapStore.getState().updateShapes([...shapes], false);
        useSeatMapStore.getState().saveDirectHistory(beforeState, afterState);
      }
    } else if (transformType === "bend") {
      let beforeState = cloneCanvasItems(this.selectedShapes);
      let before: CanvasItem[] = [];
      let afterState = cloneCanvasItems(this.selectedShapes);
      let after: CanvasItem[] = [];
      if ("gridName" in beforeState[0]) {
        (beforeState as GridShape[]).forEach((grid) => {
          (grid as GridShape).children.forEach((row) => {
            (row as RowShape).children.forEach((seat) => {
              Object.assign(
                seat,
                this.state.originalSeatPositions.get(seat.id)!
              );
            });
            before = [...before, ...row.children];
          });
        });
        (afterState as GridShape[]).forEach((grid) => {
          (grid as GridShape).children.forEach((row) => {
            after = [...after, ...row.children];
          });
        });
      } else if ("rowName" in beforeState[0]) {
        (beforeState as RowShape[]).forEach((row) => {
          (row as RowShape).children.forEach((seat) => {
            Object.assign(seat, this.state.originalSeatPositions.get(seat.id)!);
          });
          before = [...before, ...row.children];
        });
        (afterState as RowShape[]).forEach((row) => {
          after = [...after, ...row.children];
        });
      } else {
        before = beforeState;
        this.state.originalTransforms.forEach((originalTransform, index) => {
          if (before[index]) {
            Object.assign(before[index], originalTransform);
          }
        });
        after = afterState;
      }

      setShapes([...shapes]);
      useSeatMapStore.getState().updateShapes(
        [...shapes],
        false,
        {
          topLevel: [],
          nested: [],
          operation: "modify",
        },
        false
      );
      useSeatMapStore.getState().saveDirectHistory(before, after);
    } else if (
      transformType === "scale" ||
      transformType === "rotate" ||
      transformType === "move"
    ) {
      const beforeState = cloneCanvasItems(this.selectedShapes);

      this.state.originalTransforms.forEach((originalTransform, index) => {
        if (beforeState[index]) {
          Object.assign(beforeState[index], originalTransform);
        }
      });
      const afterState = cloneCanvasItems(this.selectedShapes);
      setShapes([...shapes]);
      useSeatMapStore.getState().updateShapes([...shapes], false);
      useSeatMapStore.getState().saveDirectHistory(beforeState, afterState);
    }

    this.resetState();
    this.resetRotationHandleAppearance();
    setWasTransformed(true);
  }

  private hasVertexChangedWithData(
    editingVertexIndex: number,
    originalPolygonPoints: Array<{ x: number; y: number; radius?: number }>
  ): boolean {
    if (
      this.selectedShapes.length !== 1 ||
      this.selectedShapes[0].type !== "polygon"
    ) {
      return false;
    }

    const polygon = this.selectedShapes[0] as PolygonShape;

    if (editingVertexIndex < 0 || editingVertexIndex >= polygon.points.length)
      return false;

    const original = originalPolygonPoints[editingVertexIndex];
    const current = polygon.points[editingVertexIndex];

    if (!original || !current) return false;

    return (
      Math.abs(original.x - current.x) > 1 ||
      Math.abs(original.y - current.y) > 1
    );
  }

  public get isCurrentlyTransforming(): boolean {
    return this.state.isTransforming;
  }

  private handleScale(deltaX: number, deltaY: number) {
    if (!this.boundingBox) return;

    const scaleFactors = this.calculateScaleFactors(deltaX, deltaY);
    this.applyTransforms(scaleFactors, null);
  }

  private handleRotate(deltaX: number, deltaY: number) {
    if (!this.boundingBox) return;

    const rotationDelta = (deltaX + deltaY) * 0.01;

    if (this.selectedShapes.length > 1) {
      this.state.accumulatedRotation += rotationDelta;
      if (Math.abs(this.state.accumulatedRotation) >= this.rotationThreshold) {
        this.state.hasReachedThreshold = true;
        this.showThresholdReachedFeedback();
        return;
      }
    }

    this.applyTransforms(null, rotationDelta);
  }

  private calculateScaleFactors(
    deltaX: number,
    deltaY: number
  ): { scaleX: number; scaleY: number } {
    let scaleFactorX = 1;
    let scaleFactorY = 1;
    const sensitivity = 0.01;

    const scaleConfigs: Record<string, { x: number; y: number }> = {
      "top-left": { x: -deltaX, y: -deltaY },
      "top-right": { x: deltaX, y: -deltaY },
      "bottom-left": { x: -deltaX, y: deltaY },
      "bottom-right": { x: deltaX, y: deltaY },
      top: { x: 0, y: -deltaY },
      bottom: { x: 0, y: deltaY },
      left: { x: -deltaX, y: 0 },
      right: { x: deltaX, y: 0 },
    };

    const config = scaleConfigs[this.state.transformPosition];
    if (config) {
      scaleFactorX = 1 + config.x * sensitivity;
      scaleFactorY = 1 + config.y * sensitivity;
    }

    return {
      scaleX: Math.max(0.1, Math.min(3, scaleFactorX)),
      scaleY: Math.max(0.1, Math.min(3, scaleFactorY)),
    };
  }

  private applyTransforms(
    scaleFactors: { scaleX: number; scaleY: number } | null,
    rotationDelta: number | null
  ) {
    this.selectedShapes.forEach((shape, index) => {
      const original = this.state.originalTransforms[index];
      if (!original) return;

      if (this.selectedShapes.length === 1) {
        this.applySingleShapeTransform(
          shape,
          original,
          scaleFactors,
          rotationDelta
        );
      } else {
        this.applyMultiShapeTransform(
          shape,
          original,
          scaleFactors,
          rotationDelta
        );
      }
    });
    if (rotationDelta !== null && this.selectedShapes.length > 1) {
      const seatShapes = this.selectedShapes.filter(
        (shape): shape is SeatShape =>
          shape.type === "ellipse" && "rowId" in shape && "gridId" in shape
      );

      if (seatShapes.length > 0) {
        updateMultipleSeatLabelsRotation(seatShapes);
      }
    }
    this.updateSelection(this.selectedShapes);
  }

  private applySingleShapeTransform(
    shape: CanvasItem,
    original: any,
    scaleFactors: { scaleX: number; scaleY: number } | null,
    rotationDelta: number | null
  ) {
    if (shape.type !== "svg") {
      shape.graphics.pivot.set(0, 0);
    }

    if (scaleFactors) {
      shape.scaleX = original.scaleX * scaleFactors.scaleX;
      shape.scaleY = original.scaleY * scaleFactors.scaleY;
    }

    if (rotationDelta !== null) {
      shape.rotation = original.rotation + rotationDelta;
    }
    if (shape.type === "image") {
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
    } else if (shape.type === "svg") {
      const svgShape = shape as SVGShape;
      updateSVGGraphics(svgShape);
    } else if (shape.type === "polygon") {
      const polygon = shape as PolygonShape;

      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
      updatePolygonGraphics(polygon);
    } else if (
      shape.type === "ellipse" &&
      "rowId" in shape &&
      "gridId" in shape
    ) {
      const seat = shape as SeatShape;

      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
      const row = getRowByIdFromAllGrids(seat.rowId);
      const grid = getGridByRowId(seat.rowId);
      updateSeatLabelRotation(seat, row, grid);
    } else if (shape.type === "container" && "gridName" in shape) {
      const grid = shape as GridShape;

      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;

      const bendInfo = this.state.cachedBendInfo;
      if (bendInfo && bendInfo.grids.some((g) => g.id === grid.id)) {
        updateMultipleRowLabelRotations(grid.children);

        grid.children.forEach((row) => {
          row.children.forEach((seat) => {
            updateSeatLabelRotation(seat, row, grid);
          });
        });
      } else {
        updateMultipleRowLabelRotations(grid.children);

        grid.children.forEach((row) => {
          row.children.forEach((seat) => {
            updateSeatLabelRotation(seat, row, grid);
          });
        });
      }
    } else if (shape.type === "container" && "rowName" in shape) {
      const row = shape as RowShape;

      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;

      updateRowLabelRotation(row);
      const grid = getGridByRowId(row.id);
      row.children.forEach((seat) => {
        updateSeatLabelRotation(seat, row, grid);
      });
    } else {
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
    }
  }

  private applyMultiShapeTransform(
    shape: CanvasItem,
    original: any,
    scaleFactors: { scaleX: number; scaleY: number } | null,
    rotationDelta: number | null
  ) {
    if (!this.boundingBox) return;

    const worldCoords = getWorldCoordinates({
      ...shape,
      x: original.x,
      y: original.y,
    });
    const relativeX = worldCoords.x - this.boundingBox.centerX;
    const relativeY = worldCoords.y - this.boundingBox.centerY;

    let newRelativeX = relativeX;
    let newRelativeY = relativeY;

    if (scaleFactors) {
      newRelativeX = relativeX * scaleFactors.scaleX;
      newRelativeY = relativeY * scaleFactors.scaleY;
      shape.scaleX = original.scaleX * scaleFactors.scaleX;
      shape.scaleY = original.scaleY * scaleFactors.scaleY;
    }

    if (rotationDelta !== null) {
      const cos = Math.cos(rotationDelta);
      const sin = Math.sin(rotationDelta);
      newRelativeX = relativeX * cos - relativeY * sin;
      newRelativeY = relativeX * sin + relativeY * cos;
      shape.rotation = original.rotation + rotationDelta;
    }

    const newWorldX = this.boundingBox.centerX + newRelativeX;
    const newWorldY = this.boundingBox.centerY + newRelativeY;

    const parentContainer = findParentContainer(shape);
    if (parentContainer) {
      const parentWorldCoords = getWorldCoordinates(parentContainer);
      shape.x = newWorldX - parentWorldCoords.x;
      shape.y = newWorldY - parentWorldCoords.y;
    } else {
      shape.x = newWorldX;
      shape.y = newWorldY;
    }

    this.updateShapeGraphics(shape);
  }

  private updateShapeGraphics(shape: CanvasItem) {
    if (shape.type === "svg") {
      const svgShape = shape as SVGShape;
      updateSVGGraphics(svgShape);
    } else if (shape.type === "polygon") {
      const polygon = shape as PolygonShape;

      shape.graphics.pivot.set(0, 0);
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;

      updatePolygonGraphics(polygon);
    } else if (
      shape.type === "ellipse" &&
      "rowId" in shape &&
      "gridId" in shape
    ) {
      const seat = shape as SeatShape;

      shape.graphics.pivot.set(0, 0);
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;

      const row = getRowByIdFromAllGrids(seat.rowId);
      const grid = getGridByRowId(seat.rowId);
      updateSeatLabelRotation(seat, row, grid);
    } else {
      shape.graphics.pivot.set(0, 0);
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
    }
  }

  private calculateBoundingBox(shapes: CanvasItem[]): BoundingBox | null {
    if (shapes.length === 0) return null;
    return calculateGroupBounds(shapes);
  }

  private updateHandlePositions() {
    if (!this.boundingBox) return;

    const { x, y, width, height, centerX, centerY } = this.boundingBox;
    const rotateDistance = 30;
    const bendDistance = 40;
    const handleScale = 1 / zoom;

    const positions: Record<string, { x: number; y: number }> = {
      "top-left": { x, y },
      "top-right": { x: x + width, y },
      "bottom-left": { x, y: y + height },
      "bottom-right": { x: x + width, y: y + height },
      top: { x: centerX, y },
      bottom: { x: centerX, y: y + height },
      left: { x, y: centerY },
      right: { x: x + width, y: centerY },
      rotate: { x: centerX, y: y - rotateDistance },
      bend: { x: centerX, y: y + height + bendDistance },
    };

    this.handles.forEach((handle) => {
      const pos = positions[handle.position];
      if (pos) {
        handle.graphics.x = pos.x;
        handle.graphics.y = pos.y;
        handle.graphics.scale.set(handleScale);

        if (handle.type === "bend") {
          handle.graphics.visible = this.shouldShowBendHandle();

          if (handle.graphics.visible) {
            this.updateBendHandleAppearance(handle.graphics);
          }
        } else {
          handle.graphics.visible = true;
        }
      }
    });
  }

  private updateBendHandleAppearance(graphics: PIXI.Graphics) {
    const bendInfo = this.getBendInfo();
    const handleSize = 8;
    let fillColor = 0xff9500;
    let strokeColor = 0xcc7700;

    if (bendInfo.type === "grid") {
      fillColor = 0xff3366;
      strokeColor = 0xcc1144;
    } else if (bendInfo.type === "multi-row") {
      fillColor = 0x9933ff;
      strokeColor = 0x7722cc;
    }

    graphics
      .clear()
      .poly([
        { x: 0, y: -handleSize / 2 },
        { x: handleSize / 2, y: 0 },
        { x: 0, y: handleSize / 2 },
        { x: -handleSize / 2, y: 0 },
      ])
      .fill(fillColor)
      .stroke({ width: 2, color: strokeColor });
  }

  private drawSelectionBox() {
    if (!this.boundingBox) return;

    this.container.children
      .filter((child) => !this.handles.some((h) => h.graphics === child))
      .filter(
        (child) => !this.polygonVertexHandles.some((h) => h.graphics === child)
      )
      .forEach((child) => this.container.removeChild(child));

    const selectionBox = new PIXI.Graphics();
    const { x, y, width, height } = this.boundingBox;

    selectionBox.rect(x, y, width, height).stroke({
      width: 2 / zoom,
      color: 0x0099ff,
      alpha: 0.8,
      join: "dashed" as any,
    });

    selectionBox.eventMode = "static";
    this.container.addChildAt(selectionBox, 0);
  }

  private showThresholdReachedFeedback() {
    const rotateHandle = this.handles.find((h) => h.position === "rotate");
    if (rotateHandle) {
      rotateHandle.graphics
        .clear()
        .circle(0, 0, 4)
        .fill(0xff6b6b)
        .stroke({ width: 2, color: 0xcc0000 });
    }
  }

  private resetRotationHandleAppearance() {
    const rotateHandle = this.handles.find((h) => h.position === "rotate");
    if (rotateHandle) {
      rotateHandle.graphics
        .clear()
        .circle(0, 0, 4)
        .fill(0x00ff00)
        .stroke({ width: 2, color: 0x008800 });
    }
  }

  private resetState() {
    this.state = {
      isTransforming: false,
      transformType: null,
      transformStart: null,
      transformPosition: "",
      originalTransforms: [],
      accumulatedRotation: 0,
      hasReachedThreshold: false,
      affectedRowIds: [],
      bendType: null,
      editingVertexIndex: -1,
      originalPolygonPoints: [],
      originalSeatPositions: new Map(),
      cachedBendInfo: null,
    };
  }

  public updateSelection(shapes: CanvasItem[]) {
    this.selectedShapes = shapes;
    this.boundingBox = this.calculateBoundingBox(shapes);

    this.clearBendInfoCache();
    if (this.boundingBox && shapes.length > 0) {
      this.drawSelectionBox();
      this.updateHandlePositions();
      this.updatePolygonVertexHandles();
      this.container.visible = true;
    } else {
      this.container.visible = false;
    }
  }

  public destroy() {
    this.container.destroy();
  }
}

let selectionTransform: SelectionTransform | null = null;

export const createSelectionTransform = (
  container: PIXI.Container
): SelectionTransform => {
  if (selectionTransform) {
    selectionTransform.destroy();
  }
  selectionTransform = new SelectionTransform(container);
  return selectionTransform;
};

export const getSelectionTransform = (): SelectionTransform | null =>
  selectionTransform;

export const destroySelectionTransform = () => {
  if (selectionTransform) {
    selectionTransform.destroy();
    selectionTransform = null;
  }
};
