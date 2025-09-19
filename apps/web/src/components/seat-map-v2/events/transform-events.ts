import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup, PolygonShape, SVGShape } from "../types";
import { stage, zoom, shapes, setWasTransformed } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { calculateItemBounds } from "../utils/bounds";
import { findParentContainer } from "../shapes";
import { updateSVGGraphics } from "../shapes/svg-shape";

export interface TransformHandle {
  type: "corner" | "edge" | "rotate";
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "rotate";
  graphics: PIXI.Graphics;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface WorldTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

interface TransformState {
  isTransforming: boolean;
  transformType: "move" | "scale" | "rotate" | null;
  transformStart: { x: number; y: number } | null;
  transformPosition: string;
  originalTransforms: Array<{
    scaleX: number;
    scaleY: number;
    rotation: number;
    x: number;
    y: number;
  }>;
  accumulatedRotation: number;
  hasReachedThreshold: boolean;
}

export class SelectionTransform {
  private selectedShapes: CanvasItem[] = [];
  private boundingBox: BoundingBox | null = null;
  private handles: TransformHandle[] = [];
  private container: PIXI.Container;
  private state: TransformState = {
    isTransforming: false,
    transformType: null,
    transformStart: null,
    transformPosition: "",
    originalTransforms: [],
    accumulatedRotation: 0,
    hasReachedThreshold: false,
  };
  private readonly rotationThreshold = Math.PI * 7;

  constructor(container: PIXI.Container) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.createHandles();
  }

