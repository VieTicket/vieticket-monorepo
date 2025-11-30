import * as PIXI from "pixi.js";
import { CanvasItem, SeatShape } from "../types";
import { stage, shapes } from "../variables";
import { onPanStart, onPanMove, onPanEnd } from "./pan-events";
import { onStageWheel } from "./zoom-events";
import { updateStageHitArea } from "../utils/stageTransform";
import { useSeatMapStore } from "../store/seat-map-store";

export class CustomerEventManager {
  private shapeEventHandlers = new Map<string, any>();
  private onSeatClick: ((seatId: string, isAvailable: boolean) => void) | null =
    null;
  private getSeatStatus: ((seatId: string) => string) | null = null;
  private onSeatHover: ((seatId: string | null) => void) | null = null;

  // ✅ Customer-specific properties
  private customerHoverTimeout: NodeJS.Timeout | null = null;
  private customerLastHoveredSeat: string | null = null;

  constructor(
    onSeatClickCallback?: (seatId: string, isAvailable: boolean) => void,
    getSeatStatusCallback?: (seatId: string) => string,
    onSeatHoverCallback?: (seatId: string | null) => void
  ) {
    this.onSeatClick = onSeatClickCallback || null;
    this.getSeatStatus = getSeatStatusCallback || null;
    this.onSeatHover = onSeatHoverCallback || null;
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
    if (shape.type !== "ellipse" || !("rowId" in shape)) {
      return;
    }

    const seatShape = shape as SeatShape;

    const handlers = {
      pointerdown: (event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        this.customerHandleSeatClick(seatShape);
      },
      pointerover: (event: PIXI.FederatedPointerEvent) => {
        this.customerOnSeatHover(seatShape);
      },
      pointerout: (event: PIXI.FederatedPointerEvent) => {
        this.customerOnSeatOut(seatShape);
      },
    };

    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (seatShape.graphics) {
        seatShape.graphics.eventMode = "static";
        seatShape.graphics.interactive = true;
        seatShape.graphics.on(eventName as any, handler);
      }
    });

    this.shapeEventHandlers.set(shape.id, handlers);
  }

  removeShapeEvents(shape: CanvasItem) {
    const handlers = this.shapeEventHandlers.get(shape.id);
    if (handlers && shape.graphics) {
      Object.entries(handlers).forEach(([eventName, handler]) => {
        shape.graphics.off(
          eventName as any,
          handler as ((...args: any) => void) | undefined
        );
      });
      this.shapeEventHandlers.delete(shape.id);
    }
  }

  // ✅ Customer-specific seat click handler
  private customerHandleSeatClick(seat: SeatShape) {
    if (!this.onSeatClick || !this.getSeatStatus) return;

    const status = this.getSeatStatus(seat.id);
    const isAvailable = status === "available";

    // Add visual feedback animation
    this.customerAnimateSeatClick(seat);

    // Trigger callback
    this.onSeatClick(seat.id, isAvailable);
  }

  // ✅ Customer seat click animation
  private customerAnimateSeatClick(seat: SeatShape) {
    if (!seat.seatGraphics) return;

    const originalScale = seat.seatGraphics.scale.x;

    // Create a quick scale animation
    seat.seatGraphics.scale.set(1.3);

    setTimeout(() => {
      if (seat.seatGraphics) {
        seat.seatGraphics.scale.set(originalScale);
      }
    }, 150);
  }

  // ✅ Customer hover handler with store integration
  private customerOnSeatHover(seat: SeatShape) {
    if (!seat.graphics) return;

    // Clear previous hover timeout
    if (this.customerHoverTimeout) {
      clearTimeout(this.customerHoverTimeout);
    }

    this.customerLastHoveredSeat = seat.id;

    const status = this.getSeatStatus
      ? this.getSeatStatus(seat.id)
      : "available";

    // Change cursor based on availability
    if (status === "available") {
      seat.graphics.cursor = "pointer";
      // Slight scale effect on hover
      if (seat.seatGraphics) {
        seat.seatGraphics.scale.set(1.1);
      }
    } else {
      seat.graphics.cursor = "not-allowed";
    }

    // Trigger hover callback with delay to prevent spam
    this.customerHoverTimeout = setTimeout(() => {
      if (this.onSeatHover && this.customerLastHoveredSeat === seat.id) {
        this.onSeatHover(seat.id);
      }
    }, 100);

    // Show seat tooltip
    this.customerShowSeatTooltip(seat);
  }

  // ✅ Customer hover out handler
  private customerOnSeatOut(seat: SeatShape) {
    if (!seat.graphics) return;

    seat.graphics.cursor = "default";

    // Reset scale
    if (seat.seatGraphics) {
      seat.seatGraphics.scale.set(1.0);
    }

    // Clear hover timeout
    if (this.customerHoverTimeout) {
      clearTimeout(this.customerHoverTimeout);
      this.customerHoverTimeout = null;
    }

    // Trigger hover callback to clear
    if (this.onSeatHover && this.customerLastHoveredSeat === seat.id) {
      this.onSeatHover(null);
      this.customerLastHoveredSeat = null;
    }

    // Hide tooltip
    this.customerHideSeatTooltip(seat);
  }

  // ✅ Enhanced customer seat visuals
  private customerUpdateSeatVisuals(seat: SeatShape, isUnavailable: boolean) {
    if (!seat.seatGraphics) return;

    const status = this.getSeatStatus
      ? this.getSeatStatus(seat.id)
      : "available";

    // Clear existing graphics and redraw with new stroke
    seat.seatGraphics.clear();

    // Draw the seat circle with appropriate stroke based on status
    seat.seatGraphics.circle(0, 0, seat.radiusX || 15);

    // Keep the original fill color (usually white or light gray)
    seat.seatGraphics.fill({ color: seat.color || 0xffffff });

    // Update stroke/border based on status with enhanced visuals
    switch (status) {
      case "available":
        seat.seatGraphics.stroke({
          width: 2,
          color: 0x10b981, // Green border
        });
        break;
      case "selected":
        seat.seatGraphics.stroke({
          width: 4, // Thicker border for selected
          color: 0x3b82f6, // Blue border
        });
        // Add enhanced selection ring for selected seats
        this.customerAddSelectionRing(seat);
        break;
      case "held":
        seat.seatGraphics.stroke({
          width: 2,
          color: 0xeab308, // Yellow border
        });
        // Add pulse animation for held seats
        this.customerAddPulseEffect(seat);
        break;
      case "sold":
        seat.seatGraphics.stroke({
          width: 2,
          color: 0xef4444, // Red border
        });
        // Add cross-out effect for sold seats
        this.customerAddCrossOutEffect(seat);
        break;
      default:
        seat.seatGraphics.stroke({
          width: 2,
          color: 0x6b7280, // Gray border
        });
    }

    // Remove effects if status changed
    if (status !== "selected") {
      this.customerRemoveSelectionRing(seat);
    }
    if (status !== "held") {
      this.customerRemovePulseEffect(seat);
    }
    if (status !== "sold") {
      this.customerRemoveCrossOutEffect(seat);
    }
  }

  // ✅ Enhanced selection ring with glow effect
  private customerAddSelectionRing(seat: SeatShape) {
    if (!seat.graphics || !seat.seatGraphics) return;

    this.customerRemoveSelectionRing(seat);

    // Create multiple rings for glow effect
    const outerRing = new PIXI.Graphics();
    const radius = seat.radiusX || 15;

    // Outer glow ring
    outerRing.circle(0, 0, radius + 8);
    outerRing.stroke({ width: 2, color: 0x3b82f6, alpha: 0.3 });

    // Middle ring
    outerRing.circle(0, 0, radius + 5);
    outerRing.stroke({ width: 2, color: 0x3b82f6, alpha: 0.6 });

    outerRing.x = 0;
    outerRing.y = 0;

    seat.graphics.addChildAt(outerRing, 0);
    (seat as any)._customerSelectionRing = outerRing;
  }

  private customerRemoveSelectionRing(seat: SeatShape) {
    if (!seat.graphics) return;

    const ring = (seat as any)._customerSelectionRing;
    if (ring && ring.parent) {
      ring.parent.removeChild(ring);
      ring.destroy();
      delete (seat as any)._customerSelectionRing;
    }
  }

  // ✅ Pulse animation for held seats
  private customerAddPulseEffect(seat: SeatShape) {
    if (!seat.seatGraphics) return;

    this.customerRemovePulseEffect(seat);

    let pulseDirection = 1;
    const originalAlpha = seat.seatGraphics.alpha;

    const pulseInterval = setInterval(() => {
      if (!seat.seatGraphics) {
        clearInterval(pulseInterval);
        return;
      }

      seat.seatGraphics.alpha += 0.02 * pulseDirection;

      if (seat.seatGraphics.alpha >= 1) {
        pulseDirection = -1;
      } else if (seat.seatGraphics.alpha <= 0.6) {
        pulseDirection = 1;
      }
    }, 50);

    (seat as any)._customerPulseInterval = pulseInterval;
  }

  private customerRemovePulseEffect(seat: SeatShape) {
    const pulseInterval = (seat as any)._customerPulseInterval;
    if (pulseInterval) {
      clearInterval(pulseInterval);
      delete (seat as any)._customerPulseInterval;

      if (seat.seatGraphics) {
        seat.seatGraphics.alpha = 1.0;
      }
    }
  }

  // ✅ Enhanced cross-out effect
  private customerAddCrossOutEffect(seat: SeatShape) {
    if (!seat.graphics) return;

    this.customerRemoveCrossOutEffect(seat);

    const crossOut = new PIXI.Graphics();
    const radius = seat.radiusX || 15;

    // Draw an X across the seat
    crossOut.moveTo(-radius * 0.7, -radius * 0.7);
    crossOut.lineTo(radius * 0.7, radius * 0.7);
    crossOut.moveTo(radius * 0.7, -radius * 0.7);
    crossOut.lineTo(-radius * 0.7, radius * 0.7);
    crossOut.stroke({ width: 3, color: 0xef4444 });

    crossOut.x = 0;
    crossOut.y = 0;

    seat.graphics.addChild(crossOut);
    (seat as any)._customerCrossOut = crossOut;
  }

  private customerRemoveCrossOutEffect(seat: SeatShape) {
    if (!seat.graphics) return;

    const crossOut = (seat as any)._customerCrossOut;
    if (crossOut && crossOut.parent) {
      crossOut.parent.removeChild(crossOut);
      crossOut.destroy();
      delete (seat as any)._customerCrossOut;
    }
  }

  private customerShowSeatTooltip(seat: SeatShape) {
    // Enhanced tooltip with subtle glow
    if (seat.seatGraphics) {
      seat.seatGraphics.alpha = 0.9;
    }
  }

  private customerHideSeatTooltip(seat: SeatShape) {
    if (seat.seatGraphics) {
      seat.seatGraphics.alpha = 1.0;
    }
  }

  // Stage event handlers (same as before)
  private onStagePointerDown(event: PIXI.FederatedPointerEvent) {
    onPanStart(event);
  }

  private onStagePointerMove(event: PIXI.FederatedPointerEvent) {
    onPanMove(event);
  }

  private onStagePointerUp(event: PIXI.FederatedPointerEvent) {
    onPanEnd();
  }

  // ✅ Public customer methods
  public customerUpdateSeatStatus(seatId: string) {
    const seat = this.customerFindSeatById(seatId);
    if (seat) {
      this.customerUpdateSeatVisuals(seat, false);
    }
  }

  public customerUpdateAllSeatVisuals() {
    const seats = this.customerGetAllSeats();
    seats.forEach((seat) => {
      this.customerUpdateSeatVisuals(seat, false);
    });
  }

  public customerHighlightAvailableSeats() {
    const seats = this.customerGetAllSeats();
    seats.forEach((seat) => {
      const status = this.getSeatStatus
        ? this.getSeatStatus(seat.id)
        : "available";
      if (status === "available" && seat.seatGraphics) {
        // Add subtle highlight to available seats
        seat.seatGraphics.alpha = 0.8;
        setTimeout(() => {
          if (seat.seatGraphics) {
            seat.seatGraphics.alpha = 1.0;
          }
        }, 500);
      }
    });
  }

  public customerClearAllVisualEffects() {
    const seats = this.customerGetAllSeats();
    seats.forEach((seat) => {
      this.customerRemoveSelectionRing(seat);
      this.customerRemovePulseEffect(seat);
      this.customerRemoveCrossOutEffect(seat);
    });
  }

  // Utility methods (updated with customer prefix)
  private customerFindSeatById(seatId: string): SeatShape | null {
    const findSeatRecursively = (shapes: CanvasItem[]): SeatShape | null => {
      for (const shape of shapes) {
        if (
          shape.id === seatId &&
          shape.type === "ellipse" &&
          "rowId" in shape
        ) {
          return shape as SeatShape;
        }

        if (shape.type === "container" && "children" in shape) {
          const found = findSeatRecursively((shape as any).children);
          if (found) return found;
        }
      }
      return null;
    };

    return findSeatRecursively(shapes);
  }

  private customerGetAllSeats(): SeatShape[] {
    const seats: SeatShape[] = [];

    const collectSeatsRecursively = (shapes: CanvasItem[]) => {
      for (const shape of shapes) {
        if (shape.type === "ellipse" && "rowId" in shape) {
          seats.push(shape as SeatShape);
        }

        if (shape.type === "container" && "children" in shape) {
          collectSeatsRecursively((shape as any).children);
        }
      }
    };

    collectSeatsRecursively(shapes);
    return seats;
  }

  // Alias methods for compatibility (keeping both prefixed and original)
  public updateSeatStatus = this.customerUpdateSeatStatus.bind(this);
  public updateAllSeatVisuals = this.customerUpdateAllSeatVisuals.bind(this);

  public updateCallbacks(
    onSeatClickCallback?: (seatId: string, isAvailable: boolean) => void,
    getSeatStatusCallback?: (seatId: string) => string,
    onSeatHoverCallback?: (seatId: string | null) => void
  ) {
    this.onSeatClick = onSeatClickCallback || null;
    this.getSeatStatus = getSeatStatusCallback || null;
    this.onSeatHover = onSeatHoverCallback || null;
  }

  public updateStage() {
    this.setupStageEvents();
  }

  destroy() {
    // Clear any pending timeouts
    if (this.customerHoverTimeout) {
      clearTimeout(this.customerHoverTimeout);
      this.customerHoverTimeout = null;
    }

    if (stage) {
      stage.removeAllListeners();
    }

    // Clean up all customer visual effects
    this.customerClearAllVisualEffects();

    this.shapeEventHandlers.forEach((handlers, shapeId) => {
      const shape = shapes.find((s) => s.id === shapeId);
      if (shape && shape.graphics) {
        Object.entries(handlers).forEach(([eventName, handler]) => {
          shape.graphics.off(
            eventName as any,
            handler as ((...args: any) => void) | undefined
          );
        });

        if (shape.type === "ellipse" && "rowId" in shape) {
          this.customerRemoveSelectionRing(shape as SeatShape);
          this.customerRemovePulseEffect(shape as SeatShape);
          this.customerRemoveCrossOutEffect(shape as SeatShape);
        }
      }
    });

    this.shapeEventHandlers.clear();
    this.onSeatClick = null;
    this.getSeatStatus = null;
    this.onSeatHover = null;
  }
}

// Global instance management with updated names
let customerEventManager: CustomerEventManager | null = null;

export const createCustomerEventManager = (
  onSeatClickCallback?: (seatId: string, isAvailable: boolean) => void,
  getSeatStatusCallback?: (seatId: string) => string,
  onSeatHoverCallback?: (seatId: string | null) => void
): CustomerEventManager => {
  if (customerEventManager) {
    customerEventManager.destroy();
  }
  customerEventManager = new CustomerEventManager(
    onSeatClickCallback,
    getSeatStatusCallback,
    onSeatHoverCallback
  );
  return customerEventManager;
};

export const getCustomerEventManager = (): CustomerEventManager | null => {
  return customerEventManager;
};

export const destroyCustomerEventManager = () => {
  if (customerEventManager) {
    customerEventManager.destroy();
    customerEventManager = null;
  }
};
