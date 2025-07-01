// Create: hooks/useRowDrawing.tsx
import { useState, useCallback } from "react";
import { RowShape, SeatShape, AreaConfig } from "@/types/seat-map-types";
// import { useAreaActions } from "@/components/seat-map/store/main-store";

export const useRowDrawing = () => {
  //   const { addRowToArea } = useAreaActions();
  //   const [isDrawingRow, setIsDrawingRow] = useState(false);
  //   const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
  //     null
  //   );
  //   const [currentPoint, setCurrentPoint] = useState<{
  //     x: number;
  //     y: number;
  //   } | null>(null);
  //   const [previewRow, setPreviewRow] = useState<{
  //     row: RowShape;
  //     seats: SeatShape[];
  //   } | null>(null);
  //   const [config, setConfig] = useState<AreaConfig>({
  //     defaultSeatRadius: 8,
  //     defaultSeatSpacing: 20,
  //     defaultRowSpacing: 30,
  //     startingRowLabel: "A",
  //     startingSeatNumber: 1,
  //     defaultSeatCategory: "standard",
  //     defaultPrice: 50,
  //   });
  //   const startRowDrawing = useCallback(
  //     (canvasCoords: { x: number; y: number }) => {
  //       setIsDrawingRow(true);
  //       setStartPoint(canvasCoords);
  //       setCurrentPoint(canvasCoords);
  //     },
  //     []
  //   );
  //   const updateRowPreview = useCallback(
  //     (canvasCoords: { x: number; y: number }) => {
  //       if (!isDrawingRow || !startPoint) return;
  //       setCurrentPoint(canvasCoords);
  //       // Calculate row direction and length
  //       const direction = {
  //         x: canvasCoords.x - startPoint.x,
  //         y: canvasCoords.y - startPoint.y,
  //       };
  //       const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
  //       const rotation = Math.atan2(direction.y, direction.x) * (180 / Math.PI);
  //       if (length < 10) return; // Minimum length
  //       // Calculate number of seats
  //       const seatCount = Math.max(
  //         1,
  //         Math.floor(length / config.defaultSeatSpacing)
  //       );
  //       // Create preview row
  //       const rowName = `Row-${config.startingRowLabel}`;
  //       const row: RowShape = {
  //         id: "preview-row",
  //         type: "row",
  //         name: rowName,
  //         startX: startPoint.x,
  //         startY: startPoint.y,
  //         seatRadius: config.defaultSeatRadius,
  //         seatSpacing: config.defaultSeatSpacing,
  //         rotation: rotation,
  //         area: "",
  //         seats: [],
  //         fill: "#e0e0e0",
  //         stroke: "#666666",
  //         strokeWidth: 1,
  //         visible: true,
  //       };
  //       // Generate preview seats
  //       const seats: SeatShape[] = [];
  //       const unitVector = {
  //         x: direction.x / length,
  //         y: direction.y / length,
  //       };
  //       for (let i = 0; i < seatCount; i++) {
  //         const seatX =
  //           startPoint.x + unitVector.x * i * config.defaultSeatSpacing;
  //         const seatY =
  //           startPoint.y + unitVector.y * i * config.defaultSeatSpacing;
  //         seats.push({
  //           id: `preview-seat-${i}`,
  //           type: "seat",
  //           row: rowName,
  //           number: i + config.startingSeatNumber,
  //           x: seatX,
  //           y: seatY,
  //           radius: config.defaultSeatRadius,
  //           status: "available",
  //           category: config.defaultSeatCategory,
  //           price: config.defaultPrice,
  //           fill: getSeatStatusColor("available", config.defaultSeatCategory),
  //           stroke: "#2E7D32",
  //           strokeWidth: 1,
  //           visible: true,
  //         });
  //       }
  //       setPreviewRow({ row, seats });
  //     },
  //     [isDrawingRow, startPoint, config]
  //   );
  //   const finishRowDrawing = useCallback(() => {
  //     if (!previewRow) return;
  //     // Create final row with real IDs - use store action
  //     const finalRow: Omit<RowShape, "id"> = {
  //       ...previewRow.row,
  //       seats: previewRow.seats.map((seat) => ({
  //         ...seat,
  //         id: `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //       })),
  //     };
  //     addRowToArea(finalRow);
  //     // Reset state
  //     setIsDrawingRow(false);
  //     setStartPoint(null);
  //     setCurrentPoint(null);
  //     setPreviewRow(null);
  //   }, [previewRow, addRowToArea]);
  //   const cancelRowDrawing = useCallback(() => {
  //     setIsDrawingRow(false);
  //     setStartPoint(null);
  //     setCurrentPoint(null);
  //     setPreviewRow(null);
  //   }, []);
  //   return {
  //     isDrawingRow,
  //     previewRow,
  //     config,
  //     setConfig,
  //     startRowDrawing,
  //     updateRowPreview,
  //     finishRowDrawing,
  //     cancelRowDrawing,
  //   };
};

// Helper function for seat colors
const getSeatStatusColor = (status: string, category: string) => {
  if (status !== "available") {
    switch (status) {
      case "sold":
        return "#FF0000";
      case "reserved":
        return "#FFA500";
      case "blocked":
        return "#808080";
      default:
        return "#00FF00";
    }
  }

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
};
