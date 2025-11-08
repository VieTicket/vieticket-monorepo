import * as PIXI from "pixi.js";
import {
  CanvasItem,
  PolygonShape,
  RowData,
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
import { checkDomainOfScale } from "recharts/types/util/ChartUtils";
import { getRowByIdFromAllGrids } from "../shapes/seats";

export interface TransformHandle {
  type: "corner" | "edge" | "rotate" | "bend" | "vertex";
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
    | `vertex-${number}`;
  graphics: PIXI.Graphics;
}

interface TransformState {
  isTransforming: boolean;
  transformType: "move" | "scale" | "rotate" | "bend" | "vertex" | null;
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
  originalBendValues: Map<string, number>;
  affectedRowIds: string[];
  bendType: "single-row" | "multi-row" | "grid" | null;
  editingVertexIndex: number;
}

export class SelectionTransform {
  private selectedShapes: CanvasItem[] = [];
  private boundingBox: BoundingBox | null = null;
  private handles: TransformHandle[] = [];
  private polygonVertexHandles: TransformHandle[] = [];
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
    originalBendValues: new Map(),
    affectedRowIds: [],
    bendType: null,
    editingVertexIndex: -1,
  };
  private readonly rotationThreshold = Math.PI * 7;

  constructor(container: PIXI.Container) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.createHandles();
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

  private getBendInfo(): {
    type: "single-row" | "multi-row" | "grid" | null;
    rowIds: string[];
    gridIds: string[];
  } {
    if (!isAreaMode || this.selectedShapes.length < 2) {
      return { type: null, rowIds: [], gridIds: [] };
    }

    const seatShapes = this.selectedShapes.filter(
      (shape): shape is SeatShape =>
        shape.type === "ellipse" && "rowId" in shape && "gridId" in shape
    ) as SeatShape[];

    if (seatShapes.length !== this.selectedShapes.length) {
      return { type: null, rowIds: [], gridIds: [] };
    }

    const uniqueRowIds = [...new Set(seatShapes.map((seat) => seat.rowId))];
    const uniqueGridIds = [...new Set(seatShapes.map((seat) => seat.gridId))];

    if (uniqueRowIds.length === 1) {
      return {
        type: "single-row",
        rowIds: uniqueRowIds,
        gridIds: uniqueGridIds,
      };
    } else if (uniqueGridIds.length === 1) {
      const grid = areaModeContainer?.grids.find(
        (g) => g.id === uniqueGridIds[0]
      );
      if (grid && uniqueRowIds.length === grid.rows.length) {
        return { type: "grid", rowIds: uniqueRowIds, gridIds: uniqueGridIds };
      } else {
        return {
          type: "multi-row",
          rowIds: uniqueRowIds,
          gridIds: uniqueGridIds,
        };
      }
    } else {
      return {
        type: "multi-row",
        rowIds: uniqueRowIds,
        gridIds: uniqueGridIds,
      };
    }
  }

  private shouldShowBendHandle(): boolean {
    const bendInfo = this.getBendInfo();
    return bendInfo.type !== null;
  }

  private getAffectedRowsData(): RowData[] {
    if (!areaModeContainer) return [];

    const bendInfo = this.getBendInfo();
    const rowsData: RowData[] = [];

    for (const rowId of bendInfo.rowIds) {
      for (const grid of areaModeContainer.grids) {
        const row = grid.rows.find((r) => r.id === rowId);
        if (row) {
          rowsData.push(row);
          break;
        }
      }
    }

    return rowsData;
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

      const worldX = polygon.x + point.x;
      const worldY = polygon.y + point.y;
      handle.graphics.visible = true;
      handle.graphics.x = worldX;
      handle.graphics.y = worldY;
      handle.graphics.scale.set(1 / zoom);
    }
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

    this.state = {
      ...this.state,
      isTransforming: true,
      editingVertexIndex: vertexIndex,
      transformType: "vertex",
      transformStart: { x: localPoint.x, y: localPoint.y },
      originalPolygonPoints: [...polygon.points],
    };
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

    const originalPoint = this.state.originalPolygonPoints[vertexIndex];
    polygon.points[vertexIndex] = {
      ...originalPoint,
      x: originalPoint.x + deltaX,
      y: originalPoint.y + deltaY,
    };

    updatePolygonGraphics(polygon);

    const handle = this.polygonVertexHandles[vertexIndex];
    if (handle) {
      const worldX = polygon.x + polygon.points[vertexIndex].x;
      const worldY = polygon.y + polygon.points[vertexIndex].y;
      handle.graphics.x = worldX;
      handle.graphics.y = worldY;
    }
    this.updateSelection(this.selectedShapes);
  }
  private onHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    type: string,
    position: string
  ) {
    event.stopPropagation();
    if (!stage) return;

    const localPoint = event.getLocalPosition(stage);

    const bendInfo = this.getBendInfo();
    const affectedRows = this.getAffectedRowsData();
    const originalBendValues = new Map<string, number>();

    affectedRows.forEach((row) => {
      originalBendValues.set(row.id, row.bend || 0);
    });

    this.state = {
      ...this.state,
      isTransforming: true,
      transformStart: { x: localPoint.x, y: localPoint.y },
      transformPosition: position,
      transformType:
        type === "rotate" ? "rotate" : type === "bend" ? "bend" : "scale",
      accumulatedRotation: 0,
      hasReachedThreshold: false,
      originalBendValues,
      affectedRowIds: bendInfo.rowIds,
      bendType: bendInfo.type,
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
    } else if (this.state.transformType === "scale") {
      this.handleScale(deltaX, deltaY);
    } else if (this.state.transformType === "rotate") {
      this.handleRotate(deltaX, deltaY);
    } else if (this.state.transformType === "bend") {
      this.handleBend(deltaY);
    }
  }

  private handleBend(deltaY: number) {
    if (!this.boundingBox || this.state.affectedRowIds.length === 0) return;

    const bendSensitivity = 0.001;

    this.state.affectedRowIds.forEach((rowId) => {
      const originalBendValue = this.state.originalBendValues.get(rowId) || 0;
      const bendValue = originalBendValue + deltaY * bendSensitivity;

      const clampedBendValue = Math.max(-0.5, Math.min(0.5, bendValue));

      this.updateRowBendValue(rowId, clampedBendValue);
    });

    this.applyBendToMultipleRows();
  }

  private updateRowBendValue(rowId: string, bendValue: number) {
    if (!areaModeContainer) return;

    for (const grid of areaModeContainer.grids) {
      const row = grid.rows.find((r) => r.id === rowId);
      if (row) {
        row.bend = bendValue;
        break;
      }
    }
  }

  private applyBendToMultipleRows() {
    if (!this.boundingBox) return;

    const seatShapes = this.selectedShapes as SeatShape[];

    const seatsByRow = new Map<string, SeatShape[]>();
    seatShapes.forEach((seat) => {
      if (!seatsByRow.has(seat.rowId)) {
        seatsByRow.set(seat.rowId, []);
      }
      seatsByRow.get(seat.rowId)!.push(seat);
    });

    seatsByRow.forEach((rowSeats, rowId) => {
      const rowBendValue = this.getCurrentRowBendValue(rowId);
      this.applyBendToRow(rowSeats, rowId, rowBendValue);
    });

    this.updateSelection(this.selectedShapes);
  }

  private applyBendToRow(
    rowSeats: SeatShape[],
    rowId: string,
    bendValue: number
  ) {
    if (rowSeats.length < 2) return;

    const sortedSeats = [...rowSeats].sort((a, b) => a.x - b.x);

    const originalPositions = sortedSeats
      .map((seat) => {
        const originalIndex = this.selectedShapes.findIndex(
          (s) => s.id === seat.id
        );
        return this.state.originalTransforms[originalIndex];
      })
      .filter(Boolean);

    if (originalPositions.length !== sortedSeats.length) return;

    const originalXPositions = originalPositions.map((pos) => pos.x);
    const minX = Math.min(...originalXPositions);
    const maxX = Math.max(...originalXPositions);
    const rowCenterX = (minX + maxX) / 2;
    const rowWidth = maxX - minX;

    if (rowWidth === 0) return;

    sortedSeats.forEach((seat, index) => {
      const original = originalPositions[index];
      if (!original) return;

      const normalizedX = (original.x - rowCenterX) / (rowWidth / 2);

      const bendOffset =
        bendValue * rowWidth * 0.5 * (1 - normalizedX * normalizedX);

      seat.x = original.x;
      seat.y = original.y + bendOffset;

      seat.graphics.position.set(seat.x, seat.y);
    });
  }

  private getCurrentRowBendValue(rowId: string): number {
    if (!areaModeContainer) return 0;

    for (const grid of areaModeContainer.grids) {
      const row = grid.rows.find((r) => r.id === rowId);
      if (row) {
        return row.bend || 0;
      }
    }

    return 0;
  }

  public onTransformPointerUp() {
    if (!this.state.isTransforming) return;

    // ✅ Capture state before resetting it
    const transformType = this.state.transformType;
    const editingVertexIndex = this.state.editingVertexIndex;
    const originalPolygonPoints = [...this.state.originalPolygonPoints];

    // ✅ Handle different transformation types BEFORE resetting state
    if (transformType === "vertex" && editingVertexIndex !== null) {
      // Handle vertex editing completion
      const beforeState = cloneCanvasItems(this.selectedShapes);

      // Restore original points for "before" state
      if (
        this.selectedShapes.length === 1 &&
        this.selectedShapes[0].type === "polygon"
      ) {
        const polygon = beforeState[0] as PolygonShape;
        polygon.points = [...originalPolygonPoints];
      }

      const afterState = this.selectedShapes;

      // Save to history only if vertex actually moved
      const hasChanged = this.hasVertexChangedWithData(
        editingVertexIndex,
        originalPolygonPoints
      );
      if (hasChanged) {
        setShapes([...shapes]);
        useSeatMapStore.getState().updateShapes([...shapes], false);
        useSeatMapStore.getState().saveDirectHistory(beforeState, afterState);
      }
    } else if (
      transformType === "bend" ||
      transformType === "scale" ||
      transformType === "rotate" ||
      transformType === "move"
    ) {
      // Handle regular transformations
      const beforeState = cloneCanvasItems(this.selectedShapes);

      // Apply original transforms to before state
      this.state.originalTransforms.forEach((originalTransform, index) => {
        if (beforeState[index]) {
          Object.assign(beforeState[index], originalTransform);
        }
      });

      const afterState = this.selectedShapes;

      // Save regular transformation to history
      setShapes([...shapes]);
      useSeatMapStore.getState().updateShapes([...shapes], false);
      useSeatMapStore.getState().saveDirectHistory(beforeState, afterState);
    }

    // ✅ Reset state AFTER handling all transformation completions
    this.resetState();
    this.resetRotationHandleAppearance();
    setWasTransformed(true);
  }

  // ✅ Helper method to check vertex changes with captured data
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
      originalBendValues: new Map(),
      affectedRowIds: [],
      bendType: null,
      editingVertexIndex: -1,
      originalPolygonPoints: [],
    };
  }

  public updateSelection(shapes: CanvasItem[]) {
    this.selectedShapes = shapes;
    this.boundingBox = this.calculateBoundingBox(shapes);

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
