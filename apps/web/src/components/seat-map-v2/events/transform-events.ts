import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup } from "../types";
import { stage, zoom, pixiApp, shapes, setWasTransformed } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";
import { calculateGroupBounds } from "../utils/bounds";
import { findParentContainer } from "../shapes";

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

export class SelectionTransform {
  private selectedShapes: CanvasItem[] = [];
  private boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null = null;
  private handles: TransformHandle[] = [];
  private container: PIXI.Container;
  private isTransforming = false;
  private transformType: "move" | "scale" | "rotate" | null = null;
  private transformStart: { x: number; y: number } | null = null;
  private transformPosition: string = "";
  private originalTransforms: Array<{
    scaleX: number;
    scaleY: number;
    rotation: number;
    x: number;
    y: number;
  }> = [];

  constructor(container: PIXI.Container) {
    this.container = new PIXI.Container();
    container.addChild(this.container);
    this.createHandles();
  }

  private createHandles() {
    const handleSize = 8;
    const handlePositions = [
      {
        type: "corner" as const,
        position: "top-left" as const,
        cursor: "nw-resize",
      },
      {
        type: "corner" as const,
        position: "top-right" as const,
        cursor: "ne-resize",
      },
      {
        type: "corner" as const,
        position: "bottom-left" as const,
        cursor: "sw-resize",
      },
      {
        type: "corner" as const,
        position: "bottom-right" as const,
        cursor: "se-resize",
      },
      { type: "edge" as const, position: "top" as const, cursor: "n-resize" },
      {
        type: "edge" as const,
        position: "bottom" as const,
        cursor: "s-resize",
      },
      { type: "edge" as const, position: "left" as const, cursor: "w-resize" },
      { type: "edge" as const, position: "right" as const, cursor: "e-resize" },
      { type: "rotate" as const, position: "rotate" as const, cursor: "grab" },
    ];

    handlePositions.forEach(({ type, position, cursor }) => {
      const graphics = new PIXI.Graphics();

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

      graphics.on("pointerdown", (event) =>
        this.onHandlePointerDown(event, type, position)
      );

      const handle: TransformHandle = {
        type,
        position,
        graphics,
      };

      this.handles.push(handle);
      this.container.addChild(graphics);
    });
  }

  private onHandlePointerDown(
    event: PIXI.FederatedPointerEvent,
    type: string,
    position: string
  ) {
    event.stopPropagation();

    if (!stage) return;

    const localPoint = event.getLocalPosition(stage);

    this.isTransforming = true;
    this.transformStart = { x: localPoint.x, y: localPoint.y };
    this.transformPosition = position;

    if (type === "rotate") {
      this.transformType = "rotate";
    } else {
      this.transformType = "scale";
    }

    this.originalTransforms = this.selectedShapes.map((shape) => ({
      scaleX: shape.scaleX || 1,
      scaleY: shape.scaleY || 1,
      rotation: shape.rotation || 0,
      x: shape.x,
      y: shape.y,
    }));
  }

  public onTransformPointerMove(event: PIXI.FederatedPointerEvent) {
    if (!this.isTransforming || !this.transformStart || !stage) return;

    const stageMovePoint = event.getLocalPosition(stage);
    const deltaX = stageMovePoint.x - this.transformStart.x;
    const deltaY = stageMovePoint.y - this.transformStart.y;

    if (this.transformType === "scale") {
      this.handleScale(deltaX, deltaY, this.transformPosition);
    } else if (this.transformType === "rotate") {
      this.handleRotate(deltaX, deltaY);
    }
  }

  public onTransformPointerUp() {
    if (!this.isTransforming) return;

    this.isTransforming = false;
    this.transformType = null;
    this.transformStart = null;
    this.transformPosition = "";
    this.originalTransforms = [];
    setWasTransformed(true);
    useSeatMapStore.getState().updateShapes(shapes);
  }

  public get isCurrentlyTransforming(): boolean {
    return this.isTransforming;
  }

