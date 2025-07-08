import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useAreaMode,
  useAreaActions,
  useCanvasStore,
} from "../store/main-store";
import { RowShape, SeatShape } from "@/types/seat-map-types";

export function useAreaSidebarLogic() {
  const { selectedRowIds, selectedSeatIds, zoomedArea } = useAreaMode();
  const {
    updateRow,
    updateSeat,
    deleteRow,
    deleteSeat,
    clearAreaSelections,
    selectRow,
    selectSeat,
  } = useAreaActions();
  const { updateShape, saveToHistory } = useCanvasStore();

  const [batchValues, setBatchValues] = useState<Record<string, any>>({});

  // Get selected items
  const selectedRows = useMemo(() => {
    return (
      zoomedArea?.rows?.filter((row) => selectedRowIds.includes(row.id)) || []
    );
  }, [zoomedArea?.rows, selectedRowIds]);

  const selectedSeats = useMemo(() => {
    const seats: SeatShape[] = [];
    zoomedArea?.rows?.forEach((row) => {
      row.seats?.forEach((seat) => {
        if (selectedSeatIds.includes(seat.id)) {
          seats.push(seat);
        }
      });
    });
    return seats;
  }, [zoomedArea?.rows, selectedSeatIds]);

  const totalSelected = selectedRows.length + selectedSeats.length;
  const selectionType = selectedRows.length > 0 ? "rows" : "seats";
  const singleRow = selectedRows.length === 1 ? selectedRows[0] : null;
  const singleSeat = selectedSeats.length === 1 ? selectedSeats[0] : null;

  // Calculate common values for batch editing
  useEffect(() => {
    if (selectedRows.length > 1) {
      const commonValues: Record<string, any> = {};

      // Row-specific common values
      const seatRadii = selectedRows.map((r) => r.seatRadius);
      if (seatRadii.every((r) => r === seatRadii[0])) {
        commonValues.seatRadius = seatRadii[0];
      }

      const seatSpacings = selectedRows.map((r) => r.seatSpacing);
      if (seatSpacings.every((s) => s === seatSpacings[0])) {
        commonValues.seatSpacing = seatSpacings[0];
      }

      const rotations = selectedRows.map((r) => r.rotation);
      if (rotations.every((r) => r === rotations[0])) {
        commonValues.rotation = rotations[0];
      }

      const colors = selectedRows.map((r) => r.fill).filter(Boolean);
      if (colors.length > 0 && colors.every((c) => c === colors[0])) {
        commonValues.fill = colors[0];
      }

      setBatchValues(commonValues);
    } else if (selectedSeats.length > 1) {
      const commonValues: Record<string, any> = {};

      // Seat-specific common values
      const radii = selectedSeats.map((s) => s.radius);
      if (radii.every((r) => r === radii[0])) {
        commonValues.radius = radii[0];
      }

      const categories = selectedSeats.map((s) => s.category);
      if (categories.every((c) => c === categories[0])) {
        commonValues.category = categories[0];
      }

      const prices = selectedSeats
        .map((s) => s.price)
        .filter((p) => p !== undefined);
      if (prices.length > 0 && prices.every((p) => p === prices[0])) {
        commonValues.price = prices[0];
      }

      const colors = selectedSeats.map((s) => s.fill).filter(Boolean);
      if (colors.length > 0 && colors.every((c) => c === colors[0])) {
        commonValues.fill = colors[0];
      }

      setBatchValues(commonValues);
    }
  }, [selectedRows, selectedSeats]);

  // Handle single item editing
  const handleSingleRowUpdate = useCallback(
    (updates: Partial<RowShape>) => {
      if (selectedRows.length === 1) {
        console.log("Updating single row:", selectedRows[0].id, updates);
        updateRow(selectedRows[0].id, updates);
        saveToHistory();
      }
    },
    [selectedRows, updateRow, saveToHistory]
  );

  const handleSingleSeatUpdate = useCallback(
    (updates: Partial<SeatShape>) => {
      if (selectedSeats.length === 1) {
        console.log("Updating single seat:", selectedSeats[0].id, updates);
        updateSeat(selectedSeats[0].id, updates);
        saveToHistory();
      }
    },
    [selectedSeats, updateSeat, saveToHistory]
  );

  // Handle batch editing
  const handleBatchRowUpdate = useCallback(
    (key: string, value: any) => {
      console.log("Batch updating rows:", key, value);

      selectedRows.forEach((row) => {
        // Create updates object for the row
        const rowUpdates: Record<string, any> = { [key]: value };

        // FIX: All properties that affect seats are handled by updateRow
        updateRow(row.id, rowUpdates);
      });

      setBatchValues((prev) => ({ ...prev, [key]: value }));
      saveToHistory();
    },
    [selectedRows, updateRow, saveToHistory]
  );

  const handleBatchSeatUpdate = useCallback(
    (key: string, value: any) => {
      console.log("Batch updating seats:", key, value);
      selectedSeats.forEach((seat) => {
        updateSeat(seat.id, { [key]: value });
      });
      setBatchValues((prev) => ({ ...prev, [key]: value }));
      saveToHistory();
    },
    [selectedSeats, updateSeat, saveToHistory]
  );

  // Handle area-wide updates
  const handleAreaUpdate = useCallback(
    (updates: Partial<any>) => {
      if (zoomedArea) {
        console.log("Updating area:", zoomedArea.id, updates);

        // FIX: For polygon shapes, also update existing rows with new defaults
        if (updates.defaultSeatRadius && zoomedArea.rows) {
          zoomedArea.rows.forEach((row) => {
            updateRow(row.id, { seatRadius: updates.defaultSeatRadius });
          });
        }

        if (updates.defaultSeatSpacing && zoomedArea.rows) {
          zoomedArea.rows.forEach((row) => {
            updateRow(row.id, { seatSpacing: updates.defaultSeatSpacing });
          });
        }

        if (updates.defaultSeatColor && zoomedArea.rows) {
          zoomedArea.rows.forEach((row) => {
            updateRow(row.id, { fill: updates.defaultSeatColor });
          });
        }

        updateShape(zoomedArea.id, updates);
        saveToHistory();
      }
    },
    [zoomedArea, updateShape, updateRow, saveToHistory]
  );

  // Handle merging
  const handleMergeRows = useCallback(() => {
    if (selectedRows.length < 2) return;

    const primaryRow = selectedRows[0];
    const rowsToMerge = selectedRows.slice(1);

    // Collect all seats from rows to merge
    const allSeats: SeatShape[] = [...primaryRow.seats];
    let maxSeatNumber = Math.max(...primaryRow.seats.map((s) => s.number));

    rowsToMerge.forEach((row) => {
      row.seats.forEach((seat) => {
        allSeats.push({
          ...seat,
          id: `${primaryRow.id}_seat_${maxSeatNumber + 1}`,
          number: maxSeatNumber + 1,
          row: primaryRow.name,
        });
        maxSeatNumber++;
      });
    });

    // Update primary row with all seats
    updateRow(primaryRow.id, {
      seats: allSeats,
      name: `${primaryRow.name} (Merged)`,
    });

    // Delete the other rows
    rowsToMerge.forEach((row) => {
      deleteRow(row.id);
    });

    // Select only the merged row
    clearAreaSelections();
    selectRow(primaryRow.id, false);
    saveToHistory();
  }, [
    selectedRows,
    updateRow,
    deleteRow,
    clearAreaSelections,
    selectRow,
    saveToHistory,
  ]);

  const handleMergeSeats = useCallback(() => {
    if (selectedSeats.length < 2) return;

    const primarySeat = selectedSeats[0];
    const seatsToMerge = selectedSeats.slice(1);

    // Update primary seat properties
    updateSeat(primarySeat.id, {
      seatLabel: `${primarySeat.number} (Merged)`,
    });

    // Delete the other seats
    seatsToMerge.forEach((seat) => {
      deleteSeat(seat.id);
    });

    // Select only the merged seat
    clearAreaSelections();
    selectSeat(primarySeat.id, false);
    saveToHistory();
  }, [
    selectedSeats,
    updateSeat,
    deleteSeat,
    clearAreaSelections,
    selectSeat,
    saveToHistory,
  ]);

  const handleDeleteAll = useCallback(() => {
    selectedRows.forEach((row) => deleteRow(row.id));
    selectedSeats.forEach((seat) => deleteSeat(seat.id));
    clearAreaSelections();
    saveToHistory();
  }, [selectedRows, selectedSeats, deleteRow, deleteSeat, clearAreaSelections, saveToHistory]);

  return {
    selectedRows,
    selectedSeats,
    totalSelected,
    selectionType,
    singleRow,
    singleSeat,
    batchValues,
    handlers: {
      handleSingleRowUpdate,
      handleSingleSeatUpdate,
      handleBatchRowUpdate,
      handleBatchSeatUpdate,
      handleAreaUpdate,
      handleMergeRows,
      handleMergeSeats,
      handleDeleteAll,
      // FIX: Remove the old debounced color handlers since we're using direct Input now
    },
  };
}