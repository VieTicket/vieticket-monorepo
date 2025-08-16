import * as PIXI from "pixi.js";
import { CanvasItem } from "../types";
import { currentTool, stage, shapes, pixiApp } from "../variables";
import { getSelectionTransform } from "./transform-events";

// Import existing event handlers
import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onDrawStart, onDrawMove, onDrawEnd } from "./draw-events";
import { onPolygonStart, onPolygonMove } from "./polygon-events";
import { onStageClick, handleShapeSelection } from "./select-events";
import { onStageWheel } from "./zoom-events";
import {
  startShapeDrag,
  handleShapeDrag,
  endShapeDrag,
  isCurrentlyShapeDragging,
} from "./drag-events";

export class EventManager {
  private shapeEventHandlers = new Map<string, any>();
  private shapePointerDownTarget: CanvasItem | null = null;

  constructor() {
    this.setupStageEvents();
  }

  private setupStageEvents() {
    if (!stage) return;

    stage.removeAllListeners();

    stage.eventMode = "static";
    stage.interactive = true;
    stage.interactiveChildren = true;
    stage.hitArea = pixiApp!.screen;

    stage.on("pointerdown", this.onStagePointerDown.bind(this));
    stage.on("pointermove", this.onStagePointerMove.bind(this));
    stage.on("pointerup", this.onStagePointerUp.bind(this));
    stage.on("pointerupoutside", this.onStagePointerUp.bind(this));
    stage.on("wheel", onStageWheel);
  }

  addShapeEvents(shape: CanvasItem) {
    const handlers = {
      pointerdown: (event: PIXI.FederatedPointerEvent) => {
        this.onShapePointerDown(event, shape);
      },
      pointerup: (event: PIXI.FederatedPointerEvent) => {
        this.onShapePointerUp(event, shape);
      },
      pointerover: (event: PIXI.FederatedPointerEvent) => {
        this.onShapeHover(event, shape);
      },
      pointerout: (event: PIXI.FederatedPointerEvent) => {
        this.onShapeOut(event, shape);
      },
    };

    // Add event listeners
    Object.entries(handlers).forEach(([eventName, handler]) => {
      shape.graphics.on(eventName as any, handler);
    });

    // Store handlers for cleanup
    this.shapeEventHandlers.set(shape.id, handlers);
  }

  removeShapeEvents(shape: CanvasItem) {
    const handlers = this.shapeEventHandlers.get(shape.id);
    if (handlers) {
      Object.entries(handlers).forEach(([eventName, handler]) => {
        shape.graphics.off(
          eventName as any,
          handler as ((...args: any) => void) | undefined
        );
      });
      this.shapeEventHandlers.delete(shape.id);
    }
  }

  private onStagePointerDown(event: PIXI.FederatedPointerEvent) {
    // Handle tool-specific stage events
    switch (currentTool) {
      case "pan":
        onPanStart(event);
        break;
      case "rectangle":
      case "ellipse":
      case "text":
        onDrawStart(event);
        break;
      case "polygon":
        onPolygonStart(event);
        break;
      case "select":
        onStageClick(event);
        break;
    }
  }

  private onStagePointerMove(event: PIXI.FederatedPointerEvent) {
    switch (currentTool) {
      case "select":
        const selectionTransform = getSelectionTransform();

        if (selectionTransform?.isCurrentlyTransforming) {
          selectionTransform.onTransformPointerMove(event);
        } else if (isCurrentlyShapeDragging()) {
          handleShapeDrag(event);
        }
        break;
      case "pan":
        onPanMove(event);
        break;
      case "rectangle":
      case "ellipse":
        onDrawMove(event);
        break;
      case "polygon":
        onPolygonMove(event);
        break;
    }
  }

  private onStagePointerUp(event: PIXI.FederatedPointerEvent) {
    switch (currentTool) {
      case "select":
        const selectionTransform = getSelectionTransform();

        if (selectionTransform?.isCurrentlyTransforming) {
          selectionTransform.onTransformPointerUp();
        }

        break;
      case "pan":
        onPanEnd();
        break;
      case "rectangle":
      case "ellipse":
        onDrawEnd(event);
        break;
    }
  }

  private onShapePointerDown(
    event: PIXI.FederatedPointerEvent,
    shape: CanvasItem
  ) {
    event.stopPropagation();

    switch (currentTool) {
      case "select":
        this.shapePointerDownTarget = shape;
        startShapeDrag(event, shape);
        break;
      // Other tools don't need shape-specific handling as they use stage events
    }
  }

  private onShapePointerUp(
    event: PIXI.FederatedPointerEvent,
    shape: CanvasItem
  ) {
    event.stopPropagation();
    switch (currentTool) {
      case "select":
        const selectionTransform = getSelectionTransform();

        if (selectionTransform?.isCurrentlyTransforming) {
          selectionTransform.onTransformPointerUp();
        }
        if (
          this.shapePointerDownTarget?.id === shape.id &&
          !isCurrentlyShapeDragging()
        ) {
          handleShapeSelection(event, shape);
        }

        if (isCurrentlyShapeDragging()) {
          endShapeDrag();
        }
        break;
    }
  }

  private onShapeHover(event: PIXI.FederatedPointerEvent, shape: CanvasItem) {
    // Handle hover effects
    if (currentTool === "select") {
      shape.graphics.cursor = "move";

      // Optional: Add hover highlight
      if (shape.graphics instanceof PIXI.Graphics) {
        shape.graphics.alpha = 0.8;
      }
    } else {
      // For other tools, show the tool cursor
      shape.graphics.cursor = this.getToolCursor();
    }
  }

  private onShapeOut(event: PIXI.FederatedPointerEvent, shape: CanvasItem) {
    // Reset hover effects
    shape.graphics.cursor = "pointer";

    // Reset hover highlight
    if (shape.graphics instanceof PIXI.Graphics) {
      shape.graphics.alpha = 1;
    }
  }

  private getToolCursor(): string {
    switch (currentTool) {
      case "select":
        return "move";
      case "pan":
        return "grab";
      case "rectangle":
      case "ellipse":
      case "polygon":
      case "text":
        return "crosshair";
      default:
        return "pointer";
    }
  }

  // Public method to update stage events when stage changes
  public updateStage() {
    this.setupStageEvents();
  }

  destroy() {
    // Clean up all event listeners
    if (stage) {
      stage.removeAllListeners();
    }

    // Clean up shape events
    this.shapeEventHandlers.forEach((handlers, shapeId) => {
      const shape = shapes.find((s) => s.id === shapeId);
      if (shape) {
        Object.entries(handlers).forEach(([eventName, handler]) => {
          shape.graphics.off(
            eventName as any,
            handler as ((...args: any) => void) | undefined
          );
        });
      }
    });
    this.shapeEventHandlers.clear();

    // Reset dragging state
    this.shapePointerDownTarget = null;
  }
}

// Global instance management
let eventManager: EventManager | null = null;

export const createEventManager = (): EventManager => {
  if (eventManager) {
    eventManager.destroy();
  }
  eventManager = new EventManager();
  return eventManager;
};

export const getEventManager = (): EventManager | null => {
  return eventManager;
};

export const destroyEventManager = () => {
  if (eventManager) {
    eventManager.destroy();
    eventManager = null;
  }
};
