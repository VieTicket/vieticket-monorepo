import { Group, Circle, Line, Text, Rect } from "react-konva";
import { RowShape, SeatShape } from "@/types/seat-map-types";
import { JSX } from "react";

export interface AreaEventProps {
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
}

export interface AreaRenderProps {
  offSetX?: number;
  offSetY?: number;
  rows: RowShape[];
  selectedRowIds: string[];
  selectedSeatIds: string[];
  areaEvents?: AreaEventProps;
  isInteractive?: boolean;
  isCustomerView?: boolean;
}

export const renderAreaContent = ({
  rows,
  selectedRowIds = [],
  selectedSeatIds = [],
  areaEvents,
  isInteractive = true,
  isCustomerView = false,
}: AreaRenderProps) => {
  const elements: JSX.Element[] = [];

  rows.forEach((row) => {
    const isRowSelected = selectedRowIds.includes(row.id);
    const rowElements: JSX.Element[] = [];

    if (row.seats.length > 0) {
      var labelX = -20 - row.name.length * 4;
      var labelY = -5;
      if (row.rotation > 90) {
        labelX = 20;
        labelY = -5;
      }

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

    row.seats.forEach((seat) => {
      const isSeatSelected = selectedSeatIds.includes(seat.id);

      const seatX = seat.x - (row.startX || 0);
      const seatY = seat.y - (row.startY || 0);

      const seatRadius = seat.radius || row.seatRadius || 8;

      rowElements.push(
        <Group key={`seat-group-${seat.id}`}>
          <Circle
            id={`seat-${seat.id}`}
            x={seatX}
            y={seatY}
            radius={seatRadius}
            fill={seat.fill || getSeatStatusColor(seat.status, seat.category)}
            stroke={
              isSeatSelected
                ? "#FF6B6B"
                : isRowSelected
                  ? "#FFA500"
                  : seat.stroke || "#2E7D32"
            }
            strokeWidth={
              !isCustomerView
                ? (seat.strokeWidth || 1) +
                  (isSeatSelected || isRowSelected ? 1 : 0)
                : 1
            }
            opacity={isInteractive ? 1 : 0.6}
            listening={isInteractive}
            onClick={
              isInteractive && areaEvents?.onSeatClick
                ? (e) => {
                    e.cancelBubble = true;
                    areaEvents.onSeatClick!(seat.id, e);
                  }
                : undefined
            }
            onDblClick={
              isInteractive && areaEvents?.onSeatDoubleClick
                ? (e) => {
                    e.cancelBubble = true;
                    areaEvents.onSeatDoubleClick!(seat.id, e);
                  }
                : undefined
            }
            draggable={false}
          />
          <Text
            x={seatX}
            y={seatY}
            text={seat.number.toString()}
            fontSize={Math.min(8, seatRadius / 1.1)}
            fontFamily="Arial"
            fill="white"
            align="center"
            verticalAlign="middle"
            offsetX={seat.number.toString().length * 2}
            offsetY={seatRadius / 2}
            opacity={isInteractive ? 1 : 0.6}
            listening={false}
          />
        </Group>
      );
    });

    elements.push(
      <Group
        key={`row-${row.id}`}
        id={`row-${row.id}`}
        x={row.startX || 0}
        y={row.startY || 0}
        rotation={0}
        draggable={isInteractive && !isCustomerView} // Disable dragging in customer view
        listening={isInteractive}
        onClick={
          isInteractive && areaEvents?.onRowClick
            ? (e) => {
                if (e.target === e.currentTarget) {
                  e.cancelBubble = true;
                  areaEvents.onRowClick!(row.id, e);
                }
              }
            : undefined
        }
        onDblClick={
          isInteractive && areaEvents?.onRowDoubleClick && !isCustomerView // Disable double click in customer view
            ? (e) => {
                if (e.target === e.currentTarget) {
                  e.cancelBubble = true;
                  areaEvents.onRowDoubleClick!(row.id, e);
                }
              }
            : undefined
        }
        onDragStart={
          isInteractive && areaEvents?.onRowDragStart && !isCustomerView // Disable drag events in customer view
            ? (e) => {
                areaEvents.onRowDragStart!(row.id, e);
              }
            : undefined
        }
        onDragMove={
          isInteractive && areaEvents?.onRowDragMove && !isCustomerView
            ? (e) => {
                areaEvents.onRowDragMove!(row.id, e);
              }
            : undefined
        }
        onDragEnd={
          isInteractive && areaEvents?.onRowDragEnd && !isCustomerView
            ? (e) => {
                areaEvents.onRowDragEnd!(row.id, e);
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
