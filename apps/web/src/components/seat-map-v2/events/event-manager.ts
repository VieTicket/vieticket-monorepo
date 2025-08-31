import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup } from "../types";
import {
  currentTool,
  stage,
  shapes,
  pixiApp,
  isNestedShapeSelected,
} from "../variables";
import { getSelectionTransform } from "./transform-events";

import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onDrawStart, onDrawMove, onDrawEnd } from "./draw-events";
import { onPolygonStart, onPolygonMove } from "./polygon-events";
import {
  onStageClick,
  handleShapeSelection,
  handleDoubleClick,
} from "./select-events";
import { onStageWheel } from "./zoom-events";
import {
  startShapeDrag,
  handleShapeDrag,
  endShapeDrag,
  isCurrentlyShapeDragging,
} from "./drag-events";
import { findTopmostChildAtPoint } from "../shapes";

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
    if (shape.type === "container") {
      this.addContainerEvents(shape as ContainerGroup);
    } else {
      this.addRegularShapeEvents(shape);
    }
  }

  private addRegularShapeEvents(shape: CanvasItem) {
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

    Object.entries(handlers).forEach(([eventName, handler]) => {
      shape.graphics.on(eventName as any, handler);
    });

    this.shapeEventHandlers.set(shape.id, handlers);
  }

  private addContainerEvents(container: ContainerGroup) {
    const handlers = {
      pointerdown: (event: PIXI.FederatedPointerEvent) => {
        if (isNestedShapeSelected) {
          const hitChild = findTopmostChildAtPoint(container, event);

          this.onShapePointerDown(event, hitChild!);
        } else {
          this.onShapePointerDown(event, container);
        }
      },
      pointerup: (event: PIXI.FederatedPointerEvent) => {
        if (isNestedShapeSelected) {
          const hitChild = findTopmostChildAtPoint(container, event);
          this.onShapePointerUp(event, hitChild!);
        } else {
          this.onShapePointerUp(event, container);
        }
      },
      pointerover: (event: PIXI.FederatedPointerEvent) => {
        this.onShapeHover(event, container);
      },
      pointerout: (event: PIXI.FederatedPointerEvent) => {
        this.onShapeOut(event, container);
      },
    };

    Object.entries(handlers).forEach(([eventName, handler]) => {
      container.graphics.on(eventName as any, handler);
    });

    this.shapeEventHandlers.set(container.id, handlers);
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

        if (this.shapePointerDownTarget?.id === shape.id) {
          const currentTime = Date.now();
          const isDoubleClick =
            this.lastClickTarget?.id === shape.id &&
            currentTime - this.lastClickTime < this.doubleClickThreshold;

          if (isDoubleClick) {
            handleDoubleClick(event, shape);
          }
          this.lastClickTime = currentTime;
          this.lastClickTarget = shape;
        }

        if (isCurrentlyShapeDragging()) {
          endShapeDrag();
        }
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
    if (stage) {
      stage.removeAllListeners();
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
