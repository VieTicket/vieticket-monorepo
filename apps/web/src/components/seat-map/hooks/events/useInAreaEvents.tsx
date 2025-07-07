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

  // FIX: Updated callback for handling seats that need to be added to multiple rows (grid)
  const handleAddSeatsToMultipleRows = useCallback(
    (seatsGroupedByRow: { [rowName: string]: SeatShape[] }) => {
      const createdRowIds: string[] = [];
      const createdSeatIds: string[] = [];

      console.log("=== PROCESSING MULTIPLE ROWS ===");
      console.log("Seats grouped by row:", seatsGroupedByRow);

      Object.entries(seatsGroupedByRow).forEach(([rowName, seats]) => {
        // Find existing row or create new one
        let existingRow = areaZoom.zoomedArea?.rows?.find(
          (row) => row.name === rowName
        );

        let rowId: string;

        if (!existingRow) {
          // Create new row using the area slice method (no ID duplication)
          console.log("Creating new row:", rowName);
          rowId = addRowToArea({
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
          console.log("Created new row with ID:", rowId);
        } else {
          rowId = existingRow.id;
          console.log("Using existing row with ID:", rowId);
        }

        // Add seats to the row using batch method (no ID duplication)
        console.log(
          "Adding seats to row:",
          rowId,
          "Seats count:",
          seats.length
        );
        const seatsToAdd = seats.map((seat) => {
          const { id, ...seatData } = seat; // Remove the temporary ID
          return {
            ...seatData,
            row: rowName,
          };
        });

        const newSeatIds = addMultipleSeatsToRow(rowId, seatsToAdd);
        createdSeatIds.push(...newSeatIds);
        console.log("Added seats with IDs:", newSeatIds);
      });

      console.log("=== MULTIPLE ROWS PROCESSING COMPLETE ===");
      console.log("Created rows:", createdRowIds);
      console.log("Created seats:", createdSeatIds);
    },
    [areaZoom.zoomedArea, addRowToArea, addMultipleSeatsToRow]
  );

  // FIX: Updated callback for handling seats that need to be added to a single row
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
        seats: [], // Empty seats array, will be populated below
        fill: "#e0e0e0",
        stroke: "#666666",
        strokeWidth: 1,
        visible: true,
      });

      // Add seats to the row using batch method (no ID duplication)
      console.log("Adding seats to row:", rowId, "Seats count:", seats.length);
      const seatsToAdd = seats.map((seat) => {
        const { id, ...seatData } = seat; // Remove the temporary ID
        return {
          ...seatData,
          row: seats[0].row,
        };
      });

      const newSeatIds = addMultipleSeatsToRow(rowId, seatsToAdd);
      console.log("Added seats with IDs:", newSeatIds);

      console.log("=== SINGLE ROW PROCESSING COMPLETE ===");
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
