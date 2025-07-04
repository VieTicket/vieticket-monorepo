import { useState } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { ShapeWithoutMeta, PolygonShape } from "@/types/seat-map-types";

export const usePolygonEvents = () => {
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);
  const [previewPolygonPoints, setPreviewPolygonPoints] = useState<number[]>(
    []
  );
  const [previewShape, setPreviewShape] = useState<any>(null);

  const { addShape, saveToHistory } = useCanvasStore();

  const isNearFirstPoint = (
    currentPoint: { x: number; y: number },
    threshold = 15
  ): boolean => {
    if (polygonPoints.length < 4) return false;

    const firstX = polygonPoints[0];
    const firstY = polygonPoints[1];
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - firstX, 2) +
        Math.pow(currentPoint.y - firstY, 2)
    );

    return distance <= threshold;
  };

  const handlePolygonMouseDown = (canvasCoords: any, e: any) => {
    if (!isDrawingPolygon) {
      // Start new polygon
      setIsDrawingPolygon(true);
      const points = [canvasCoords.x, canvasCoords.y];
      setPolygonPoints(points);
      setPreviewPolygonPoints(points);
      updatePreviewShape(points);
    } else {
      if (isNearFirstPoint(canvasCoords)) {
        finishPolygon();
      } else {
        const newPoints = [...polygonPoints, canvasCoords.x, canvasCoords.y];
        setPolygonPoints(newPoints);
        setPreviewPolygonPoints(newPoints);
        updatePreviewShape(newPoints);
      }
    }
  };

  const handlePolygonMouseMove = (canvasCoords: any) => {
    if (isDrawingPolygon && polygonPoints.length >= 2) {
      const tempPoints = [...polygonPoints, canvasCoords.x, canvasCoords.y];
      setPreviewPolygonPoints(tempPoints);
      updatePreviewShape(tempPoints, true);
    }
  };

  const updatePreviewShape = (points: number[], isMoving = false) => {
    if (points.length >= 3) {
      setPreviewShape({
        type: "polygon",
        x: 0,
        y: 0,
        points: points,
        fill: "rgba(255, 224, 224, 0.3)",
        stroke: isNearFirstPoint({
          x: points[points.length - 2],
          y: points[points.length - 1],
        })
          ? "#00ff00"
          : "#ff0000",
        strokeWidth: 2,
        closed: !isMoving && points.length >= 6,
      });
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length >= 3) {
      const polygonShape: ShapeWithoutMeta = {
        type: "polygon" as const,
        x: 0,
        y: 0,
        points: polygonPoints,
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