  // Handle Creation
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
    ] as const;

    this.handles = handleConfigs.map(({ type, position, cursor }) => {
      const graphics = this.createHandleGraphics(type, cursor);
      graphics.on("pointerdown", (event) =>
        this.onHandlePointerDown(event, type, position)
      );

      this.container.addChild(graphics);
      return { type, position, graphics };
    });
  }

  private createHandleGraphics(type: string, cursor: string): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    const handleSize = 8;

    if (type === "rotate") {
      graphics
        .circle(0, 0, handleSize / 2)
        .fill(0x00ff00)
        .stroke({ width: 2, color: 0x008800 });
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

  // Event Handlers
  private onHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    type: string,
    position: string
  ) {
    event.stopPropagation();
    if (!stage) return;

    const localPoint = event.getLocalPosition(stage);
    this.state = {
      ...this.state,
      isTransforming: true,
      transformStart: { x: localPoint.x, y: localPoint.y },
      transformPosition: position,
      transformType: type === "rotate" ? "rotate" : "scale",
      accumulatedRotation: 0,
      hasReachedThreshold: false,
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

    if (this.state.transformType === "scale") {
      this.handleScale(deltaX, deltaY);
    } else if (this.state.transformType === "rotate") {
      this.handleRotate(deltaX, deltaY);
    }
  }

  public onTransformPointerUp() {
    if (!this.state.isTransforming) return;

    this.resetState();
    this.resetRotationHandleAppearance();
    setWasTransformed(true);
    useSeatMapStore.getState().updateShapes(shapes);
  }

  public get isCurrentlyTransforming(): boolean {
    return this.state.isTransforming;
  }

  // Transform Operations
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
    shape.graphics.pivot.set(0, 0);

    if (scaleFactors) {
      shape.scaleX = original.scaleX * scaleFactors.scaleX;
      shape.scaleY = original.scaleY * scaleFactors.scaleY;
    }

    if (rotationDelta !== null) {
      shape.rotation = original.rotation + rotationDelta;
    }

    // Update graphics based on shape type
    if (shape.type === "image") {
      // Images use sprites
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.position.set(shape.x, shape.y);
      shape.graphics.rotation = shape.rotation || 0;
    } else if (shape.type === "svg") {
      // SVGs use graphics but need special handling
      const svgShape = shape as SVGShape;
      updateSVGGraphics(svgShape);
    } else {
      // Default handling for other shapes
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

    const worldCoords = this.getWorldCoordinates({
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
      const parentWorldCoords = this.getWorldCoordinates(parentContainer);
      shape.x = newWorldX - parentWorldCoords.x;
      shape.y = newWorldY - parentWorldCoords.y;
    } else {
      shape.x = newWorldX;
      shape.y = newWorldY;
    }

    this.updateShapeGraphics(shape);
  }

  private updateShapeGraphics(shape: CanvasItem) {
    shape.graphics.pivot.set(0, 0);
    shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
    shape.graphics.position.set(shape.x, shape.y);
    shape.graphics.rotation = shape.rotation || 0;
  }

  // World Transform Calculations
  private getWorldCoordinates(shape: CanvasItem): { x: number; y: number } {
    let worldX = shape.x;
    let worldY = shape.y;
    let currentContainer = findParentContainer(shape);

    while (currentContainer) {
      const { rotation = 0, scaleX = 1, scaleY = 1 } = currentContainer;

      const scaledX = worldX * scaleX;
      const scaledY = worldY * scaleY;

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;

      worldX = currentContainer.x + rotatedX;
      worldY = currentContainer.y + rotatedY;

      currentContainer = findParentContainer(currentContainer);
    }

    return { x: worldX, y: worldY };
  }

  private getWorldTransform(shape: CanvasItem): WorldTransform {
    const parentContainer = findParentContainer(shape);

    if (!parentContainer) {
      return {
        x: shape.x,
        y: shape.y,
        scaleX: shape.scaleX || 1,
        scaleY: shape.scaleY || 1,
        rotation: shape.rotation || 0,
      };
    }

    if (shape.type === "polygon") {
      const polygonBounds = this.getPolygonWorldBounds(shape as PolygonShape);
      return {
        x: polygonBounds.centerX,
        y: polygonBounds.centerY,
        scaleX: shape.scaleX || 1,
        scaleY: shape.scaleY || 1,
        rotation: shape.rotation || 0,
      };
    }

    let worldX = shape.x;
    let worldY = shape.y;
    let worldScaleX = shape.scaleX || 1;
    let worldScaleY = shape.scaleY || 1;
    let worldRotation = shape.rotation || 0;

    let currentContainer = findParentContainer(shape);
    while (currentContainer) {
      const { rotation = 0, scaleX = 1, scaleY = 1 } = currentContainer;

      worldScaleX *= scaleX;
      worldScaleY *= scaleY;
      worldRotation += rotation;

      const scaledX = worldX * scaleX;
      const scaledY = worldY * scaleY;

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;

      worldX = currentContainer.x + rotatedX;
      worldY = currentContainer.y + rotatedY;

      currentContainer = findParentContainer(currentContainer);
    }

    return {
      x: worldX,
      y: worldY,
      scaleX: worldScaleX,
      scaleY: worldScaleY,
      rotation: worldRotation,
    };
  }

  // Polygon Bounds Calculation
  private getPolygonWorldBounds(polygon: PolygonShape): BoundingBox {
    const parentContainer = findParentContainer(polygon);

    if (!parentContainer) {
      return this.calculatePolygonBounds(polygon, {
        x: polygon.x,
        y: polygon.y,
        scaleX: polygon.scaleX || 1,
        scaleY: polygon.scaleY || 1,
        rotation: polygon.rotation || 0,
      });
    }

    let currentCenterX = polygon.x;
    let currentCenterY = polygon.y;
    let accumulatedScaleX = polygon.scaleX || 1;
    let accumulatedScaleY = polygon.scaleY || 1;
    let accumulatedRotation = polygon.rotation || 0;

    let currentContainer = findParentContainer(polygon);
    while (currentContainer) {
      const { rotation = 0, scaleX = 1, scaleY = 1 } = currentContainer;

      const scaledCenterX = currentCenterX * scaleX;
      const scaledCenterY = currentCenterY * scaleY;

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedCenterX = scaledCenterX * cos - scaledCenterY * sin;
      const rotatedCenterY = scaledCenterX * sin + scaledCenterY * cos;

      currentCenterX = currentContainer.x + rotatedCenterX;
      currentCenterY = currentContainer.y + rotatedCenterY;

      accumulatedScaleX *= scaleX;
      accumulatedScaleY *= scaleY;
      accumulatedRotation += rotation;

      currentContainer = findParentContainer(currentContainer);
    }

    return this.calculatePolygonBounds(polygon, {
      x: currentCenterX,
      y: currentCenterY,
      scaleX: accumulatedScaleX,
      scaleY: accumulatedScaleY,
      rotation: accumulatedRotation,
    });
  }

  private calculatePolygonBounds(
    polygon: PolygonShape,
    transform: WorldTransform
  ): BoundingBox {
    const transformedPoints = polygon.points.map((point) => {
      const scaledX = point.x * transform.scaleX;
      const scaledY = point.y * transform.scaleY;

      const rotatedX =
        scaledX * Math.cos(transform.rotation) -
        scaledY * Math.sin(transform.rotation);
      const rotatedY =
        scaledX * Math.sin(transform.rotation) +
        scaledY * Math.cos(transform.rotation);

      return {
        x: transform.x + rotatedX,
        y: transform.y + rotatedY,
      };
    });

    const xs = transformedPoints.map((p) => p.x);
    const ys = transformedPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  // Bounding Box Calculation
  private calculateBoundingBox(shapes: CanvasItem[]): BoundingBox | null {
    if (shapes.length === 0) return null;

    if (shapes.length === 1) {
      const shape = shapes[0];
      return shape.type === "polygon"
        ? this.getPolygonWorldBounds(shape)
        : calculateItemBounds({ ...shape, ...this.getWorldTransform(shape) });
    } else {
      const bounds = shapes.map((shape) =>
        shape.type === "polygon"
          ? this.getPolygonWorldBounds(shape)
          : calculateItemBounds({ ...shape, ...this.getWorldTransform(shape) })
      );

      const minX = Math.min(...bounds.map((b) => b.x));
      const minY = Math.min(...bounds.map((b) => b.y));
      const maxX = Math.max(...bounds.map((b) => b.x + b.width));
      const maxY = Math.max(...bounds.map((b) => b.y + b.height));

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    }
  }

  // UI Updates
  private updateHandlePositions() {
    if (!this.boundingBox) return;

    const { x, y, width, height, centerX, centerY } = this.boundingBox;
    const rotateDistance = 30;
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
    };

    this.handles.forEach((handle) => {
      const pos = positions[handle.position];
      if (pos) {
        handle.graphics.x = pos.x;
        handle.graphics.y = pos.y;
        handle.graphics.scale.set(handleScale);
        handle.graphics.visible = true;
      }
    });
  }

  private drawSelectionBox() {
    if (!this.boundingBox) return;

    // Remove non-handle children
    this.container.children
      .filter((child) => !this.handles.some((h) => h.graphics === child))
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
    };
  }

  // Public API
  public updateSelection(shapes: CanvasItem[]) {
    this.selectedShapes = shapes;
    this.boundingBox = this.calculateBoundingBox(shapes);

    if (this.boundingBox && shapes.length > 0) {
      this.drawSelectionBox();
      this.updateHandlePositions();
      this.container.visible = true;
    } else {
      this.container.visible = false;
    }
  }

  public destroy() {
    this.container.destroy();
  }
}

// Module exports
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
