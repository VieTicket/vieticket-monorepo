import * as PIXI from "pixi.js";
import { CanvasItem, ContainerGroup } from "../types";
import {
  currentTool,
  stage,
  shapes,
  isAreaMode,
  areaModeContainer,
} from "../variables";
import { getSelectionTransform } from "./transform-events";

import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onDrawStart, onDrawMove, onDrawEnd } from "./draw-events";
import { onPolygonStart, onPolygonMove } from "./polygon-events";
import {
  handleShapeDrag,
  isCurrentlyShapeDragging,
  onShapePointerDown,
  onShapePointerUp,
  endShapeDrag,
} from "./select-drag-events";
import { onStageWheel } from "./zoom-events";
import { getCurrentContainer, findShapeAtPoint } from "../shapes";
import { updateStageHitArea } from "../utils/stageTransform";
import {
  onAreaModePointerDown,
  onAreaModePointerMove,
  onAreaModePointerUp,
} from "./area-mode-events";
import {
  endMultiSelection,
  isMultiSelecting,
  startMultiSelection,
  updateMultiSelection,
} from "./multi-selection-events";

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

    updateStageHitArea();

    stage.on("pointerdown", this.onStagePointerDown.bind(this));
    stage.on("pointermove", this.onStagePointerMove.bind(this));
    stage.on("pointerup", this.onStagePointerUp.bind(this));
    stage.on("pointerupoutside", this.onStagePointerUp.bind(this));
    stage.on("wheel", onStageWheel);
  }

  addShapeEvents(shape: CanvasItem) {
    const handlers = {
      pointerdown: (event: PIXI.FederatedPointerEvent) => {
        this.shapePointerDownTarget = shape;
        onShapePointerDown(event, shape);
      },
      pointerup: (event: PIXI.FederatedPointerEvent) => {
        switch (currentTool) {
          case "rectangle":
          case "ellipse":
          case "text":
            onDrawStart(event);
            break;
          case "polygon":
            onPolygonStart(event);
            break;
          case "select": {
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
            break;
          }
        }
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
        const currentContainer = getCurrentContainer();
        let hitShape: CanvasItem | null = null;
        if (isAreaMode) {
          hitShape = findShapeAtPoint(
            event,
            areaModeContainer as ContainerGroup
          );
          if (hitShape) {
            hitShape!.selected = true;
            const selectionTransform = getSelectionTransform();
            if (selectionTransform) {
              selectionTransform.updateSelection([hitShape]);
            }
          }
        } else {
          hitShape = findShapeAtPoint(event, currentContainer);
        }
        if (
          !hitShape ||
          !hitShape.interactive ||
          hitShape.type === "container"
        ) {
          startMultiSelection(event);
        }
        break;
      case "seat-grid":
        onAreaModePointerDown(event);
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
        } else if (isMultiSelecting()) {
          // ✅ Handle multi-selection rectangle update
          updateMultiSelection(event);
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
      case "seat-grid":
        onAreaModePointerMove(event);
        break;
    }
  }

  private onStagePointerUp(event: PIXI.FederatedPointerEvent) {
    switch (currentTool) {
      case "select":
        const selectionTransform = getSelectionTransform();

        if (selectionTransform?.isCurrentlyTransforming) {
          selectionTransform.onTransformPointerUp();
        } else if (isCurrentlyShapeDragging()) {
          // ✅ FIX: End shape drag if it's currently dragging
          endShapeDrag();
        } else if (isMultiSelecting()) {
          // ✅ Handle multi-selection end
          endMultiSelection(event);
        }
        break;
      case "pan":
        onPanEnd();
        break;
      case "rectangle":
      case "ellipse":
        onDrawEnd(event);
        break;
      case "seat-grid":
        onAreaModePointerUp(event);
        break;
    }
  }

  private onShapeHover(event: PIXI.FederatedPointerEvent, shape: CanvasItem) {
    if (currentTool === "select") {
      shape.graphics.cursor = "move";

      if (shape.graphics instanceof PIXI.Graphics) {
        shape.graphics.alpha = shape.opacity * 0.8;
      }
    } else {
      shape.graphics.cursor = this.getToolCursor();
    }
  }

  private onShapeOut(event: PIXI.FederatedPointerEvent, shape: CanvasItem) {
    shape.graphics.cursor = "pointer";

    if (shape.graphics instanceof PIXI.Graphics) {
      shape.graphics.alpha = shape.opacity / 0.8;
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
      case "seat-grid":
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
