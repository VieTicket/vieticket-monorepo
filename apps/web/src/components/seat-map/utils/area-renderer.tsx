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
  onRowDragStart?: (rowId: string, e: any) => void;
  onRowDragMove?: (rowId: string, e: any) => void;
  onRowDragEnd?: (rowId: string, e: any) => void;
  onSeatDragStart?: (seatId: string, e: any) => void;
  onSeatDragMove?: (seatId: string, e: any) => void;
  onSeatDragEnd?: (seatId: string, e: any) => void;
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
  onRowDragStart,
  onRowDragMove,
  onRowDragEnd,
  onSeatDragStart,
  onSeatDragMove,
  onSeatDragEnd,
  isInteractive = true,
}: AreaRenderProps) => {
  const elements: JSX.Element[] = [];

  rows.forEach((row) => {
    const isRowSelected = selectedRowIds.includes(row.id);
    const rowElements: JSX.Element[] = [];

    if (row.seats.length > 0) {
      const firstSeat = row.seats[0];

      const labelX = firstSeat.x - (row.startX || 0) - 20 - row.name.length * 4;
      const labelY = firstSeat.y - (row.startY || 0) - 5;

      rowElements.push(
        <Text
          key={`row-label-${row.id}`}
          x={labelX}
          y={labelY}
          text={row.name}
          fontSize={12}
          fontFamily="Arial"
          fill={isRowSelected ? "#FF6B6B" : "#000000"}
          fontStyle={"normal"}
          opacity={isInteractive ? 1 : 0.6}
          listening={false}
        />
      );
    }

    console.log(row);
    row.seats.forEach((seat) => {
      const isSeatSelected = selectedSeatIds.includes(seat.id);

      const seatX = seat.x - (row.startX || 0);
      const seatY = seat.y - (row.startY || 0);

      // FIX: Use seat radius with fallback to row's seatRadius
      const seatRadius = seat.radius || row.seatRadius || 8;

      rowElements.push(
        <Group key={`seat-group-${seat.id}`}>
          <Circle
            id={`seat-${seat.id}`}
            x={seatX}
            y={seatY}
            radius={seatRadius} // FIX: Use the calculated radius
            fill={seat.fill || getSeatStatusColor(seat.status, seat.category)}
            stroke={
              isSeatSelected
                ? "#FF6B6B"
                : isRowSelected
                  ? "#FFA500"
                  : seat.stroke || "#2E7D32"
            }
            strokeWidth={
              (seat.strokeWidth || 1) +
              (isSeatSelected ? 3 : isRowSelected ? 2 : 0)
            }
            opacity={isInteractive ? 1 : 0.6}
            listening={isInteractive}
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
            draggable={false}
          />

          {isSeatSelected && (
            <Circle
              x={seatX + seatRadius - 2} // FIX: Use calculated radius
              y={seatY - seatRadius + 2} // FIX: Use calculated radius
              radius={3}
              fill="#FF6B6B"
              stroke="#FFFFFF"
              strokeWidth={1}
              opacity={0.9}
              listening={false}
            />
          )}

          <Text
            x={seatX}
            y={seatY}
            text={seat.number.toString()}
            fontSize={Math.min(8, seatRadius / 1.1)} // FIX: Scale font size with radius
            fontFamily="Arial"
            fill="white"
            align="center"
            verticalAlign="middle"
            offsetX={seat.number.toString().length * 2}
            offsetY={seatRadius / 2}
            opacity={isInteractive ? 1 : 0.6}
            listening={false}
          />

          {seat.status !== "available" && (
            <Circle
              x={seatX + seatRadius - 3} // FIX: Use calculated radius
              y={seatY - seatRadius + 3} // FIX: Use calculated radius
              radius={2}
              fill={getStatusIndicatorColor(seat.status)}
              opacity={isInteractive ? 1 : 0.6}
              listening={false}
            />
          )}
        </Group>
      );
    });

    elements.push(
      <Group
        key={`row-${row.id}`}
        id={`row-${row.id}`}
        x={row.startX || 0}
        y={row.startY || 0}
        // FIX: Apply rotation to the entire row group
        rotation={row.rotation || 0}
        draggable={isInteractive}
        listening={isInteractive}
        onClick={
          isInteractive
            ? (e) => {
                if (e.target === e.currentTarget) {
                  e.cancelBubble = true;
                  onRowClick?.(row.id, e);
                }
              }
            : undefined
        }
        onDblClick={
          isInteractive
            ? (e) => {
                if (e.target === e.currentTarget) {
                  e.cancelBubble = true;
                  onRowDoubleClick?.(row.id, e);
                }
              }
            : undefined
        }
        onDragStart={
          isInteractive
            ? (e) => {
                onRowDragStart?.(row.id, e);
              }
            : undefined
        }
        onDragMove={
          isInteractive
            ? (e) => {
                onRowDragMove?.(row.id, e);
              }
            : undefined
        }
        onDragEnd={
          isInteractive
            ? (e) => {
                onRowDragEnd?.(row.id, e);
              }
            : undefined
        }
      >
        {rowElements}
      </Group>
    );
  });

  return elements;
};

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
