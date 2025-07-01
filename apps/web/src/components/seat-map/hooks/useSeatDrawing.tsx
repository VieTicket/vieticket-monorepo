// Create: hooks/useSeatDrawing.tsx
import { useState, useCallback } from "react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { SeatShape, AreaConfig } from "@/types/seat-map-types"; // Changed from AreaShape to SeatShape
import { v4 as uuidv4 } from "uuid";

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
  const [previewSeats, setPreviewSeats] = useState<SeatShape[]>([]); // Changed to SeatShape[]

  // Area configuration for seats
  const [areaConfig, setAreaConfig] = useState<AreaConfig>({
    defaultSeatRadius: 20, // Updated property names
    defaultSeatSpacing: 25,
    defaultRowSpacing: 30,
    startingRowLabel: "A",
    startingSeatNumber: 1,
    defaultSeatCategory: "standard",
    defaultPrice: 50,
  });

  const { saveToHistory } = useCanvasStore();

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
      } else if (drawingMode === "row" && clickCount === 1) {
        const seats = generateSeatRow(startPoint, canvasCoords);
        setPreviewSeats(seats);
      }
    },
    [isDrawing, startPoint, secondPoint, drawingMode, clickCount, areaConfig]
  );

  // FIXED: Updated function signature
  const finishSeatDrawing = useCallback(
    (addSeatToRow: (rowId: string, seat: Omit<SeatShape, "id">) => void) => {
      if (previewSeats.length > 0) {
        // Group seats by row and add them
        const seatsByRow = previewSeats.reduce(
          (acc, seat) => {
            if (!acc[seat.row]) {
              acc[seat.row] = [];
            }
            acc[seat.row].push(seat);
            return acc;
          },
          {} as Record<string, SeatShape[]>
        );

        // Add seats to their respective rows
        Object.entries(seatsByRow).forEach(([rowId, seats]) => {
          seats.forEach((seat) => {
            const { id, ...seatWithoutId } = seat;
            addSeatToRow(rowId, seatWithoutId);
          });
        });

        saveToHistory();
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
    [previewSeats, saveToHistory]
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
      const {
        defaultSeatRadius,
        defaultSeatSpacing,
        defaultRowSpacing,
        startingRowLabel,
        startingSeatNumber,
        defaultSeatCategory,
        defaultPrice,
      } = areaConfig;

      // Calculate grid dimensions
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
      const colCount = Math.max(1, Math.floor(rowLength / defaultSeatSpacing));

      // Normalize directions
      const rowUnit = {
        x: rowDirection.x / rowLength,
        y: rowDirection.y / rowLength,
      };
      const colUnit = {
        x: colDirection.x / colLength,
        y: colDirection.y / colLength,
      };

      for (let row = 0; row < rowCount; row++) {
        const currentRowLabel = String.fromCharCode(
          startingRowLabel.charCodeAt(0) + row
        );

        for (let col = 0; col < colCount; col++) {
          const x =
            start.x +
            rowUnit.x * col * defaultSeatSpacing +
            colUnit.x * row * defaultRowSpacing;
          const y =
            start.y +
            rowUnit.y * col * defaultSeatSpacing +
            colUnit.y * row * defaultRowSpacing;

          seats.push({
            type: "seat" as const,
            id: `temp-${row}-${col}`,
            x: x - defaultSeatRadius / 2,
            y: y - defaultSeatRadius / 2,
            radius: defaultSeatRadius / 2,
            fill: getSeatCategoryColor(defaultSeatCategory),
            stroke: "#2E7D32",
            strokeWidth: 1,
            // FIXED: Use correct property names
            number: col + startingSeatNumber,
            row: currentRowLabel, // Changed from rowId to row
            category: defaultSeatCategory,
            status: "available", // Changed from seatStatus to status
            price: defaultPrice,
            visible: true,
          });
        }
      }

      return seats;
    },
    [areaConfig]
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

      const direction = { x: end.x - start.x, y: end.y - start.y };
      const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
      const seatCount = Math.max(1, Math.floor(length / defaultSeatSpacing));

      const unit = { x: direction.x / length, y: direction.y / length };

      for (let i = 0; i < seatCount; i++) {
        const x = start.x + unit.x * i * defaultSeatSpacing;
        const y = start.y + unit.y * i * defaultSeatSpacing;

        seats.push({
          type: "seat" as const,
          id: `temp-row-${i}`,
          x: x - defaultSeatRadius / 2,
          y: y - defaultSeatRadius / 2,
          radius: defaultSeatRadius / 2,
          fill: getSeatCategoryColor(defaultSeatCategory),
          stroke: "#2E7D32",
          strokeWidth: 1,
          // FIXED: Use correct property names
          number: i + startingSeatNumber,
          row: startingRowLabel, // Changed from rowId to row
          category: defaultSeatCategory,
          status: "available", // Changed from seatStatus to status
          price: defaultPrice,
          visible: true,
        });
      }

      return seats;
    },
    [areaConfig]
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
