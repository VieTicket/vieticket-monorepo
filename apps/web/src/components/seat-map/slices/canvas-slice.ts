import { StateCreator } from "zustand";
import { ShapesSlice } from "./shapes-slice";
import { HistorySlice } from "./history-slice";
import { ToolType } from "../main-toolbar";

export interface CanvasSlice {
  canvasSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  currentTool: ToolType;

  setCanvasSize: (width: number, height: number) => void;
  setViewportSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setCurrentTool: (tool: ToolType) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  updateMultipleShapes: (
    updates: Array<{ id: string; updates: Record<string, any> }>
  ) => void;
  deleteShapes: (shapeIds: string[]) => void;
  mirrorHorizontally: () => void;
  mirrorVertically: () => void;
  panToShape: (shapeId: string) => void;
}

export const createCanvasSlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice,
  [],
  [],
  CanvasSlice
> = (set, get) => ({
  currentTool: "select",
  canvasSize: { width: 4000, height: 3000 },
  viewportSize: { width: 800, height: 600 },
  zoom: 1,
  pan: { x: 0, y: 0 },

  setCurrentTool: (tool) => {
    set({ currentTool: tool });
    if (tool !== "select") {
      set({ selectedShapeIds: [] });
    }
  },

  setCanvasSize: (width, height) => {
    set({ canvasSize: { width, height } });
  },

  setViewportSize: (width, height) => {
    set({ viewportSize: { width, height } });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },

  setPan: (x, y) => {
    set({ pan: { x, y } });
  },

  resetView: () => {
    const { viewportSize } = get();

    const centerX =
      (viewportSize.width - viewportSize.width * 5) / 2 +
      viewportSize.width * 2;
    const centerY =
      (viewportSize.height - viewportSize.height * 5) / 2 +
      viewportSize.height * 2;

    set({
      zoom: 1,
      pan: { x: centerX, y: centerY },
    });
  },

  zoomIn: () => {
    const { zoom, setZoom } = get();
    const newZoom = Math.min(zoom * 1.2, 10);
    setZoom(newZoom);
  },

  zoomOut: () => {
    const { zoom, setZoom } = get();
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
  },

  updateMultipleShapes: (updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        const update = updates.find((u) => u.id === shape.id);
        if (!update) return shape;

        if (shape.type === "polygon") {
          const polygonShape = shape as any;
          const updateData = update.updates;

          if (
            (updateData.x !== undefined || updateData.y !== undefined) &&
            !updateData.points &&
            !updateData.center
          ) {
            const deltaX = (updateData.x || 0) - (shape.x || 0);
            const deltaY = (updateData.y || 0) - (shape.y || 0);

            return {
              ...shape,
              ...updateData,
              center: {
                x: polygonShape.center.x + deltaX,
                y: polygonShape.center.y + deltaY,
              },
            };
          }

          if (updateData.points) {
            const {
              calculatePolygonCenter,
            } = require("../utils/polygon-utils");
            return {
              ...shape,
              ...updateData,
              center: calculatePolygonCenter(updateData.points),
            };
          }
        }

        return { ...shape, ...update.updates };
      }),
    }));

    get().saveToHistory();
  },

  deleteShapes: (shapeIds) => {
    set((state) => ({
      shapes: state.shapes.filter((s) => !shapeIds.includes(s.id)),
      selectedShapeIds: [],
    }));
    get().saveToHistory();
  },

  mirrorHorizontally: () => {
    const { shapes, selectedShapeIds, canvasSize } = get();
    const selectedShapes = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    );

    if (selectedShapes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;

    selectedShapes.forEach((shape) => {
      if (shape.type === "polygon") {
        const polygonShape = shape as any;

        const bounds = getPolygonBounds(polygonShape);
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
      } else {
        minX = Math.min(minX, shape.x);
        maxX = Math.max(maxX, shape.x);

        if ("width" in shape) {
          maxX = Math.max(maxX, shape.x + (shape as any).width);
        }
        if ("radius" in shape) {
          maxX = Math.max(maxX, shape.x + (shape as any).radius);
        }
      }
    });

    const centerX = (minX + maxX) / 2;

    const updates = selectedShapes.map((shape) => {
      let mirroredUpdates: any = {};

      if (shape.type === "polygon") {
        console.log(shape);
        const polygonShape = shape as any;

        const mirroredPoints = polygonShape.points.map((point: any) => {
          const absoluteX = polygonShape.center.x - shape.x + point.x;
          const deltaX = absoluteX - centerX;
          const mirroredAbsoluteX = centerX - deltaX;
          return {
            x: mirroredAbsoluteX - polygonShape.center.x,
            y: point.y + shape.y,
          };
        });

        shape.x = 0;
        shape.y = 0;

        let mirroredRows = polygonShape.rows || [];
        if (mirroredRows.length > 0) {
          mirroredRows = mirroredRows.map((row: any) => {
            const mirroredRowStartX = -row.startX;

            const mirroredSeats = row.seats.map((seat: any) => {
              return {
                ...seat,
                x: -seat.x,
              };
            });

            return {
              ...row,
              startX: mirroredRowStartX,
              seats: mirroredSeats,

              rotation: row.rotation
                ? row.rotation < 0
                  ? 180 + row.rotation
                  : 180 - row.rotation
                : 0,
            };
          });
        }

        mirroredUpdates = {
          points: mirroredPoints,
          rows: mirroredRows,
        };

        console.log(mirroredUpdates);
      } else {
        const deltaX = shape.x - centerX;
        mirroredUpdates.x = centerX - deltaX;

        if ("width" in shape) {
          mirroredUpdates.x -= (shape as any).width;
        }
        if ("radius" in shape && shape.type === "circle") {
        }
      }

      return { id: shape.id, updates: mirroredUpdates };
    });

    get().updateMultipleShapes(updates);
  },

  mirrorVertically: () => {
    const { shapes, selectedShapeIds, canvasSize } = get();
    const selectedShapes = shapes.filter((shape) =>
      selectedShapeIds.includes(shape.id)
    );

    if (selectedShapes.length === 0) return;

    let minY = Infinity;
    let maxY = -Infinity;

    selectedShapes.forEach((shape) => {
      if (shape.type === "polygon") {
        const polygonShape = shape as any;

        const bounds = getPolygonBounds(polygonShape);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
      } else {
        minY = Math.min(minY, shape.y);
        maxY = Math.max(maxY, shape.y);

        if ("height" in shape) {
          maxY = Math.max(maxY, shape.y + (shape as any).height);
        }
        if ("radius" in shape) {
          maxY = Math.max(maxY, shape.y + (shape as any).radius);
        }
      }
    });

    const centerY = (minY + maxY) / 2;

    const updates = selectedShapes.map((shape) => {
      let mirroredUpdates: any = {};

      if (shape.type === "polygon") {
        const polygonShape = shape as any;

        const mirroredPoints = polygonShape.points.map((point: any) => {
          const absoluteY = polygonShape.center.y - shape.y + point.y;
          const deltaY = absoluteY - centerY;
          const mirroredAbsoluteY = centerY - deltaY;
          return {
            x: point.x + shape.x,
            y: mirroredAbsoluteY - polygonShape.center.y,
          };
        });

        shape.x = 0;
        shape.y = 0;

        let mirroredRows = polygonShape.rows || [];
        if (mirroredRows.length > 0) {
          mirroredRows = mirroredRows.map((row: any) => {
            const mirroredRowStartY = -row.startY;

            const mirroredSeats = row.seats.map((seat: any) => {
              return {
                ...seat,
                y: -seat.y,
              };
            });

            return {
              ...row,
              startY: mirroredRowStartY,
              seats: mirroredSeats,

              rotation: row.rotation ? -row.rotation : 0,
            };
          });
        }

        mirroredUpdates = {
          points: mirroredPoints,
          rows: mirroredRows,
        };
      } else {
        const deltaY = shape.y - centerY;
        mirroredUpdates.y = centerY - deltaY;

        if ("height" in shape) {
          mirroredUpdates.y -= (shape as any).height;
        }
        if ("radius" in shape && shape.type === "circle") {
        }
      }

      return { id: shape.id, updates: mirroredUpdates };
    });

    get().updateMultipleShapes(updates);
  },
  panToShape: (shapeId: string) => {
    const { shapes, viewportSize, zoom } = get();
    const shape = shapes.find((s) => s.id === shapeId);

    if (!shape) return;

    // Calculate the center coordinates of the shape
    let shapeCenterX: number;
    let shapeCenterY: number;

    if (shape.type === "polygon") {
      const polygonShape = shape as any;
      shapeCenterX = polygonShape.center.x;
      shapeCenterY = polygonShape.center.y;
    } else if (shape.type === "circle") {
      const circleShape = shape as any;
      shapeCenterX = circleShape.x;
      shapeCenterY = circleShape.y;
    } else if (shape.type === "rect") {
      const rectShape = shape as any;
      shapeCenterX = rectShape.x + (rectShape.width || 0) / 2;
      shapeCenterY = rectShape.y + (rectShape.height || 0) / 2;
    } else if (shape.type === "text") {
      const textShape = shape as any;
      // For text, use the position as center (text is positioned by its baseline)
      shapeCenterX = textShape.x + (textShape.width || 0) / 2;
      shapeCenterY = textShape.y + (textShape.height || 0) / 2;
    } else {
      // Default fallback
      shapeCenterX = shape.x;
      shapeCenterY = shape.y;
    }

    // Calculate the pan coordinates to center the shape in the viewport
    // The formula accounts for zoom level and viewport center
    const newPanX = viewportSize.width / 2 - shapeCenterX * zoom;
    const newPanY = viewportSize.height / 2 - shapeCenterY * zoom;

    // Update the pan coordinates
    set({ pan: { x: newPanX, y: newPanY } });
  },
});

function getPolygonBounds(polygonShape: any) {
  if (!polygonShape.points || polygonShape.points.length === 0) {
    return {
      minX: polygonShape.center.x,
      minY: polygonShape.center.y,
      maxX: polygonShape.center.x,
      maxY: polygonShape.center.y,
    };
  }

  let minX = polygonShape.center.x + polygonShape.points[0].x;
  let maxX = polygonShape.center.x + polygonShape.points[0].x;
  let minY = polygonShape.center.y + polygonShape.points[0].y;
  let maxY = polygonShape.center.y + polygonShape.points[0].y;

  for (let i = 1; i < polygonShape.points.length; i++) {
    const absoluteX = polygonShape.center.x + polygonShape.points[i].x;
    const absoluteY = polygonShape.center.y + polygonShape.points[i].y;

    minX = Math.min(minX, absoluteX);
    maxX = Math.max(maxX, absoluteX);
    minY = Math.min(minY, absoluteY);
    maxY = Math.max(maxY, absoluteY);
  }

  return { minX, minY, maxX, maxY };
}
