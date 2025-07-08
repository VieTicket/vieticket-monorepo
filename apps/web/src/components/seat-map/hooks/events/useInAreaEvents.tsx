import { useCallback } from "react";
import {
  useAreaActions,
  useAreaMode,
} from "@/components/seat-map/store/main-store";
import { useAreaZoom } from "../useAreaZoom";
import { SeatShape } from "@/types/seat-map-types";

export const useInAreaEvents = () => {
  const {
    selectRow,
    selectSeat,
    clearAreaSelections,
    addRowToArea,
    addMultipleSeatsToRow,
  } = useAreaActions();

  const { isInAreaMode } = useAreaMode();
  const areaZoom = useAreaZoom();

  const handleSeatClick = useCallback(
    (seatId: string, e: any) => {
      if (!isInAreaMode) return;

      e.cancelBubble = true;
      const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;

      if (multiSelect) {
        // Multi-select: toggle seat selection
        selectSeat(seatId, true);
      } else {
        // Find which row this seat belongs to
        const seatRow = areaZoom.zoomedArea?.rows?.find((row) =>
          row.seats?.some((seat) => seat.id === seatId)
        );

        if (seatRow) {
          // Single click on seat selects the row
          selectRow(seatRow.id, false);
        }
      }
    },
    [selectRow, selectSeat, areaZoom.zoomedArea, isInAreaMode]
  );

  const handleRowClick = useCallback(
    (rowId: string, e: any) => {
      if (!isInAreaMode) return;

      e.cancelBubble = true;
      const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;
      selectRow(rowId, multiSelect);
    },
    [selectRow, isInAreaMode]
  );

  const handleSeatDoubleClick = useCallback(
    (seatId: string, e: any) => {
      if (!isInAreaMode) return;

      e.cancelBubble = true;
      // Double click on seat selects the individual seat
      selectSeat(seatId, false);
    },
    [selectSeat, isInAreaMode]
  );

  const handleRowDoubleClick = useCallback(
    (rowId: string, e: any) => {
      if (!isInAreaMode) return;

      e.cancelBubble = true;
      // Double click on row could trigger row name editing
      // For now, just select the row
      selectRow(rowId, false);
      // TODO: Implement row name editing modal/inline editing
    },
    [selectRow, isInAreaMode]
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (!isInAreaMode) return;

      if (e.target === e.target.getStage()) {
        clearAreaSelections();
      }
    },
    [clearAreaSelections, isInAreaMode]
  );

  // FIX: Remove conflicting drag handlers - let useDragEvents handle all dragging
  const handleAddSeatsToMultipleRows = useCallback(
    (seatsGroupedByRow: { [rowName: string]: SeatShape[] }) => {
      const createdRowIds: string[] = [];
      const createdSeatIds: string[] = [];

      Object.entries(seatsGroupedByRow).forEach(([rowName, seats]) => {
        let rowId: string = addRowToArea({
          type: "row" as const,
          name: rowName,
          startX: seats[0]?.x || 0,
          startY: seats[0]?.y || 0,
          seatRadius: 8,
          seatSpacing: 20,
          rotation: 0,
          area: areaZoom.zoomedArea?.id || "",
          seats: [], // Empty seats array, will be populated below
          fill: "#e0e0e0",
          stroke: "#666666",
          strokeWidth: 1,
          visible: true,
        });
        createdRowIds.push(rowId);

        const seatsToAdd = seats.map((seat) => {
          const { id, ...seatData } = seat;
          return {
            ...seatData,
            row: rowName,
          };
        });

        const newSeatIds = addMultipleSeatsToRow(rowId, seatsToAdd);
        createdSeatIds.push(...newSeatIds);
      });
    },
    [areaZoom.zoomedArea, addRowToArea, addMultipleSeatsToRow]
  );

  const handleAddSeatsToSingleRow = useCallback(
    (seats: SeatShape[]) => {
      if (seats.length === 0) return;

      let rowId: string = addRowToArea({
        type: "row" as const,
        name: seats[0].row,
        startX: seats[0]?.x || 0,
        startY: seats[0]?.y || 0,
        seatRadius: 8,
        seatSpacing: 20,
        rotation: 0,
        area: areaZoom.zoomedArea?.id || "",
        seats: [],
        fill: "#e0e0e0",
        stroke: "#666666",
        strokeWidth: 1,
        visible: true,
      });

      const seatsToAdd = seats.map((seat) => {
        const { id, ...seatData } = seat;
        return {
          ...seatData,
          row: seats[0].row,
        };
      });

      const newSeatIds = addMultipleSeatsToRow(rowId, seatsToAdd);
    },
    [areaZoom.zoomedArea, addRowToArea, addMultipleSeatsToRow]
  );

  return {
    handleSeatClick,
    handleRowClick,
    handleSeatDoubleClick,
    handleRowDoubleClick,
    handleStageClick,
    handleAddSeatsToMultipleRows,
    handleAddSeatsToSingleRow,
  };
};
