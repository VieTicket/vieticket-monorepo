// Create: hooks/useAreaZoom.tsx
import { useCallback } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { Shape, PolygonShape } from "@/types/seat-map-types";

export const useAreaZoom = () => {
  const {
    shapes,
    zoom,
    pan,
    setZoom,
    setPan,
    updateShape,
    viewportSize,
    setCurrentTool,
    // Area state from store
    isInAreaMode,
    zoomedArea,
    originalCanvasState,
    enterAreaMode,
    exitAreaMode,
    syncAreaToShape,
  } = useCanvasStore();

  const saveCanvasState = useCallback(() => {
    return { zoom, pan };
  }, [zoom, pan]);

  const isPointInsidePolygon = useCallback(
    (point: { x: number; y: number }, polygon: Shape): boolean => {
      if (polygon.type !== "polygon" || !polygon.points) return false;

      const { x, y } = point;
      const points = polygon.points;
      let inside = false;

      for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
        const xi = polygon.x + points[i];
        const yi = polygon.y + points[i + 1];
        const xj = polygon.x + points[j];
        const yj = polygon.y + points[j + 1];

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    },
    []
  );

  const getPolygonBounds = useCallback((polygon: Shape) => {
    if (polygon.type !== "polygon" || !polygon.points) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    let minX = polygon.x + polygon.points[0];
    let maxX = polygon.x + polygon.points[0];
    let minY = polygon.y + polygon.points[1];
    let maxY = polygon.y + polygon.points[1];

    for (let i = 2; i < polygon.points.length; i += 2) {
      const x = polygon.x + polygon.points[i];
      const y = polygon.y + polygon.points[i + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    return { minX, minY, maxX, maxY };
  }, []);

  const handleAreaDoubleClick = useCallback(
    (areaId: string) => {
      const area = shapes.find(
        (s) => s.id === areaId && s.type === "polygon"
      ) as PolygonShape;
      if (!area) return;

      const originalState = saveCanvasState();
      enterAreaMode(area, originalState);
      zoomInOnShape(area);
      setCurrentTool("select");
    },
    [shapes, saveCanvasState, enterAreaMode, setCurrentTool]
  );

  const zoomInOnShape = useCallback(
    (polygon: Shape) => {
      const bounds = getPolygonBounds(polygon);
      const polygonWidth = bounds.maxX - bounds.minX;
      const polygonHeight = bounds.maxY - bounds.minY;

      const padding = 100;
      const zoomX = (viewportSize.width - padding * 2) / polygonWidth;
      const zoomY = (viewportSize.height - padding * 2) / polygonHeight;
      const targetZoom = Math.min(zoomX, zoomY, 2.4);

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      const newPanX = viewportSize.width / 2 - centerX * targetZoom;
      const newPanY = viewportSize.height / 2 - centerY * targetZoom;

      setZoom(targetZoom);
      setPan(newPanX, newPanY);

      updateShape(polygon.id, {
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 2,
      });
    },
    [getPolygonBounds, viewportSize, setZoom, setPan, updateShape]
  );

  const handleExitAreaMode = useCallback(() => {
    if (originalCanvasState && zoomedArea) {
      // Sync area changes back to the main shape
      syncAreaToShape();

      // Restore original state
      setZoom(originalCanvasState.zoom);
      setPan(originalCanvasState.pan.x, originalCanvasState.pan.y);

      // Restore polygon appearance (use stored properties or defaults)
      const originalFill = zoomedArea.fill || "#e0e0e0";
      const originalStroke = zoomedArea.stroke || "#666666";
      const originalStrokeWidth = zoomedArea.strokeWidth || 1;

      updateShape(zoomedArea.id, {
        fill: originalFill,
        stroke: originalStroke,
        strokeWidth: originalStrokeWidth,
      });

      exitAreaMode();
      setCurrentTool("select");
    }
  }, [
    originalCanvasState,
    zoomedArea,
    syncAreaToShape,
    setZoom,
    setPan,
    updateShape,
    exitAreaMode,
    setCurrentTool,
  ]);

  return {
    // State from store
    isInAreaMode,
    zoomedArea,
    // Actions
    handleAreaDoubleClick,
    exitAreaMode: handleExitAreaMode,
    isPointInsidePolygon,
  };
};
