import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { ShapeWithoutMeta, PolygonShape } from "@/types/seat-map-types";

export const useAreaEvents = () => {
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  // FIX: Change to 2D array structure
  const [polygonPoints, setPolygonPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [previewPolygonPoints, setPreviewPolygonPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [previewShape, setPreviewShape] = useState<any>(null);

  const { addShape, saveToHistory } = useCanvasStore();

  const isNearFirstPoint = (
    currentPoint: { x: number; y: number },
    threshold = 15
  ): boolean => {
    if (polygonPoints.length < 2) return false; // FIX: Changed from 4 to 2

    const firstPoint = polygonPoints[0];
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - firstPoint.x, 2) +
        Math.pow(currentPoint.y - firstPoint.y, 2)
    );

    return distance <= threshold;
  };

  const handlePolygonMouseDown = (canvasCoords: any, e: any) => {
    if (!isDrawingPolygon) {
      // Start new polygon
      setIsDrawingPolygon(true);
      const points = [{ x: canvasCoords.x, y: canvasCoords.y }]; // FIX: Use 2D structure
      setPolygonPoints(points);
      setPreviewPolygonPoints(points);
      updatePreviewShape(points);
    } else {
      if (isNearFirstPoint(canvasCoords)) {
        finishPolygon();
      } else {
        const newPoints = [
          ...polygonPoints,
          { x: canvasCoords.x, y: canvasCoords.y },
        ]; // FIX: Use 2D structure
        setPolygonPoints(newPoints);
        setPreviewPolygonPoints(newPoints);
        updatePreviewShape(newPoints);
      }
    }
  };

  const handlePolygonMouseMove = (canvasCoords: any) => {
    if (isDrawingPolygon && polygonPoints.length >= 1) {
      // FIX: Changed from 2 to 1
      const tempPoints = [
        ...polygonPoints,
        { x: canvasCoords.x, y: canvasCoords.y },
      ]; // FIX: Use 2D structure
      setPreviewPolygonPoints(tempPoints);
      updatePreviewShape(tempPoints, true);
    }
  };

  const updatePreviewShape = (
    points: { x: number; y: number }[],
    isMoving = false
  ) => {
    if (points.length >= 2) {
      // FIX: Changed from 3 to 2
      setPreviewShape({
        type: "polygon",
        x: 0,
        y: 0,
        points: points, // FIX: Points are now 2D
        fill: "rgba(255, 224, 224, 0.3)",
        stroke: isNearFirstPoint({
          x: points[points.length - 1].x,
          y: points[points.length - 1].y,
        })
          ? "#00ff00"
          : "#ff0000",
        strokeWidth: 2,
        closed: !isMoving && points.length >= 3, // FIX: Changed from 6 to 3
      });
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length >= 3) {
      // FIX: Changed from 3 to 3 (minimum for a polygon)
      const polygonShape: ShapeWithoutMeta = {
        type: "polygon" as const,
        x: 0,
        y: 0,
        points: polygonPoints, // FIX: Points are now 2D
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 1,
        closed: true,
      } satisfies Omit<PolygonShape, "id" | "visible" | "draggable">;

      addShape(polygonShape);
      saveToHistory();
    }

    resetPolygonState();
  };

  const resetPolygonState = () => {
    setIsDrawingPolygon(false);
    setPolygonPoints([]);
    setPreviewPolygonPoints([]);
    setPreviewShape(null);
  };

  // Handle escape key to cancel polygon
  const cancelPolygon = () => {
    resetPolygonState();
  };

  return {
    isDrawingPolygon,
    polygonPoints,
    previewPolygonPoints,
    previewShape,
    handlePolygonMouseDown,
    handlePolygonMouseMove,
    finishPolygon,
    resetPolygonState,
    cancelPolygon,
    isNearFirstPoint: (point: { x: number; y: number }) =>
      isNearFirstPoint(point),
  };
};
