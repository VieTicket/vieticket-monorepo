import * as PIXI from "pixi.js";
import { CanvasItem } from "../types";
import { stage, zoom, pixiApp, shapes } from "../variables";
import { useSeatMapStore } from "../store/seat-map-store";

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
        // Circular handle for rotation
        graphics
          .circle(0, 0, handleSize / 2)
          .fill(0x00ff00)
          .stroke({ width: 2, color: 0x008800 });
      } else {
        // Square handles for scaling
        graphics
          .rect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
          .fill(0x0099ff)
          .stroke({ width: 2, color: 0x0066cc });
      }

      graphics.eventMode = "static";
      graphics.cursor = cursor;
      graphics.visible = false;

      // Add event listeners
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

    // Store original transforms
    this.originalTransforms = this.selectedShapes.map((shape) => ({
      scaleX: shape.scaleX || 1,
      scaleY: shape.scaleY || 1,
      rotation: shape.rotation || 0,
      x: shape.x,
      y: shape.y,
    }));
  }

  // Make these methods public
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
    useSeatMapStore.getState().updateShapes(shapes);
  }

  // Getter to check if currently dragging
  public get isCurrentlyTransforming(): boolean {
    return this.isTransforming;
  }

  private applyTransformsToShape(shape: CanvasItem) {
    // Apply transforms to the actual PIXI graphics object
    if (shape.graphics) {
      // Set position first
      shape.graphics.position.set(shape.x, shape.y);

      // Then apply scale and rotation
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.rotation = shape.rotation || 0;
    }
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

    // Clamp scale factors
    scaleFactorX = Math.max(0.1, Math.min(3, scaleFactorX));
    scaleFactorY = Math.max(0.1, Math.min(3, scaleFactorY));

    // Calculate anchor point based on handle position
    let anchorX = 0.5; // Default center
    let anchorY = 0.5; // Default center

    switch (position) {
      case "top-left":
        anchorX = 1; // Right edge stays fixed
        anchorY = 1; // Bottom edge stays fixed
        break;
      case "top-right":
        anchorX = -1; // Left edge stays fixed
        anchorY = 1; // Bottom edge stays fixed
        break;
      case "bottom-left":
        anchorX = 1; // Right edge stays fixed
        anchorY = -1; // Top edge stays fixed
        break;
      case "bottom-right":
        anchorX = -1; // Left edge stays fixed
        anchorY = -1; // Top edge stays fixed
        break;
      case "top":
        anchorY = 1; // Bottom edge stays fixed
        break;
      case "bottom":
        anchorY = -1; // Top edge stays fixed
        break;
      case "left":
        anchorX = 1; // Right edge stays fixed
        break;
      case "right":
        anchorX = -1; // Left edge stays fixed
        break;
    }

    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        // Update scale properties
        shape.scaleX = original.scaleX * scaleFactorX;
        shape.scaleY = original.scaleY * scaleFactorY;

        // Calculate the shape's dimensions for anchor-based positioning
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

        // Calculate position offset based on anchor and scaling
        const scaleChangeX = (scaleFactorX - 1) * shapeWidth;
        const scaleChangeY = (scaleFactorY - 1) * shapeHeight;

        // Apply anchor-based position adjustment
        const offsetX = -scaleChangeX * anchorX;
        const offsetY = -scaleChangeY * anchorY;

        shape.x = original.x + offsetX / 2;
        shape.y = original.y + offsetY / 2;

        // Apply transforms to PIXI graphics
        this.applyTransformsToShape(shape);
      }
    });

    // Update selection rectangle
    this.updateSelection(this.selectedShapes);
  }

  private handleRotate(deltaX: number, deltaY: number) {
    if (!this.boundingBox) return;

    const rotationDelta = (deltaX + deltaY) * 0.01; // Rotation sensitivity

    // Apply rotation to selected shapes
    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        shape.rotation = original.rotation + rotationDelta;
      }
      this.applyTransformsToShape(shape);
    });

    // Update selection rectangle
    this.updateSelection(this.selectedShapes);
  }

  private calculateBoundingBox(shapes: CanvasItem[]) {
    if (shapes.length === 0) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    shapes.forEach((shape) => {
      let shapeMinX, shapeMinY, shapeMaxX, shapeMaxY;

      // Get the actual scale factors applied to the shape
      const scaleX = shape.scaleX || 1;
      const scaleY = shape.scaleY || 1;
      const rotation = shape.rotation || 0;

      if (shape.type === "rectangle" && shape.width && shape.height) {
        // Apply scaling to the dimensions
        const scaledWidth = shape.width * scaleX;
        const scaledHeight = shape.height * scaleY;

        // Calculate rotated bounding box
        const corners = [
          { x: -scaledWidth / 2, y: -scaledHeight / 2 },
          { x: scaledWidth / 2, y: -scaledHeight / 2 },
          { x: scaledWidth / 2, y: scaledHeight / 2 },
          { x: -scaledWidth / 2, y: scaledHeight / 2 },
        ];

        const rotatedCorners = corners.map((corner) => ({
          x:
            shape.x +
            corner.x * Math.cos(rotation) -
            corner.y * Math.sin(rotation),
          y:
            shape.y +
            corner.x * Math.sin(rotation) +
            corner.y * Math.cos(rotation),
        }));

        const xs = rotatedCorners.map((p) => p.x);
        const ys = rotatedCorners.map((p) => p.y);
        shapeMinX = Math.min(...xs);
        shapeMinY = Math.min(...ys);
        shapeMaxX = Math.max(...xs);
        shapeMaxY = Math.max(...ys);
      } else if (shape.type === "ellipse" && shape.radiusX && shape.radiusY) {
        // For ellipse, calculate rotated bounding box
        const scaledRadiusX = shape.radiusX * scaleX;
        const scaledRadiusY = shape.radiusY * scaleY;

        // Calculate the bounding box of a rotated ellipse
        const a = scaledRadiusX;
        const b = scaledRadiusY;
        const cos = Math.abs(Math.cos(rotation));
        const sin = Math.abs(Math.sin(rotation));

        const boundingWidth = a * cos + b * sin;
        const boundingHeight = a * sin + b * cos;

        shapeMinX = shape.x - boundingWidth;
        shapeMinY = shape.y - boundingHeight;
        shapeMaxX = shape.x + boundingWidth;
        shapeMaxY = shape.y + boundingHeight;
      } else if (shape.type === "polygon" && shape.points) {
        // For polygons, apply scaling and rotation to each point
        const centerX = shape.x;
        const centerY = shape.y;

        const transformedPoints = shape.points.map((point) => {
          // First apply scaling
          const scaledX = (point.x - centerX) * scaleX;
          const scaledY = (point.y - centerY) * scaleY;

          // Then apply rotation
          return {
            x:
              centerX +
              scaledX * Math.cos(rotation) -
              scaledY * Math.sin(rotation),
            y:
              centerY +
              scaledX * Math.sin(rotation) +
              scaledY * Math.cos(rotation),
          };
        });

        const xs = transformedPoints.map((p) => p.x);
        const ys = transformedPoints.map((p) => p.y);
        shapeMinX = Math.min(...xs);
        shapeMinY = Math.min(...ys);
        shapeMaxX = Math.max(...xs);
        shapeMaxY = Math.max(...ys);
      } else if (shape.type === "text" && shape.graphics instanceof PIXI.Text) {
        // For text, use the actual bounds which include scaling and rotation
        const bounds = shape.graphics.getBounds();
        shapeMinX = bounds.x;
        shapeMinY = bounds.y;
        shapeMaxX = bounds.x + bounds.width;
        shapeMaxY = bounds.y + bounds.height;
      } else {
        // Fallback with scaling and rotation applied
        const scaledWidth = 40 * scaleX;
        const scaledHeight = 20 * scaleY;

        const corners = [
          { x: -scaledWidth / 2, y: -scaledHeight / 2 },
          { x: scaledWidth / 2, y: -scaledHeight / 2 },
          { x: scaledWidth / 2, y: scaledHeight / 2 },
          { x: -scaledWidth / 2, y: scaledHeight / 2 },
        ];

        const rotatedCorners = corners.map((corner) => ({
          x:
            shape.x +
            corner.x * Math.cos(rotation) -
            corner.y * Math.sin(rotation),
          y:
            shape.y +
            corner.x * Math.sin(rotation) +
            corner.y * Math.cos(rotation),
        }));

        const xs = rotatedCorners.map((p) => p.x);
        const ys = rotatedCorners.map((p) => p.y);
        shapeMinX = Math.min(...xs);
        shapeMinY = Math.min(...ys);
        shapeMaxX = Math.max(...xs);
        shapeMaxY = Math.max(...ys);
      }

      minX = Math.min(minX, shapeMinX);
      minY = Math.min(minY, shapeMinY);
      maxX = Math.max(maxX, shapeMaxX);
      maxY = Math.max(maxY, shapeMaxY);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  private updateHandlePositions() {
    if (!this.boundingBox) return;

    const { x, y, width, height, centerX, centerY } = this.boundingBox;
    const rotateDistance = 30;
    const handleScale = 1 / zoom; // Scale handles based on zoom level

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

    // Remove existing selection box
    this.container.children.forEach((child) => {
      if (child !== this.handles.find((h) => h.graphics === child)?.graphics) {
        this.container.removeChild(child);
      }
    });

    // Create new selection box
    const selectionBox = new PIXI.Graphics();
    const { x, y, width, height } = this.boundingBox;
    const strokeWidth = 2 / zoom; // Scale stroke width based on zoom

    selectionBox.rect(x, y, width, height).stroke({
      width: strokeWidth,
      color: 0x0099ff,
      alpha: 0.8,
      join: "dashed" as any,
    });

    selectionBox.eventMode = "static";
    this.container.addChildAt(selectionBox, 0); // Add behind handles
  }

  public updateSelection(shapes: CanvasItem[]) {
    this.selectedShapes = shapes;
    this.boundingBox = this.calculateBoundingBox(shapes);

    // FIX: Clear original transforms when selection changes
    // this.originalTransforms = [];

    // // Also reset any ongoing transform state to prevent coordinate bleed
    // this.isTransforming = false;
    // this.transformType = null;
    // this.transformStart = null;
    // this.transformPosition = "";

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

// Global selection transform instance
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
