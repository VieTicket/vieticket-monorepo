import { StateCreator } from "zustand";
import {
  ValidationError,
  validateAllPolygonAreas,
} from "../utils/polygon-validation";
import { ShapesSlice } from "./shapes-slice";
import { CanvasSlice } from "./canvas-slice";
import { AreaSlice } from "./area-slice";

export interface ValidationSlice {
  validationErrors: ValidationError[];
  showValidationErrors: boolean;
  highlightedSeats: string[];

  validateAllAreas: () => void;
  dismissValidationErrors: () => void;
  highlightSeatsInArea: (areaId: string, seatIds: string[]) => void;
  clearHighlightedSeats: () => void;
  fixArea: (areaId: string) => void;
}

export const createValidationSlice: StateCreator<
  ShapesSlice & CanvasSlice & AreaSlice & ValidationSlice,
  [],
  [],
  ValidationSlice
> = (set, get) => ({
  validationErrors: [],
  showValidationErrors: false,
  highlightedSeats: [],

  validateAllAreas: () => {
    try {
      const { shapes } = get();

      // Only validate if we have the validation utility
      if (typeof window !== "undefined") {
        import("../utils/polygon-validation")
          .then(({ validateAllPolygonAreas }) => {
            const errors = validateAllPolygonAreas(shapes);

            set({
              validationErrors: errors,
              showValidationErrors: errors.length > 0,
            });
          })
          .catch(() => {
            // Silently fail if validation utility not available
          });
      }
    } catch (error) {
      console.warn("Validation failed:", error);
    }
  },

  dismissValidationErrors: () => {
    set({
      showValidationErrors: false,
      highlightedSeats: [],
    });
  },

  highlightSeatsInArea: (areaId: string, seatIds: string[]) => {
    try {
      const { shapes, panToShape } = get();
      const area = shapes.find((shape) => shape.id === areaId);

      if (area && panToShape) {
        panToShape(areaId);

        set({
          highlightedSeats: seatIds,
        });

        setTimeout(() => {
          get().clearHighlightedSeats();
        }, 5000);
      }
    } catch (error) {
      console.warn("Failed to highlight seats:", error);
    }
  },

  clearHighlightedSeats: () => {
    set({
      highlightedSeats: [],
    });
  },

  fixArea: (areaId: string) => {
    try {
      const { shapes, enterAreaMode, zoom, pan } = get();
      const area = shapes.find(
        (shape) => shape.id === areaId && shape.type === "polygon"
      );

      if (area && enterAreaMode) {
        const currentState = { zoom, pan };
        enterAreaMode(area as any, currentState);

        set({
          showValidationErrors: false,
          highlightedSeats: [],
        });
      }
    } catch (error) {
      console.warn("Failed to fix area:", error);
    }
  },
});
