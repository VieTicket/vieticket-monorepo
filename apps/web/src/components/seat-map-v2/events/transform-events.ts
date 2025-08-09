import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { stage, zoom, pixiApp } from "../variables";
import { updateShapeSelectionRectangle } from "../shapes/index";

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
  private selectedShapes: PixiShape[] = [];
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
  private isDragging = false;
  private dragType: "move" | "scale" | "rotate" | null = null;
  private dragStart: { x: number; y: number } | null = null;
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

    this.isDragging = true;
    this.dragStart = { x: localPoint.x, y: localPoint.y };

    if (type === "rotate") {
      this.dragType = "rotate";
    } else {
      this.dragType = "scale";
    }

    // Store original transforms
    this.originalTransforms = this.selectedShapes.map((shape) => ({
      scaleX: shape.scaleX || 1,
      scaleY: shape.scaleY || 1,
      rotation: shape.rotation || 0,
      x: shape.x,
      y: shape.y,
    }));

    // Add stage event listeners instead of document
    const onStagePointerMove = (moveEvent: PIXI.FederatedPointerEvent) => {
      if (!this.isDragging || !this.dragStart || !stage) return;

      const stageMovePoint = moveEvent.getLocalPosition(stage);
      const deltaX = stageMovePoint.x - this.dragStart.x;
      const deltaY = stageMovePoint.y - this.dragStart.y;

      if (this.dragType === "scale") {
        this.handleScale(deltaX, deltaY, position);
      } else if (this.dragType === "rotate") {
        this.handleRotate(deltaX, deltaY);
      }
    };

    const onStagePointerUp = () => {
      if (!this.isDragging) return;

      this.isDragging = false;
      this.dragType = null;
      this.dragStart = null;
      this.originalTransforms = [];

      // Remove stage event listeners
      stage?.off("pointermove", onStagePointerMove);
      stage?.off("pointerup", onStagePointerUp);
      stage?.off("pointerupoutside", onStagePointerUp);
    };

    // Add event listeners to stage
    stage.on("pointermove", onStagePointerMove);
    stage.on("pointerup", onStagePointerUp);
    stage.on("pointerupoutside", onStagePointerUp); // Handle mouse leaving canvas
  }

  private applyTransformsToShape(shape: PixiShape) {
    // Apply transforms to the actual PIXI graphics object
    if (shape.graphics) {
      shape.graphics.scale.set(shape.scaleX || 1, shape.scaleY || 1);
      shape.graphics.rotation = shape.rotation || 0;
      shape.graphics.position.set(shape.x, shape.y);
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

    // Apply scaling to selected shapes
    this.selectedShapes.forEach((shape, index) => {
      const original = this.originalTransforms[index];
      if (original) {
        shape.scaleX = original.scaleX * scaleFactorX;
        shape.scaleY = original.scaleY * scaleFactorY;

        // Apply transforms to PIXI graphics
        this.applyTransformsToShape(shape);

        // Update visual appearance
        updateShapeSelectionRectangle(shape);
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

        // Update visual appearance
        updateShapeSelectionRectangle(shape);
      }
    });

    // Update selection rectangle
    this.updateSelection(this.selectedShapes);
  }

  private calculateBoundingBox(shapes: PixiShape[]) {
    if (shapes.length === 0) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    shapes.forEach((shape) => {
      let shapeMinX, shapeMinY, shapeMaxX, shapeMaxY;

      if (shape.type === "rectangle" && shape.width && shape.height) {
        shapeMinX = shape.x - shape.width / 2;
        shapeMinY = shape.y - shape.height / 2;
        shapeMaxX = shape.x + shape.width / 2;
        shapeMaxY = shape.y + shape.height / 2;
      } else if (shape.type === "ellipse" && shape.radiusX && shape.radiusY) {
        shapeMinX = shape.x - shape.radiusX;
        shapeMinY = shape.y - shape.radiusY;
        shapeMaxX = shape.x + shape.radiusX;
        shapeMaxY = shape.y + shape.radiusY;
      } else if (shape.type === "polygon" && shape.points) {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        shapeMinX = Math.min(...xs);
        shapeMinY = Math.min(...ys);
        shapeMaxX = Math.max(...xs);
        shapeMaxY = Math.max(...ys);
      } else {
        shapeMinX = shape.x - 20;
        shapeMinY = shape.y - 10;
        shapeMaxX = shape.x + 20;
        shapeMaxY = shape.y + 10;
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

  public updateSelection(shapes: PixiShape[]) {
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
