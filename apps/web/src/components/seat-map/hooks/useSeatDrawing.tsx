import { useState, useCallback, useEffect } from "react";
import { SeatShape, AreaConfig } from "@/types/seat-map-types";
import { useAreaZoom } from "./useAreaZoom";

type SeatDrawingMode = "grid" | "row" | null;

export const useSeatDrawing = () => {
  const [drawingMode, setDrawingMode] = useState<SeatDrawingMode>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [secondPoint, setSecondPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [previewSeats, setPreviewSeats] = useState<SeatShape[]>([]);

  const [areaConfig, setAreaConfig] = useState<AreaConfig>({
    defaultSeatRadius: 8,
    defaultSeatSpacing: 20,
    defaultRowSpacing: 30,
    startingRowLabel: "A",
    startingSeatNumber: 1,
    defaultSeatCategory: "standard",
    defaultPrice: 50,
  });
  const areaZoom = useAreaZoom();

  useEffect(() => {
    if (areaZoom.zoomedArea) {
      setAreaConfig((prevConfig) => ({
        ...prevConfig,
        defaultSeatRadius:
          areaZoom.zoomedArea!.defaultSeatRadius ||
          prevConfig.defaultSeatRadius,
        defaultSeatSpacing:
          areaZoom.zoomedArea!.defaultSeatSpacing ||
          prevConfig.defaultSeatSpacing,
        defaultRowSpacing:
          areaZoom.zoomedArea!.defaultRowSpacing ||
          prevConfig.defaultRowSpacing,
        defaultSeatCategory:
          areaZoom.zoomedArea!.defaultSeatCategory ||
          prevConfig.defaultSeatCategory,
        defaultPrice:
          areaZoom.zoomedArea!.defaultPrice || prevConfig.defaultPrice,
      }));
    }
  }, [
    areaZoom.zoomedArea?.defaultSeatRadius,
    areaZoom.zoomedArea?.defaultSeatSpacing,
    areaZoom.zoomedArea?.defaultRowSpacing,
    areaZoom.zoomedArea?.defaultSeatCategory,
    areaZoom.zoomedArea?.defaultPrice,
    areaZoom.zoomedArea?.defaultSeatColor,
  ]);

  const startSeatDrawing = useCallback(
    (canvasCoords: { x: number; y: number }, mode: SeatDrawingMode) => {
      setDrawingMode(mode);

      if (mode === "grid") {
        if (clickCount === 0) {
          setIsDrawing(true);
          setStartPoint(canvasCoords);
          setClickCount(1);
        } else if (clickCount === 1) {
          setSecondPoint(canvasCoords);
          setClickCount(2);
        }
      } else if (mode === "row") {
        setIsDrawing(true);
        setStartPoint(canvasCoords);
        setClickCount(1);
      }
    },
    [clickCount]
  );

  const updateSeatPreview = useCallback(
    (canvasCoords: { x: number; y: number }) => {
      if (!isDrawing || !startPoint) return;

      setCurrentPoint(canvasCoords);

      if (drawingMode === "grid" && clickCount === 2 && secondPoint) {
        const { seats } = generateSeatGrid(
          startPoint,
          secondPoint,
          canvasCoords
        );
        setPreviewSeats(seats);
      } else if (drawingMode === "grid" && clickCount === 1) {
        const { seats } = generateSeatRow(startPoint, canvasCoords);
        setPreviewSeats(seats);
      } else if (drawingMode === "row" && clickCount === 1) {
        const { seats } = generateSeatRow(startPoint, canvasCoords);
        setPreviewSeats(seats);
      }
    },
    [isDrawing, startPoint, secondPoint, drawingMode, clickCount]
  );

  const finishSeatDrawing = useCallback(
    (callback: (data: any) => void) => {
      if (previewSeats.length > 0) {
        if (
          drawingMode === "grid" &&
          secondPoint &&
          startPoint &&
          currentPoint
        ) {
          const { seats, rowRotations } = generateSeatGrid(
            startPoint,
            secondPoint,
            currentPoint
          );

          const seatsGroupedByRow: {
            [rowName: string]: {
              seats: SeatShape[];
              rotation: number;
            };
          } = {};

          seats.forEach((seat) => {
            const rowName = seat.row;
            if (!seatsGroupedByRow[rowName]) {
              seatsGroupedByRow[rowName] = {
                seats: [],
                rotation: rowRotations[rowName] || 0,
              };
            }
            seatsGroupedByRow[rowName].seats.push(seat);
          });

          callback(seatsGroupedByRow);
        } else if (drawingMode === "row" && startPoint && currentPoint) {
          const { seats, rotation } = generateSeatRow(startPoint, currentPoint);

          callback({ seats, rotation });
        }
      }

      setIsDrawing(false);
      setClickCount(0);
      setStartPoint(null);
      setSecondPoint(null);
      setCurrentPoint(null);
      setPreviewSeats([]);
      setDrawingMode(null);
    },
    [previewSeats, drawingMode, startPoint, secondPoint, currentPoint]
  );

  const cancelSeatDrawing = useCallback(() => {
    setIsDrawing(false);
    setClickCount(0);
    setStartPoint(null);
    setSecondPoint(null);
    setCurrentPoint(null);
    setPreviewSeats([]);
    setDrawingMode(null);
  }, []);

  const generateSeatGrid = useCallback(
    (
      start: { x: number; y: number },
      second: { x: number; y: number },
      end: { x: number; y: number }
    ): { seats: SeatShape[]; rowRotations: Record<string, number> } => {
      const seats: SeatShape[] = [];
      const rowRotations: Record<string, number> = {};

      const defaultRadius =
        areaZoom.zoomedArea?.defaultSeatRadius || areaConfig.defaultSeatRadius;
      const defaultSpacing =
        areaZoom.zoomedArea?.defaultSeatSpacing ||
        areaConfig.defaultSeatSpacing;
      const defaultRowSpacing =
        areaZoom.zoomedArea?.defaultRowSpacing || areaConfig.defaultRowSpacing;
      const defaultPrice =
        areaZoom.zoomedArea?.defaultPrice || areaConfig.defaultPrice;
      const defaultCategory =
        areaZoom.zoomedArea?.defaultSeatCategory ||
        areaConfig.defaultSeatCategory;
      const defaultColor =
        areaZoom.zoomedArea?.defaultSeatColor ||
        getSeatCategoryColor(defaultCategory);

      const { startingRowLabel, startingSeatNumber } = areaConfig;

      const polygonCenter = areaZoom.zoomedArea?.center || { x: 0, y: 0 };

      const rowDirection = {
        x: second.x - start.x,
        y: second.y - start.y,
      };
      const colDirection = {
        x: end.x - start.x,
        y: end.y - start.y,
      };

      const rowLength = Math.sqrt(rowDirection.x ** 2 + rowDirection.y ** 2);
      const colLength = Math.sqrt(colDirection.x ** 2 + colDirection.y ** 2);

      const rowCount = Math.max(1, Math.floor(colLength / defaultRowSpacing));
      const colCount = Math.max(1, Math.floor(rowLength / defaultSpacing));

      const rowUnit = {
        x: rowDirection.x / rowLength,
        y: rowDirection.y / rowLength,
      };
      const colUnit = {
        x: colDirection.x / colLength,
        y: colDirection.y / colLength,
      };

      const rowRotationDegrees = Math.round(
        (Math.atan2(rowDirection.y, rowDirection.x) * 180) / Math.PI
      );

      for (let row = 0; row < rowCount; row++) {
        const currentRowLabel = String.fromCharCode(
          startingRowLabel.charCodeAt(0) + row
        );

        rowRotations[currentRowLabel] = rowRotationDegrees;

        for (let col = 0; col < colCount; col++) {
          const absoluteX =
            start.x +
            rowUnit.x * col * defaultSpacing +
            colUnit.x * row * defaultRowSpacing;
          const absoluteY =
            start.y +
            rowUnit.y * col * defaultSpacing +
            colUnit.y * row * defaultRowSpacing;

          const relativeX = absoluteX - polygonCenter.x;
          const relativeY = absoluteY - polygonCenter.y;

          seats.push({
            type: "seat" as const,
            id: `temp-${row}-${col}`,
            x: relativeX,
            y: relativeY,
            radius: defaultRadius,
            fill: defaultColor,
            stroke: "#2E7D32",
            strokeWidth: 1,
            number: col + startingSeatNumber,
            row: currentRowLabel,
            category: defaultCategory,
            status: "available",
            price: defaultPrice,
            visible: true,
          });
        }
      }

      return { seats, rowRotations };
    },
    [areaConfig, areaZoom.zoomedArea]
  );

  const generateSeatRow = useCallback(
    (
      start: { x: number; y: number },
      end: { x: number; y: number }
    ): { seats: SeatShape[]; rotation: number } => {
      const seats: SeatShape[] = [];

      const defaultRadius =
        areaZoom.zoomedArea?.defaultSeatRadius || areaConfig.defaultSeatRadius;
      const defaultSpacing =
        areaZoom.zoomedArea?.defaultSeatSpacing ||
        areaConfig.defaultSeatSpacing;
      const defaultPrice =
        areaZoom.zoomedArea?.defaultPrice || areaConfig.defaultPrice;
      const defaultCategory =
        areaZoom.zoomedArea?.defaultSeatCategory ||
        areaConfig.defaultSeatCategory;
      const defaultColor =
        areaZoom.zoomedArea?.defaultSeatColor ||
        getSeatCategoryColor(defaultCategory);

      const { startingRowLabel, startingSeatNumber } = areaConfig;

      const polygonCenter = areaZoom.zoomedArea?.center || { x: 0, y: 0 };

      const direction = { x: end.x - start.x, y: end.y - start.y };
      const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
      const seatCount = Math.max(1, Math.floor(length / defaultSpacing));

      const unit = { x: direction.x / length, y: direction.y / length };

      const rowRotationDegrees = Math.round(
        (Math.atan2(direction.y, direction.x) * 180) / Math.PI
      );

      for (let i = 0; i < seatCount; i++) {
        const absoluteX = start.x + unit.x * i * defaultSpacing;
        const absoluteY = start.y + unit.y * i * defaultSpacing;

        const relativeX = absoluteX - polygonCenter.x;
        const relativeY = absoluteY - polygonCenter.y;

        seats.push({
          type: "seat" as const,
          id: `temp-row-${i}`,
          x: relativeX,
          y: relativeY,
          radius: defaultRadius,
          fill: defaultColor,
          stroke: "#2E7D32",
          strokeWidth: 1,
          number: i + startingSeatNumber,
          row: startingRowLabel,
          category: defaultCategory,
          status: "available",
          price: defaultPrice,
          visible: true,
        });
      }

      return { seats, rotation: rowRotationDegrees };
    },
    [areaConfig, areaZoom.zoomedArea]
  );

  const getSeatCategoryColor = useCallback((category: string) => {
    switch (category) {
      case "premium":
        return "#FFD700";
      case "accessible":
        return "#4A90E2";
      case "restricted":
        return "#FF6B6B";
      default:
        return "#4CAF50";
    }
  }, []);

  return {
    drawingMode,
    isDrawing,
    clickCount,
    previewSeats,
    areaConfig,
    startSeatDrawing,
    updateSeatPreview,
    finishSeatDrawing,
    cancelSeatDrawing,
    setDrawingMode,
    setAreaConfig,
    getSeatCategoryColor,
  };
};
