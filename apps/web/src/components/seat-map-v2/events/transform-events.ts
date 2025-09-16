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
  private rotationThreshold = Math.PI * 7;
  private accumulatedRotation = 0;
  private hasReachedThreshold = false;

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
      this.accumulatedRotation = 0;
      this.hasReachedThreshold = false;
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
      if (this.selectedShapes.length > 1 && this.hasReachedThreshold) {
        return;
      }
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
    this.accumulatedRotation = 0;
    this.hasReachedThreshold = false;
    setWasTransformed(true);

    this.resetRotationHandleAppearance();
    useSeatMapStore.getState().updateShapes(shapes);
  }

  public get isCurrentlyTransforming(): boolean {
    return this.isTransforming;
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

    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        if (this.selectedShapes.length === 1) {
          shape.graphics.pivot.set(0, 0);

          shape.scaleX = original.scaleX * scaleFactorX;
          shape.scaleY = original.scaleY * scaleFactorY;

          shape.graphics.scale.set(shape.scaleX, shape.scaleY);
          shape.graphics.position.set(shape.x, shape.y);
          shape.graphics.rotation = shape.rotation || 0;
        } else {
          const worldCoords = this.getWorldCoordinates({
            ...shape,
            x: original.x,
            y: original.y,
          });

          const relativeX = worldCoords.x - this.boundingBox!.centerX;
          const relativeY = worldCoords.y - this.boundingBox!.centerY;

          const scaledRelativeX = relativeX * scaleFactorX;
          const scaledRelativeY = relativeY * scaleFactorY;

          const newWorldX = this.boundingBox!.centerX + scaledRelativeX;
          const newWorldY = this.boundingBox!.centerY + scaledRelativeY;

          const parentContainer = findParentContainer(shape);
          if (parentContainer) {
            const parentWorldCoords = this.getWorldCoordinates(parentContainer);
            shape.x = newWorldX - parentWorldCoords.x;
            shape.y = newWorldY - parentWorldCoords.y;
          } else {
            shape.x = newWorldX;
            shape.y = newWorldY;
          }

          shape.scaleX = original.scaleX * scaleFactorX;
          shape.scaleY = original.scaleY * scaleFactorY;

          shape.graphics.pivot.set(0, 0);

          shape.graphics.scale.set(shape.scaleX, shape.scaleY);
          shape.graphics.position.set(shape.x, shape.y);
          shape.graphics.rotation = shape.rotation || 0;
        }
      }
    });

    this.updateSelection(this.selectedShapes);
  }

  private handleRotate(deltaX: number, deltaY: number) {
    if (!this.boundingBox) return;

    const rotationDelta = (deltaX + deltaY) * 0.01;

    if (this.selectedShapes.length > 1) {
      // Add the signed rotation delta (positive for right, negative for left)
      this.accumulatedRotation += rotationDelta;

      // Check if absolute value exceeds threshold
      if (Math.abs(this.accumulatedRotation) >= this.rotationThreshold) {
        this.hasReachedThreshold = true;
        this.showThresholdReachedFeedback();
        return;
      }
    }

    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        if (this.selectedShapes.length === 1) {
          shape.graphics.pivot.set(0, 0);

          shape.rotation = original.rotation + rotationDelta;

          shape.graphics.rotation = shape.rotation;
          shape.graphics.position.set(shape.x, shape.y);
          shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
        } else {
          const worldCoords = this.getWorldCoordinates({
            ...shape,
            x: original.x,
            y: original.y,
          });

          const relativeX = worldCoords.x - this.boundingBox!.centerX;
          const relativeY = worldCoords.y - this.boundingBox!.centerY;

          const cos = Math.cos(rotationDelta);
          const sin = Math.sin(rotationDelta);
          const rotatedRelativeX = relativeX * cos - relativeY * sin;
          const rotatedRelativeY = relativeX * sin + relativeY * cos;

          const newWorldX = this.boundingBox!.centerX + rotatedRelativeX;
          const newWorldY = this.boundingBox!.centerY + rotatedRelativeY;

          const parentContainer = findParentContainer(shape);
          if (parentContainer) {
            const parentWorldCoords = this.getWorldCoordinates(parentContainer);
            shape.x = newWorldX - parentWorldCoords.x;
            shape.y = newWorldY - parentWorldCoords.y;
          } else {
            shape.x = newWorldX;
            shape.y = newWorldY;
          }

          shape.rotation = original.rotation + rotationDelta;

          shape.graphics.pivot.set(0, 0);

          shape.graphics.rotation = shape.rotation;
          shape.graphics.position.set(shape.x, shape.y);
          shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
        }
      }
    });

    this.updateSelection(this.selectedShapes);
  }

  private showThresholdReachedFeedback() {
    const rotateHandle = this.handles.find((h) => h.position === "rotate");
    if (rotateHandle) {
      rotateHandle.graphics.clear();
      const handleSize = 8;
      rotateHandle.graphics
        .circle(0, 0, handleSize / 2)
        .fill(0xff6b6b)
        .stroke({ width: 2, color: 0xcc0000 });
    }
  }

  private calculateBoundingBox(shapes: CanvasItem[]) {
    if (shapes.length === 0) return null;

    const worldShapes = shapes.map((shape) => {
      const worldTransform = this.getWorldTransform(shape);
      return {
        ...shape,
        x: worldTransform.x,
        y: worldTransform.y,
        scaleX: worldTransform.scaleX,
        scaleY: worldTransform.scaleY,
        rotation: worldTransform.rotation,
      };
    });

    return calculateGroupBounds(worldShapes);
  }
  private resetRotationHandleAppearance() {
    const rotateHandle = this.handles.find((h) => h.position === "rotate");
    if (rotateHandle) {
      rotateHandle.graphics.clear();
      rotateHandle.graphics
        .circle(0, 0, 4)
        .fill(0x00ff00)
        .stroke({ width: 2, color: 0x008800 });
    }
  }

  private getWorldCoordinates(shape: CanvasItem): { x: number; y: number } {
    const parentContainer = findParentContainer(shape);

    if (!parentContainer) {
      return { x: shape.x, y: shape.y };
    }

    // Start with shape's local position
    let worldX = shape.x;
    let worldY = shape.y;

    // Apply all parent container transforms
    let currentContainer: ContainerGroup | null = parentContainer;
    while (currentContainer) {
      // Apply container's scale and rotation
      const containerRotation = currentContainer.rotation || 0;
      const containerScaleX = currentContainer.scaleX || 1;
      const containerScaleY = currentContainer.scaleY || 1;

      // Apply scaling first
      const scaledX = worldX * containerScaleX;
      const scaledY = worldY * containerScaleY;

      // Apply rotation around container center
      const cos = Math.cos(containerRotation);
      const sin = Math.sin(containerRotation);
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;

      // Add container's position
      worldX = currentContainer.x + rotatedX;
      worldY = currentContainer.y + rotatedY;

      // Move up to next parent container
      currentContainer = findParentContainer(currentContainer);
    }

    return { x: worldX, y: worldY };
  }

  // Add a new method to get world transforms (including scale and rotation)
  private getWorldTransform(shape: CanvasItem): {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  } {
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

    // Start with shape's properties
    let worldX = shape.x;
    let worldY = shape.y;
    let worldScaleX = shape.scaleX || 1;
    let worldScaleY = shape.scaleY || 1;
    let worldRotation = shape.rotation || 0;

    // Apply all parent container transforms
    let currentContainer: ContainerGroup | null = parentContainer;
    while (currentContainer) {
      const containerRotation = currentContainer.rotation || 0;
      const containerScaleX = currentContainer.scaleX || 1;
      const containerScaleY = currentContainer.scaleY || 1;

      // Accumulate transforms
      worldScaleX *= containerScaleX;
      worldScaleY *= containerScaleY;
      worldRotation += containerRotation;

      // Apply scaling to position
      const scaledX = worldX * containerScaleX;
      const scaledY = worldY * containerScaleY;

      // Apply rotation to position
      const cos = Math.cos(containerRotation);
      const sin = Math.sin(containerRotation);
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;

      // Add container's position
      worldX = currentContainer.x + rotatedX;
      worldY = currentContainer.y + rotatedY;

      // Move up to next parent container
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
    console.log("Updating selection with shapes:", shapes);
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
