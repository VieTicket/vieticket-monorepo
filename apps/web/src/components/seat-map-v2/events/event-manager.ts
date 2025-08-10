import * as PIXI from "pixi.js";
import { PixiShape } from "../types";
import { currentTool, stage, shapes, pixiApp } from "../variables";
import { getSelectionTransform } from "./transform-events";
import { useSeatMapStore } from "../store/seat-map-store";

// Import existing event handlers
import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onDrawStart, onDrawMove, onDrawEnd } from "./draw-events";
import { onPolygonStart, onPolygonMove } from "./polygon-events";
import { onStageClick } from "./select-events";
import { onStageWheel } from "./zoom-events";

export class EventManager {
  private shapeEventHandlers = new Map<string, any>();
  private isShapeDragging = false;
  private dragStart: { x: number; y: number } | null = null;
  private draggedShapes: PixiShape[] = [];
  private originalPositions: Array<{ x: number; y: number }> = [];

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

  addShapeEvents(shape: PixiShape) {
    const handlers = {
      pointerdown: (event: PIXI.FederatedPointerEvent) => {
        this.onShapePointerDown(event, shape);
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

  removeShapeEvents(shape: PixiShape) {
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
    const selectionTransform = getSelectionTransform();

    // Priority 1: Transform handles
    if (selectionTransform?.isCurrentlyTransforming) {
      selectionTransform.onTransformPointerMove(event);
      return;
    }

    // Priority 2: Shape dragging
    if (this.isShapeDragging && currentTool === "select") {
      this.handleShapeDrag(event);
      return;
    }

    // Priority 3: Tool-specific operations
    switch (currentTool) {
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
    const selectionTransform = getSelectionTransform();

    // Priority 1: Handle transform end
    if (selectionTransform?.isCurrentlyTransforming) {
      selectionTransform.onTransformPointerUp();
      return;
    }

    // Priority 2: Handle drag end
    if (this.isShapeDragging) {
      this.endShapeDrag();
      return;
    }

    // Priority 3: Tool-specific operations
    switch (currentTool) {
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
    shape: PixiShape
  ) {
    event.stopPropagation();

    switch (currentTool) {
      case "select":
        this.handleShapeSelection(event, shape);
        this.startShapeDrag(event, shape);
        break;
      // Other tools don't need shape-specific handling as they use stage events
    }
  }

  private handleShapeSelection(
    event: PIXI.FederatedPointerEvent,
    shape: PixiShape
  ) {
    // Handle multi-selection with Ctrl/Cmd key
    const isMultiSelect = event.ctrlKey || event.metaKey;

    if (isMultiSelect) {
      // Toggle selection for this shape
      shape.selected = !shape.selected;
    } else {
      // Single selection - deselect all others
      shapes.forEach((s) => {
        s.selected = s.id === shape.id ? !s.selected : false;
      });
    }

    const selectedShapes = shapes.filter((s) => s.selected);
    useSeatMapStore.getState().setSelectedShapes(selectedShapes);
    useSeatMapStore.getState().updateShapes(shapes);

    // Update selection transform
    const selectionTransform = getSelectionTransform();
    if (selectionTransform) {
      selectionTransform.updateSelection(selectedShapes);
    }
  }

  private startShapeDrag(event: PIXI.FederatedPointerEvent, shape: PixiShape) {
    if (!stage) return;

    const selectionTransform = getSelectionTransform();
    if (selectionTransform?.isCurrentlyTransforming) return;

    const localPoint = event.getLocalPosition(stage);
    this.isShapeDragging = true;
    this.dragStart = { x: localPoint.x, y: localPoint.y };

    // Get all selected shapes for multi-shape dragging
    const selectedShapes = useSeatMapStore.getState().selectedShapes;

    // If clicked shape is not selected, select only this shape and drag it
    if (!selectedShapes.some((s) => s.id === shape.id)) {
      this.draggedShapes = [shape];
      // Update selection to only this shape
      shapes.forEach((s) => (s.selected = s.id === shape.id));
      const newSelection = [shape];
      useSeatMapStore.getState().setSelectedShapes(newSelection);

      // Update selection transform
      const selectionTransform = getSelectionTransform();
      if (selectionTransform) {
        selectionTransform.updateSelection(newSelection);
      }
    } else {
      // If clicked shape is selected, drag all selected shapes
      this.draggedShapes = [...selectedShapes];
    }

    // Store original positions
    this.originalPositions = this.draggedShapes.map((s) => ({
      x: s.x,
      y: s.y,
    }));
  }

  private handleShapeDrag(event: PIXI.FederatedPointerEvent) {
    if (!this.isShapeDragging || !this.dragStart || !stage) return;

    const currentPoint = event.getLocalPosition(stage);
    const deltaX = currentPoint.x - this.dragStart.x;
    const deltaY = currentPoint.y - this.dragStart.y;

    // Update positions of all dragged shapes
    this.draggedShapes.forEach((shape, index) => {
      const original = this.originalPositions[index];
      shape.x = original.x + deltaX;
      shape.y = original.y + deltaY;

      // Update PIXI graphics position
      shape.graphics.position.set(shape.x, shape.y);
    });

    // Update selection transform if shapes are selected
    const selectionTransform = getSelectionTransform();
    if (selectionTransform && this.draggedShapes.length > 0) {
      selectionTransform.updateSelection(this.draggedShapes);
    }
  }

  private endShapeDrag() {
    if (!this.isShapeDragging) return;

    this.isShapeDragging = false;
    this.dragStart = null;
    this.draggedShapes = [];
    this.originalPositions = [];

    // Update store with final positions
    const selectedShapes = useSeatMapStore.getState().selectedShapes;
    useSeatMapStore.getState().setSelectedShapes([...selectedShapes]);
    useSeatMapStore.getState().updateShapes([...shapes]);
  }

  private onShapeHover(event: PIXI.FederatedPointerEvent, shape: PixiShape) {
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

  private onShapeOut(event: PIXI.FederatedPointerEvent, shape: PixiShape) {
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

  // Public method to check if currently dragging shapes
  public get isCurrentlyDragging(): boolean {
    return this.isShapeDragging;
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
    this.isShapeDragging = false;
    this.dragStart = null;
    this.draggedShapes = [];
    this.originalPositions = [];
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
