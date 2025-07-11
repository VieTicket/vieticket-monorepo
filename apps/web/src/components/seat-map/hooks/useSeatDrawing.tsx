import { useState, useCallback } from "react";
import {
  useAreaActions,
  useCanvasStore,
} from "@/components/seat-map/store/main-store";
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
    defaultSeatSpacing: 25,
    defaultRowSpacing: 30,
    startingRowLabel: "A",
    startingSeatNumber: 1,
    defaultSeatCategory: "standard",
    defaultPrice: 50,
  });

  const { saveToHistory } = useCanvasStore();
  const areaZoom = useAreaZoom();

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
        const seats = generateSeatGrid(startPoint, secondPoint, canvasCoords);
        setPreviewSeats(seats);
      } else if (drawingMode === "grid" && clickCount === 1) {
        const seats = generateSeatRow(startPoint, canvasCoords);
        setPreviewSeats(seats);
      } else if (drawingMode === "row" && clickCount === 1) {
        const seats = generateSeatRow(startPoint, canvasCoords);
        setPreviewSeats(seats);
      }
    },
    [isDrawing, startPoint, secondPoint, drawingMode, clickCount, areaConfig]
  );

  const finishSeatDrawing = useCallback(
    (callback: (data: any) => void) => {
      if (previewSeats.length > 0) {
        if (drawingMode === "grid") {
          // FIX: Group seats by row name for grid mode
          const seatsGroupedByRow: { [rowName: string]: SeatShape[] } = {};

          previewSeats.forEach((seat) => {
            const rowName = seat.row;
            if (!seatsGroupedByRow[rowName]) {
              seatsGroupedByRow[rowName] = [];
            }
            seatsGroupedByRow[rowName].push(seat);
          });

          // Call the callback with grouped seats
          callback(seatsGroupedByRow);
        } else if (drawingMode === "row") {
          // FIX: For row mode, pass the seats array directly

          callback(previewSeats);
        }
      }

      // Reset state
      setIsDrawing(false);
      setClickCount(0);
      setStartPoint(null);
      setSecondPoint(null);
      setCurrentPoint(null);
      setPreviewSeats([]);
      setDrawingMode(null);
    },
    [previewSeats, drawingMode, saveToHistory]
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
    ): SeatShape[] => {
      const seats: SeatShape[] = [];

      const defaultRadius =
        areaZoom.zoomedArea?.defaultSeatRadius || areaConfig.defaultSeatRadius;
      const defaultSpacing =
        areaZoom.zoomedArea?.defaultSeatSpacing ||
        areaConfig.defaultSeatSpacing;
      const defaultColor =
        areaZoom.zoomedArea?.defaultSeatColor ||
        getSeatCategoryColor(areaConfig.defaultSeatCategory);

      const {
        defaultRowSpacing,
        startingRowLabel,
        startingSeatNumber,
        defaultSeatCategory,
        defaultPrice,
      } = areaConfig;

      // NEW: Get polygon center for relative positioning
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

      // NEW: Create seats with positions relative to polygon center
      for (let row = 0; row < rowCount; row++) {
        const currentRowLabel = String.fromCharCode(
          startingRowLabel.charCodeAt(0) + row
        );

        for (let col = 0; col < colCount; col++) {
          // Calculate absolute position
          const absoluteX =
            start.x +
            rowUnit.x * col * defaultSpacing +
            colUnit.x * row * defaultRowSpacing;
          const absoluteY =
            start.y +
            rowUnit.y * col * defaultSpacing +
            colUnit.y * row * defaultRowSpacing;

          // NEW: Convert to relative position from polygon center
          const relativeX = absoluteX - polygonCenter.x;
          const relativeY = absoluteY - polygonCenter.y;

          seats.push({
            type: "seat" as const,
            id: `temp-${row}-${col}`, // Temporary ID, will be replaced
            x: relativeX, // NEW: Store relative position
            y: relativeY, // NEW: Store relative position
            radius: defaultRadius,
            fill: defaultColor,
            stroke: "#2E7D32",
            strokeWidth: 1,
            number: col + startingSeatNumber,
            row: currentRowLabel,
            category: defaultSeatCategory,
            status: "available",
            price: defaultPrice,
            visible: true,
          });
        }
      }

      return seats;
    },
    [areaConfig, areaZoom.zoomedArea]
  );

  const generateSeatRow = useCallback(
    (
      start: { x: number; y: number },
      end: { x: number; y: number }
    ): SeatShape[] => {
      const seats: SeatShape[] = [];
      const {
        defaultSeatRadius,
        defaultSeatSpacing,
        startingRowLabel,
        startingSeatNumber,
        defaultSeatCategory,
        defaultPrice,
      } = areaConfig;

      // NEW: Get polygon center for relative positioning
      const polygonCenter = areaZoom.zoomedArea?.center || { x: 0, y: 0 };

      const direction = { x: end.x - start.x, y: end.y - start.y };
      const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
      const seatCount = Math.max(1, Math.floor(length / defaultSeatSpacing));

      const unit = { x: direction.x / length, y: direction.y / length };

      for (let i = 0; i < seatCount; i++) {
        // Calculate absolute position
        const absoluteX = start.x + unit.x * i * defaultSeatSpacing;
        const absoluteY = start.y + unit.y * i * defaultSeatSpacing;

        // NEW: Convert to relative position from polygon center
        const relativeX = absoluteX - polygonCenter.x;
        const relativeY = absoluteY - polygonCenter.y;

        seats.push({
          type: "seat" as const,
          id: `temp-row-${i}`, // Temporary ID, will be replaced
          x: relativeX, // NEW: Store relative position
          y: relativeY, // NEW: Store relative position
          radius: defaultSeatRadius,
          fill: getSeatCategoryColor(defaultSeatCategory),
          stroke: "#2E7D32",
          strokeWidth: 1,
          number: i + startingSeatNumber,
          row: startingRowLabel,
          category: defaultSeatCategory,
          status: "available",
          price: defaultPrice,
          visible: true,
        });
      }

      return seats;
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
