import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup } from "../types";
import {
  currentTool,
  stage,
  shapes,
  pixiApp,
  selectedContainer,
} from "../variables";
import { getSelectionTransform } from "./transform-events";

import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onDrawStart, onDrawMove, onDrawEnd } from "./draw-events";
import { onPolygonStart, onPolygonMove } from "./polygon-events";
import {
  onStageClick,
  handleShapeDrag,
  isCurrentlyShapeDragging,
  onShapePointerDown,
  onShapePointerUp,
} from "./select-drag-events";
import { onStageWheel } from "./zoom-events";
import { getCurrentContainer, findShapeAtPoint } from "../shapes";

export class EventManager {
  private shapeEventHandlers = new Map<string, any>();
  private shapePointerDownTarget: CanvasItem | null = null;
  private lastClickTime = 0;
  private lastClickTarget: CanvasItem | null = null;
  private doubleClickThreshold = 300;

  constructor() {
    this.setupStageEvents();
  }

  private setupStageEvents() {
    if (!pixiApp?.stage) return;

    // Use pixiApp.stage (root stage) instead of our stage container
    const rootStage = pixiApp.stage;

    rootStage.removeAllListeners();

    rootStage.eventMode = "static";
    rootStage.interactive = true;
    rootStage.interactiveChildren = true;
    rootStage.hitArea = pixiApp.screen;

    rootStage.on("pointerdown", this.onStagePointerDown.bind(this));
    rootStage.on("pointermove", this.onStagePointerMove.bind(this));
    rootStage.on("pointerup", this.onStagePointerUp.bind(this));
    rootStage.on("pointerupoutside", this.onStagePointerUp.bind(this));
    rootStage.on("wheel", onStageWheel);
  }

  addShapeEvents(shape: CanvasItem) {
    const handlers = {
      pointerdown: (event: PIXI.FederatedPointerEvent) => {
        this.shapePointerDownTarget = shape;
        onShapePointerDown(event, shape);
      },
      pointerup: (event: PIXI.FederatedPointerEvent) => {
        const result = onShapePointerUp(
          event,
          shape,
          this.lastClickTime,
          this.lastClickTarget,
          this.doubleClickThreshold
        );

        if (result) {
          this.lastClickTime = result.currentTime;
          this.lastClickTarget = result.actualShape;
        }
      },
      pointerover: (event: PIXI.FederatedPointerEvent) => {
        this.onShapeHover(event, shape);
      },
      pointerout: (event: PIXI.FederatedPointerEvent) => {
        this.onShapeOut(event, shape);
      },
    };

    // Make sure shape graphics are interactive
    shape.graphics.eventMode = "static";
    shape.graphics.interactive = true;

    Object.entries(handlers).forEach(([eventName, handler]) => {
      shape.graphics.on(eventName as any, handler);
    });

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
        // Check if we clicked on a shape in the current container context
        const currentContainer = getCurrentContainer();
        const hitShape = findShapeAtPoint(event, currentContainer);

        if (!hitShape) {
          onStageClick(event);
        } else {
        }
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

  private onShapeHover(event: PIXI.FederatedPointerEvent, shape: CanvasItem) {
    if (currentTool === "select") {
      shape.graphics.cursor = "move";

      if (shape.graphics instanceof PIXI.Graphics) {
        shape.graphics.alpha = 0.8;
      }
    } else {
      shape.graphics.cursor = this.getToolCursor();
    }
  }

  private onShapeOut(event: PIXI.FederatedPointerEvent, shape: CanvasItem) {
    shape.graphics.cursor = "pointer";

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

  public updateStage() {
    this.setupStageEvents();
  }

  destroy() {
    if (pixiApp?.stage) {
      pixiApp.stage.removeAllListeners();
    }

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

    this.shapePointerDownTarget = null;
  }
}

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
