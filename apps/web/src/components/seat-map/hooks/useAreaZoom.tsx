import { useCallback } from "react";
import {
  useCanvasStore,
  useAreaMode,
  useAreaActions,
} from "@/components/seat-map/store/main-store";
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
  } = useCanvasStore();

  const { isInAreaMode, zoomedArea, selectedRowIds, selectedSeatIds } =
    useAreaMode();
  const { enterAreaMode, exitAreaMode, addSeatToRow } = useAreaActions();

  const saveCanvasState = useCallback(() => {
    return { zoom, pan };
  }, [zoom, pan]);

  const isPointInsidePolygon = useCallback(
    (point: { x: number; y: number }, polygon: Shape): boolean => {
      if (polygon.type !== "polygon" || !polygon.points) return false;

      const { x, y } = point;
      const points = polygon.points;
      let inside = false;

      // FIX: Update to work with 2D points array
      for (let i = 0, j = points.length - 1; i < points.length; j = i, i++) {
        const xi = polygon.x + points[i].x;
        const yi = polygon.y + points[i].y;
        const xj = polygon.x + points[j].x;
        const yj = polygon.y + points[j].y;

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      return inside;
    },
    []
  );

  const getPolygonBounds = useCallback((polygon: Shape) => {
    if (
      polygon.type !== "polygon" ||
      !polygon.points ||
      polygon.points.length === 0
    ) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    // FIX: Update to work with 2D points array
    let minX = polygon.x + polygon.points[0].x;
    let maxX = polygon.x + polygon.points[0].x;
    let minY = polygon.y + polygon.points[0].y;
    let maxY = polygon.y + polygon.points[0].y;

    for (let i = 1; i < polygon.points.length; i++) {
      const x = polygon.x + polygon.points[i].x;
      const y = polygon.y + polygon.points[i].y;
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

      const areaWithRows = {
        ...area,
        rows: area.rows || [],
      };

      const originalState = saveCanvasState();

      enterAreaMode(areaWithRows, originalState);

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
    if (!isInAreaMode || !zoomedArea) return;

    const originalFill = zoomedArea.fill || "#e0e0e0";
    const originalStroke = zoomedArea.stroke || "#666666";
    const originalStrokeWidth = zoomedArea.strokeWidth || 1;

    exitAreaMode();

    updateShape(zoomedArea.id, {
      fill: originalFill,
      stroke: originalStroke,
      strokeWidth: originalStrokeWidth,
    });

    setCurrentTool("select");
  }, [isInAreaMode, zoomedArea, exitAreaMode, updateShape, setCurrentTool]);

  return {
    isInAreaMode,
    zoomedArea,
    selectedRowIds,
    selectedSeatIds,
    handleAreaDoubleClick,
    exitAreaMode: handleExitAreaMode,
    isPointInsidePolygon,
    addSeatToRow,
  };
};
