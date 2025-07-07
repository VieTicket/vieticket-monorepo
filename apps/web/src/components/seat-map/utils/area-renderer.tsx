// Create: utils/area-renderer.tsx
import { Group, Circle, Line, Text, Rect } from "react-konva";
import { RowShape, SeatShape } from "@/types/seat-map-types";
import { JSX } from "react";

export interface AreaRenderProps {
  rows: RowShape[];
  selectedRowIds: string[];
  selectedSeatIds: string[];
  onRowClick?: (rowId: string, e: any) => void;
  onSeatClick?: (seatId: string, e: any) => void;
  onRowDoubleClick?: (rowId: string, e: any) => void;
  onSeatDoubleClick?: (seatId: string, e: any) => void;
  // FIX: Add interactive state control
  isInteractive?: boolean;
}

export const renderAreaContent = ({
  rows,
  selectedRowIds,
  selectedSeatIds,
  onRowClick,
  onSeatClick,
  onRowDoubleClick,
  onSeatDoubleClick,
  isInteractive = true,
}: AreaRenderProps) => {
  const elements: JSX.Element[] = [];

  rows.forEach((row) => {
    // Render row label - FIX: Make it more prominent when row is selected
    if (row.seats.length > 0) {
      const firstSeat = row.seats[0];
      const isRowSelected = selectedRowIds.includes(row.id);

      elements.push(
        <Group key={`row-label-group-${row.id}`}>
          <Text
            key={`row-label-${row.id}`}
            x={firstSeat.x - 25}
            y={firstSeat.y - 5}
            text={row.name}
            fontSize={isRowSelected ? 14 : 12}
            fontFamily="Arial"
            fill={isRowSelected ? "#FF6B6B" : "#000000"}
            fontStyle={isRowSelected ? "bold" : "normal"}
            opacity={isInteractive ? 1 : 0.6}
            // FIX: Make row label clickable
            listening={isInteractive}
            onClick={
              isInteractive
                ? (e) => {
                    e.cancelBubble = true;
                    onRowClick?.(row.id, e);
                  }
                : undefined
            }
            onDblClick={
              isInteractive
                ? (e) => {
                    e.cancelBubble = true;
                    onRowDoubleClick?.(row.id, e);
                  }
                : undefined
            }
          />
        </Group>
      );
    }

    // Render seats - FIX: Better multi-select visual feedback
    row.seats.forEach((seat) => {
      const isSeatSelected = selectedSeatIds.includes(seat.id);
      const isRowSelected = selectedRowIds.includes(row.id);

      elements.push(
        <Group key={`seat-${seat.id}`}>
          {/* Seat circle */}
          <Circle
            x={seat.x}
            y={seat.y}
            radius={seat.radius}
            fill={seat.fill || getSeatStatusColor(seat.status, seat.category)}
            stroke={
              isSeatSelected
                ? "#FF6B6B" // Red for selected seat
                : isRowSelected
                  ? "#FFA500" // Orange for selected row
                  : seat.stroke || "#2E7D32"
            }
            strokeWidth={
              (seat.strokeWidth || 1) +
              (isSeatSelected ? 3 : isRowSelected ? 2 : 0)
            }
            opacity={isInteractive ? 1 : 0.6}
            listening={isInteractive}
            // FIX: Single click selects row, double click selects seat
            onClick={
              isInteractive
                ? (e) => {
                    e.cancelBubble = true;
                    onSeatClick?.(seat.id, e);
                  }
                : undefined
            }
            onDblClick={
              isInteractive
                ? (e) => {
                    e.cancelBubble = true;
                    onSeatDoubleClick?.(seat.id, e);
                  }
                : undefined
            }
          />

          {/* FIX: Add multi-select indicator */}
          {isSeatSelected && (
            <Circle
              x={seat.x + seat.radius - 2}
              y={seat.y - seat.radius + 2}
              radius={3}
              fill="#FF6B6B"
              stroke="#FFFFFF"
              strokeWidth={1}
              opacity={0.9}
              listening={false}
            />
          )}

          {/* Seat number */}
          <Text
            x={seat.x}
            y={seat.y}
            text={seat.number.toString()}
            fontSize={8}
            fontFamily="Arial"
            fill="white"
            align="center"
            verticalAlign="middle"
            offsetX={seat.number.toString().length * 2}
            offsetY={4}
            opacity={isInteractive ? 1 : 0.6}
            listening={false}
          />

          {/* Status indicator */}
          {seat.status !== "available" && (
            <Circle
              x={seat.x + seat.radius - 3}
              y={seat.y - seat.radius + 3}
              radius={2}
              fill={getStatusIndicatorColor(seat.status)}
              opacity={isInteractive ? 1 : 0.6}
              listening={false}
            />
          )}
        </Group>
      );
    });
  });

  return elements;
};

// Helper functions
const getSeatStatusColor = (status: string, category?: string) => {
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

const getStatusIndicatorColor = (status: string) => {
  switch (status) {
    case "sold":
      return "#FFFFFF";
    case "reserved":
      return "#FFFF00";
    case "blocked":
      return "#000000";
    default:
      return "#FFFFFF";
  }
};