  private applyTransformsToShape(shape: CanvasItem) {
    if (shape.graphics) {
      const isNestedShape = this.isShapeNested(shape);

      if (isNestedShape) {
        const parentContainer = findParentContainer(shape);
        if (parentContainer) {
          const relativeX = shape.x - parentContainer.x;
          const relativeY = shape.y - parentContainer.y;
          shape.graphics.position.set(relativeX, relativeY);
        } else {
          shape.graphics.position.set(shape.x, shape.y);
        }
      } else {
        shape.graphics.position.set(shape.x, shape.y);
      }

      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.rotation = shape.rotation || 0;
    }
  }

  private isShapeNested(shape: CanvasItem): boolean {
    return findParentContainer(shape) !== null;
  }

  private handleScale(deltaX: number, deltaY: number, position: string) {
    if (!this.boundingBox) return;

    let scaleFactorX = 1;
    let scaleFactorY = 1;

    const sensitivity = 0.01;

    switch (position) {
      case "top-left":
        scaleFactorX = 1 - deltaX * sensitivity;
        scaleFactorY = 1 - deltaY * sensitivity;
        break;
      case "top-right":
        scaleFactorX = 1 + deltaX * sensitivity;
        scaleFactorY = 1 - deltaY * sensitivity;
        break;
      case "bottom-left":
        scaleFactorX = 1 - deltaX * sensitivity;
        scaleFactorY = 1 + deltaY * sensitivity;
        break;
      case "bottom-right":
        scaleFactorX = 1 + deltaX * sensitivity;
        scaleFactorY = 1 + deltaY * sensitivity;
        break;
      case "top":
      case "bottom":
        scaleFactorY =
          1 + (position === "bottom" ? deltaY : -deltaY) * sensitivity;
        break;
      case "left":
      case "right":
        scaleFactorX =
          1 + (position === "right" ? deltaX : -deltaX) * sensitivity;
        break;
    }

    scaleFactorX = Math.max(0.1, Math.min(3, scaleFactorX));
    scaleFactorY = Math.max(0.1, Math.min(3, scaleFactorY));

    let anchorX = 0.5;
    let anchorY = 0.5;

    switch (position) {
      case "top-left":
        anchorX = 1;
        anchorY = 1;
        break;
      case "top-right":
        anchorX = -1;
        anchorY = 1;
        break;
      case "bottom-left":
        anchorX = 1;
        anchorY = -1;
        break;
      case "bottom-right":
        anchorX = -1;
        anchorY = -1;
        break;
      case "top":
        anchorY = 1;
        break;
      case "bottom":
        anchorY = -1;
        break;
      case "left":
        anchorX = 1;
        break;
      case "right":
        anchorX = -1;
        break;
    }

    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        shape.scaleX = original.scaleX * scaleFactorX;
        shape.scaleY = original.scaleY * scaleFactorY;

        let shapeWidth = 0;
        let shapeHeight = 0;

        if (shape.type === "rectangle" && shape.width && shape.height) {
          shapeWidth = shape.width;
          shapeHeight = shape.height;
        } else if (shape.type === "ellipse" && shape.radiusX && shape.radiusY) {
          shapeWidth = shape.radiusX * 2;
          shapeHeight = shape.radiusY * 2;
        } else if (
          shape.type === "text" &&
          shape.graphics instanceof PIXI.Text
        ) {
          const bounds = shape.graphics.getBounds();
          shapeWidth = bounds.width;
          shapeHeight = bounds.height;
        }

        const scaleChangeX = (scaleFactorX - 1) * shapeWidth;
        const scaleChangeY = (scaleFactorY - 1) * shapeHeight;

        const offsetX = -scaleChangeX * anchorX;
        const offsetY = -scaleChangeY * anchorY;

        shape.x = original.x + offsetX / 2;
        shape.y = original.y + offsetY / 2;

        this.applyTransformsToShape(shape);
      }
    });

    this.updateSelection(this.selectedShapes);
  }

  private handleRotate(deltaX: number, deltaY: number) {
    if (!this.boundingBox) return;

    const rotationDelta = (deltaX + deltaY) * 0.01;

    // Get the center point of the bounding box in world coordinates
    const worldCenterX = this.boundingBox.centerX;
    const worldCenterY = this.boundingBox.centerY;

    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        // Get the shape's world coordinates for rotation calculation
        const worldCoords = this.getWorldCoordinates(shape);

        // Calculate relative position to rotation center
        const relativeX = worldCoords.x - worldCenterX;
        const relativeY = worldCoords.y - worldCenterY;

        // Apply rotation
        const cos = Math.cos(rotationDelta);
        const sin = Math.sin(rotationDelta);

        const rotatedX = relativeX * cos - relativeY * sin;
        const rotatedY = relativeX * sin + relativeY * cos;

        // Calculate new world position
        const newWorldX = worldCenterX + rotatedX;
        const newWorldY = worldCenterY + rotatedY;

        // Convert back to the shape's coordinate space
        const parentContainer = findParentContainer(shape);
        if (parentContainer) {
          // Shape is in a container - convert world coords to container-relative coords
          const parentWorldCoords = this.getWorldCoordinates(parentContainer);
          shape.x = newWorldX - parentWorldCoords.x;
          shape.y = newWorldY - parentWorldCoords.y;
        } else {
          // Shape is at root level - use world coords directly
          shape.x = newWorldX;
          shape.y = newWorldY;
        }

        // Update rotation
        shape.rotation = original.rotation + rotationDelta;

        this.applyTransformsToShape(shape);
      }
    });

    this.updateSelection(this.selectedShapes);
  }

  private calculateBoundingBox(shapes: CanvasItem[]) {
    if (shapes.length === 0) return null;
    const worldShapes = shapes.map((shape) => {
      const worldCoords = this.getWorldCoordinates(shape);
      return {
        ...shape,
        x: worldCoords.x,
        y: worldCoords.y,
      };
    });
    return calculateGroupBounds(worldShapes);
  }

  private getWorldCoordinates(shape: CanvasItem): { x: number; y: number } {
    const parentContainer = findParentContainer(shape);

    if (!parentContainer) {
      return { x: shape.x, y: shape.y };
    }

    let worldX = shape.x;
    let worldY = shape.y;

    let currentContainer: ContainerGroup | null = parentContainer;
    while (currentContainer) {
      worldX += currentContainer.x;
      worldY += currentContainer.y;

      currentContainer = findParentContainer(currentContainer);
    }

    return { x: worldX, y: worldY };
  }

  private updateHandlePositions() {
    if (!this.boundingBox) return;

    const { x, y, width, height, centerX, centerY } = this.boundingBox;
    const rotateDistance = 30;
    const handleScale = 1 / zoom;

    this.handles.forEach((handle) => {
      let posX = 0,
        posY = 0;

      switch (handle.position) {
        case "top-left":
          posX = x;
          posY = y;
          break;
        case "top-right":
          posX = x + width;
          posY = y;
          break;
        case "bottom-left":
          posX = x;
          posY = y + height;
          break;
        case "bottom-right":
          posX = x + width;
          posY = y + height;
          break;
        case "top":
          posX = centerX;
          posY = y;
          break;
        case "bottom":
          posX = centerX;
          posY = y + height;
          break;
        case "left":
          posX = x;
          posY = centerY;
          break;
        case "right":
          posX = x + width;
          posY = centerY;
          break;
        case "rotate":
          posX = centerX;
          posY = y - rotateDistance;
          break;
      }

      handle.graphics.x = posX;
      handle.graphics.y = posY;
      handle.graphics.scale.set(handleScale);
      handle.graphics.visible = true;
    });
  }

  private drawSelectionBox() {
    if (!this.boundingBox) return;

    this.container.children.forEach((child) => {
      if (child !== this.handles.find((h) => h.graphics === child)?.graphics) {
        this.container.removeChild(child);
      }
    });

    const selectionBox = new PIXI.Graphics();
    const { x, y, width, height } = this.boundingBox;
    const strokeWidth = 2 / zoom;

    selectionBox.rect(x, y, width, height).stroke({
      width: strokeWidth,
      color: 0x0099ff,
      alpha: 0.8,
      join: "dashed" as any,
    });

    selectionBox.eventMode = "static";
    this.container.addChildAt(selectionBox, 0);
  }

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

export const getSelectionTransform = (): SelectionTransform | null => {
  return selectionTransform;
};

export const destroySelectionTransform = () => {
  if (selectionTransform) {
    selectionTransform.destroy();
    selectionTransform = null;
  }
};
