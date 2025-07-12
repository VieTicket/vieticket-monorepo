import { useState, useCallback, useRef, useMemo } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { ShapeWithoutMeta, PolygonShape } from "@/types/seat-map-types";
import { calculatePolygonCenter } from "../../utils/polygon-utils";
import {
  isCursorCloseToPerpendicularLine,
  isCursorCloseToLine,
  extractLinesFromShapes,
  clearShapeLinesCache,
} from "../../utils/guide-lines";

// Throttle function to limit function calls
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  let lastResult: any;

  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  };
};

export const useAreaEvents = () => {
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [previewPolygonPoints, setPreviewPolygonPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [previewShape, setPreviewShape] = useState<any>(null);

  // New state for guide lines
  const [guideLines, setGuideLines] = useState<
    Array<{
      start: { x: number; y: number };
      end: { x: number; y: number };
      type: "horizontal" | "vertical" | "perpendicular" | "shape";
    }>
  >([]);

  const { addShape, saveToHistory, shapes } = useCanvasStore();

  // Cache shape lines extraction
  const shapeLines = useMemo(() => {
    // Exclude the preview shape
    const relevantShapes = shapes.filter((shape) => shape.id !== "preview");
    return extractLinesFromShapes(relevantShapes);
  }, [shapes]);

  // Reference to last mouse position to avoid redundant calculations
  const lastMousePosition = useRef({ x: 0, y: 0 });
  // Reference to last guide lines to avoid redundant state updates
  const lastGuideLines = useRef<any[]>([]);

  const isNearFirstPoint = (
    currentPoint: { x: number; y: number },
    threshold = 15
  ): boolean => {
    if (polygonPoints.length < 2) return false;

    const firstPoint = polygonPoints[0];
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - firstPoint.x, 2) +
        Math.pow(currentPoint.y - firstPoint.y, 2)
    );

    return distance <= threshold;
  };

  // Throttled calculation of guide lines
  const calculateGuideLines = useCallback(
    throttle(
      (
        cursorX: number,
        cursorY: number
      ): {
        x: number;
        y: number;
        guideLines: Array<{
          start: { x: number; y: number };
          end: { x: number; y: number };
          type: "horizontal" | "vertical" | "perpendicular" | "shape";
        }>;
      } => {
        // Skip if mouse hasn't moved significantly (0.5px threshold)
        if (
          Math.abs(lastMousePosition.current.x - cursorX) < 0.5 &&
          Math.abs(lastMousePosition.current.y - cursorY) < 0.5
        ) {
          return {
            x: lastMousePosition.current.x,
            y: lastMousePosition.current.y,
            guideLines: lastGuideLines.current,
          };
        }

        lastMousePosition.current = { x: cursorX, y: cursorY };

        let adjustedX = cursorX;
        let adjustedY = cursorY;
        const activeGuideLines: Array<{
          start: { x: number; y: number };
          end: { x: number; y: number };
          type: "horizontal" | "vertical" | "perpendicular" | "shape";
        }> = [];

        // Check alignment with existing polygon points - most likely match
        if (polygonPoints.length > 0) {
          // First check the most recent point (most likely match)
          const lastPoint = polygonPoints[polygonPoints.length - 1];
          let lineCheck = isCursorCloseToPerpendicularLine(
            adjustedX,
            adjustedY,
            lastPoint,
            10 // Threshold distance
          );

          if (lineCheck.isCloseToLine) {
            adjustedX = lineCheck.closestPoint.x;
            adjustedY = lineCheck.closestPoint.y;

            if (lineCheck.guideLine) {
              activeGuideLines.push({
                start: lineCheck.guideLine.start,
                end: lineCheck.guideLine.end,
                type: lineCheck.type,
              });
            }
          } else {
            // Check other points if no match with last point
            for (let i = 0; i < polygonPoints.length - 1; i++) {
              const point = polygonPoints[i];
              lineCheck = isCursorCloseToPerpendicularLine(
                adjustedX,
                adjustedY,
                point,
                10 // Threshold distance
              );

              if (lineCheck.isCloseToLine) {
                adjustedX = lineCheck.closestPoint.x;
                adjustedY = lineCheck.closestPoint.y;

                if (lineCheck.guideLine) {
                  activeGuideLines.push({
                    start: lineCheck.guideLine.start,
                    end: lineCheck.guideLine.end,
                    type: lineCheck.type,
                  });
                }

                // Found a match, no need to check further
                break;
              }
            }
          }
        }

        // If no point alignment, check shape lines (more expensive)
        if (activeGuideLines.length === 0) {
          // Limit checks to improve performance
          const maxShapeLinesToCheck = Math.min(shapeLines.length, 50);

          for (let i = 0; i < maxShapeLinesToCheck; i++) {
            const line = shapeLines[i];
            const lineCheck = isCursorCloseToLine(
              adjustedX,
              adjustedY,
              line,
              10 // Threshold distance
            );

            if (lineCheck.isCloseToLine) {
              adjustedX = lineCheck.closestPoint.x;
              adjustedY = lineCheck.closestPoint.y;

              if (lineCheck.guideLine) {
                activeGuideLines.push({
                  start: lineCheck.guideLine.start,
                  end: lineCheck.guideLine.end,
                  type: "shape",
                });

                // Found a match, no need to check further
                break;
              }
            }
          }
        }

        lastGuideLines.current = activeGuideLines;

        return {
          x: adjustedX,
          y: adjustedY,
          guideLines: activeGuideLines,
        };
      },
      16
    ), // ~60fps throttle rate
    [polygonPoints, shapeLines]
  );

  const handlePolygonMouseDown = useCallback(
    (canvasCoords: any, e: any) => {
      if (!isDrawingPolygon) {
        setIsDrawingPolygon(true);
        clearShapeLinesCache(); // Clear shape lines cache when starting new polygon
        const points = [{ x: canvasCoords.x, y: canvasCoords.y }];
        setPolygonPoints(points);
        setPreviewPolygonPoints(points);
        updatePreviewShape(points);
        setGuideLines([]);
      } else {
        // Use guide line adjustments when placing new points
        const {
          x,
          y,
          guideLines: guides,
        } = calculateGuideLines(canvasCoords.x, canvasCoords.y);

        if (isNearFirstPoint({ x, y })) {
          finishPolygon();
        } else {
          const newPoints = [...polygonPoints, { x, y }];
          setPolygonPoints(newPoints);
          setPreviewPolygonPoints(newPoints);
          updatePreviewShape(newPoints);
          setGuideLines(guides);
        }
      }
    },
    [isDrawingPolygon, polygonPoints, calculateGuideLines]
  );

  const handlePolygonMouseMove = useCallback(
    (canvasCoords: any) => {
      if (isDrawingPolygon && polygonPoints.length >= 1) {
        // Apply guide lines to adjust the preview point
        const {
          x,
          y,
          guideLines: guides,
        } = calculateGuideLines(canvasCoords.x, canvasCoords.y);

        const tempPoints = [...polygonPoints, { x, y }];
        setPreviewPolygonPoints(tempPoints);
        updatePreviewShape(tempPoints, true);

        // Only update guide lines if they've changed to avoid re-renders
        if (JSON.stringify(guides) !== JSON.stringify(guideLines)) {
          setGuideLines(guides);
        }
      }
    },
    [isDrawingPolygon, polygonPoints, calculateGuideLines, guideLines]
  );

  const updatePreviewShape = (
    points: { x: number; y: number }[],
    isMoving = false
  ) => {
    if (points.length >= 2) {
      setPreviewShape({
        type: "polygon",
        x: 0,
        y: 0,
        points: points,
        fill: "rgba(255, 224, 224, 0.3)",
        stroke: isNearFirstPoint({
          x: points[points.length - 1].x,
          y: points[points.length - 1].y,
        })
          ? "#00ff00"
          : "#ff0000",
        strokeWidth: 2,
        closed: !isMoving && points.length >= 3,
      });
    }
  };

  const finishPolygon = () => {
    if (polygonPoints.length >= 3) {
      const polygonShape: ShapeWithoutMeta = {
        type: "polygon" as const,
        x: 0,
        y: 0,
        center: calculatePolygonCenter(polygonPoints),
        points: polygonPoints,
        fill: "#ffffff",
        stroke: "#000000",
        defaultSeatRadius: 8,
        defaultSeatSpacing: 15,
        defaultRowSpacing: 25,
        defaultSeatCategory: "standard",
        defaultSeatColor: "#4CAF50",
        defaultPrice: 100,
        strokeWidth: 1,
        closed: true,
        rows: [],
      } satisfies Omit<PolygonShape, "id" | "visible" | "draggable">;

      addShape(polygonShape);
      saveToHistory();
      clearShapeLinesCache(); // Clear cache after adding new shape
    }

    resetPolygonState();
  };

  const resetPolygonState = () => {
    setIsDrawingPolygon(false);
    setPolygonPoints([]);
    setPreviewPolygonPoints([]);
    setPreviewShape(null);
    setGuideLines([]);
    lastMousePosition.current = { x: 0, y: 0 };
    lastGuideLines.current = [];
  };

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
    guideLines,
  };
};
