// Create: utils/area-renderer.tsx
import { Group, Circle, Line, Text } from "react-konva";
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
}

export const renderAreaContent = ({
  rows,
  selectedRowIds,
  selectedSeatIds,
  onRowClick,
  onSeatClick,
  onRowDoubleClick,
  onSeatDoubleClick,
}: AreaRenderProps) => {
  const elements: JSX.Element[] = [];

  rows.forEach((row) => {
    // Render row line (visual guide)
    if (row.seats.length > 1) {
      const firstSeat = row.seats[0];
      const lastSeat = row.seats[row.seats.length - 1];

      elements.push(
        <Line
          key={`row-line-${row.id}`}
          points={[firstSeat.x, firstSeat.y, lastSeat.x, lastSeat.y]}
          stroke={
            selectedRowIds.includes(row.id)
              ? "#FF6B6B"
              : row.stroke || "#666666"
          }
          strokeWidth={
            (row.strokeWidth || 1) + (selectedRowIds.includes(row.id) ? 1 : 0)
          }
          dash={[5, 5]}
          opacity={0.5}
          listening={true}
          onClick={(e) => {
            e.cancelBubble = true;
            onRowClick?.(row.id, e);
          }}
          onDblClick={(e) => {
            e.cancelBubble = true;
            onRowDoubleClick?.(row.id, e);
          }}
        />
      );
    }

    // Render row label
    if (row.seats.length > 0) {
      const firstSeat = row.seats[0];
      elements.push(
        <Text
          key={`row-label-${row.id}`}
          x={firstSeat.x - 25}
          y={firstSeat.y - 5}
          text={row.name}
          fontSize={12}
          fontFamily="Arial"
          fill={selectedRowIds.includes(row.id) ? "#FF6B6B" : "#000000"}
          fontStyle={selectedRowIds.includes(row.id) ? "bold" : "normal"}
          listening={false}
        />
      );
    }

    // Render seats
    row.seats.forEach((seat) => {
      const isSelected = selectedSeatIds.includes(seat.id);

      elements.push(
        <Group key={`seat-${seat.id}`}>
          {/* Seat circle */}
          <Circle
            x={seat.x}
            y={seat.y}
            radius={seat.radius}
            fill={seat.fill || getSeatStatusColor(seat.status, seat.category)}
            stroke={isSelected ? "#FF6B6B" : seat.stroke || "#2E7D32"}
            strokeWidth={(seat.strokeWidth || 1) + (isSelected ? 2 : 0)}
            listening={true}
            onClick={(e) => {
              e.cancelBubble = true;
              onSeatClick?.(seat.id, e);
            }}
            onDblClick={(e) => {
              e.cancelBubble = true;
              onSeatDoubleClick?.(seat.id, e);
            }}
          />

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
            listening={false}
          />

          {/* Status indicator */}
          {seat.status !== "available" && (
            <Circle
              x={seat.x + seat.radius - 3}
              y={seat.y - seat.radius + 3}
              radius={2}
              fill={getStatusIndicatorColor(seat.status)}
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
