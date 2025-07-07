import { StateCreator } from "zustand";
import {
  PolygonShape,
  RowShape,
  SeatShape,
  AnyShapeUpdate,
} from "@/types/seat-map-types";
import { ShapesSlice } from "./shapes-slice";
import { HistorySlice } from "./history-slice";
import { CanvasSlice } from "./canvas-slice";

export interface AreaSlice {
  isInAreaMode: boolean;
  zoomedArea: PolygonShape | null;
  originalCanvasState: {
    zoom: number;
    pan: { x: number; y: number };
  } | null;

  selectedRowIds: string[];
  selectedSeatIds: string[];

  enterAreaMode: (
    area: PolygonShape,
    originalState: { zoom: number; pan: { x: number; y: number } }
  ) => void;
  exitAreaMode: () => void;
  updateZoomedArea: (updates: AnyShapeUpdate) => void;

  // FIX: Update CRUD methods to return IDs
  addRowToArea: (row: Omit<RowShape, "id">) => string; // Return row ID
  updateRow: (rowId: string, updates: Partial<RowShape>) => string; // Return row ID
  deleteRow: (rowId: string) => string; // Return deleted row ID

  addSeatToRow: (rowId: string, seat: Omit<SeatShape, "id">) => string; // Return seat ID
  updateSeat: (seatId: string, updates: Partial<SeatShape>) => string; // Return seat ID
  deleteSeat: (seatId: string) => string; // Return deleted seat ID

  selectRow: (rowId: string, multiSelect?: boolean) => void;
  selectSeat: (seatId: string, multiSelect?: boolean) => void;
  clearRowSelection: () => void;
  clearSeatSelection: () => void;
  clearAreaSelections: () => void;

  selectMultipleSeats: (seatIds: string[], multiSelect?: boolean) => void;
  selectMultipleRows: (rowIds: string[], multiSelect?: boolean) => void;

  mergeRows: (primaryRowId: string, rowIdsToMerge: string[]) => void;
  mergeSeats: (primarySeatId: string, seatIdsToMerge: string[]) => void;

  // FIX: Add batch operations that return arrays of IDs
  addMultipleSeatsToRow: (rowId: string, seats: Omit<SeatShape, "id">[]) => string[]; // Return seat IDs
  addMultipleRowsToArea: (rows: Omit<RowShape, "id">[]) => string[]; // Return row IDs
}

// FIX: Helper function to generate unique IDs (centralized)
const generateUniqueId = (prefix: string = "item") => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createAreaSlice: StateCreator<
  ShapesSlice & HistorySlice & CanvasSlice & AreaSlice,
  [],
  [],
  AreaSlice
> = (set, get) => ({
  isInAreaMode: false,
  zoomedArea: null,
  originalCanvasState: null,
  selectedRowIds: [],
  selectedSeatIds: [],

  enterAreaMode: (area, originalState) => {
    set({
      isInAreaMode: true,
      zoomedArea: area,
      originalCanvasState: originalState,
      selectedRowIds: [],
      selectedSeatIds: [],
    });
  },

  exitAreaMode: () => {
    const { zoomedArea, shapes, originalCanvasState, setZoom, setPan } = get();

    if (zoomedArea) {
      set({
        shapes: shapes.map((shape) =>
          shape.id === zoomedArea.id ? zoomedArea : shape
        ),
      });

      console.log(
        "Area changes saved to main shapes array before exit",
        zoomedArea
      );
    }

    if (originalCanvasState) {
      setZoom(originalCanvasState.zoom);
      setPan(originalCanvasState.pan.x, originalCanvasState.pan.y);
    }

    set({
      isInAreaMode: false,
      zoomedArea: null,
      originalCanvasState: null,
      selectedRowIds: [],
      selectedSeatIds: [],
    });
  },

  updateZoomedArea: (updates) => {
    const { zoomedArea } = get();
    if (zoomedArea) {
      const updatedArea = { ...zoomedArea, ...updates } as PolygonShape;

      set((state) => ({
        zoomedArea: updatedArea,
        shapes: state.shapes.map((shape) =>
          shape.id === zoomedArea.id ? updatedArea : shape
        ),
      }));
    }
  },

  // FIX: Update addRowToArea to return ID
  addRowToArea: (rowData) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    const newRowId = generateUniqueId("row");
    const newRow: RowShape = {
      ...rowData,
      id: newRowId,
      area: zoomedArea.id,
      seats: rowData.seats || [],
    };

    const updatedArea = {
      ...zoomedArea,
      rows: [...(zoomedArea.rows || []), newRow],
    };

    set((state) => ({
      zoomedArea: updatedArea,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    console.log("Row added:", newRow);
    console.log("Updated area:", updatedArea);
    
    return newRowId;
  },

  // FIX: Update updateRow to return ID
  updateRow: (rowId, updates) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    const updatedRows = (zoomedArea.rows || []).map((row) =>
      row.id === rowId ? { ...row, ...updates } : row
    );

    const updatedArea = {
      ...zoomedArea,
      rows: updatedRows,
    };

    set((state) => ({
      zoomedArea: updatedArea,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    return rowId;
  },

  // FIX: Update deleteRow to return ID
  deleteRow: (rowId) => {
    const { zoomedArea, selectedRowIds } = get();
    if (!zoomedArea) return "";

    const updatedRows = (zoomedArea.rows || []).filter(
      (row) => row.id !== rowId
    );
    const updatedSelectedRows = selectedRowIds.filter((id) => id !== rowId);

    const updatedArea = {
      ...zoomedArea,
      rows: updatedRows,
    };

    set((state) => ({
      zoomedArea: updatedArea,
      selectedRowIds: updatedSelectedRows,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    return rowId;
  },

  // FIX: Update addSeatToRow to return ID
  addSeatToRow: (rowId, seatData) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    console.log("Adding seat to row:", rowId);
    console.log("Seat data:", seatData);

    const newSeatId = generateUniqueId("seat");
    const newSeat: SeatShape = {
      ...seatData,
      id: newSeatId,
    };

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          seats: Array.isArray(row.seats) ? [...row.seats, newSeat] : [newSeat],
        };
      }
      return row;
    });

    const updatedArea = {
      ...zoomedArea,
      rows: updatedRows,
    };

    set((state) => ({
      zoomedArea: updatedArea,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    console.log("Seat added:", newSeat);
    console.log("Updated rows:", updatedRows);
    console.log("Updated area:", updatedArea);

    return newSeatId;
  },

  // FIX: Update updateSeat to return ID
  updateSeat: (seatId, updates) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (!Array.isArray(row.seats)) return row;

      const seatIndex = row.seats.findIndex((seat) => seat.id === seatId);
      if (seatIndex === -1) return row;

      const updatedSeats = [...row.seats];
      updatedSeats[seatIndex] = { ...updatedSeats[seatIndex], ...updates };

      return { ...row, seats: updatedSeats };
    });

    const updatedArea = {
      ...zoomedArea,
      rows: updatedRows,
    };

    set((state) => ({
      zoomedArea: updatedArea,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    return seatId;
  },

  // FIX: Update deleteSeat to return ID
  deleteSeat: (seatId) => {
    const { zoomedArea, selectedSeatIds } = get();
    if (!zoomedArea) return "";

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (!Array.isArray(row.seats)) return row;

      return {
        ...row,
        seats: row.seats.filter((seat) => seat.id !== seatId),
      };
    });

    const updatedSelectedSeats = selectedSeatIds.filter((id) => id !== seatId);

    const updatedArea = {
      ...zoomedArea,
      rows: updatedRows,
    };

    set((state) => ({
      zoomedArea: updatedArea,
      selectedSeatIds: updatedSelectedSeats,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    return seatId;
  },

  // FIX: Add batch operations
  addMultipleSeatsToRow: (rowId, seats) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return [];

    console.log("Adding multiple seats to row:", rowId);
    console.log("Seats data:", seats);

    const newSeats: SeatShape[] = seats.map((seatData) => ({
      ...seatData,
      id: generateUniqueId("seat"),
    }));

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          seats: Array.isArray(row.seats) ? [...row.seats, ...newSeats] : [...newSeats],
        };
      }
      return row;
    });

    const updatedArea = {
      ...zoomedArea,
      rows: updatedRows,
    };

    set((state) => ({
      zoomedArea: updatedArea,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    console.log("Multiple seats added:", newSeats);
    console.log("Updated area:", updatedArea);

    return newSeats.map(seat => seat.id);
  },

  addMultipleRowsToArea: (rows) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return [];

    const newRows: RowShape[] = rows.map((rowData) => ({
      ...rowData,
      id: generateUniqueId("row"),
      area: zoomedArea.id,
      seats: rowData.seats || [],
    }));

    const updatedArea = {
      ...zoomedArea,
      rows: [...(zoomedArea.rows || []), ...newRows],
    };

    set((state) => ({
      zoomedArea: updatedArea,
      shapes: state.shapes.map((shape) =>
        shape.id === zoomedArea.id ? updatedArea : shape
      ),
    }));

    console.log("Multiple rows added:", newRows);
    console.log("Updated area:", updatedArea);

    return newRows.map(row => row.id);
  },

  selectRow: (rowId, multiSelect = false) => {
    const { selectedRowIds } = get();

    if (multiSelect) {
      const isSelected = selectedRowIds.includes(rowId);
      set({
        selectedRowIds: isSelected
          ? selectedRowIds.filter((id) => id !== rowId)
          : [...selectedRowIds, rowId],
      });
    } else {
      set({ selectedRowIds: [rowId] });
    }
  },

  selectSeat: (seatId, multiSelect = false) => {
    const { selectedSeatIds } = get();

    if (multiSelect) {
      const isSelected = selectedSeatIds.includes(seatId);
      set({
        selectedSeatIds: isSelected
          ? selectedSeatIds.filter((id) => id !== seatId)
          : [...selectedSeatIds, seatId],
      });
    } else {
      set({ selectedSeatIds: [seatId] });
    }
  },

  selectMultipleSeats: (seatIds: string[], multiSelect: boolean = false) => {
    const { selectedSeatIds } = get();

    if (multiSelect) {
      // Add to existing selection
      const newSelection = [...selectedSeatIds];
      seatIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      set({ selectedSeatIds: newSelection });
    } else {
      // Replace selection
      set({ selectedSeatIds: seatIds });
    }

    console.log("Multi-select seats:", seatIds, "Multi:", multiSelect);
  },

  selectMultipleRows: (rowIds: string[], multiSelect: boolean = false) => {
    const { selectedRowIds } = get();

    if (multiSelect) {
      // Add to existing selection
      const newSelection = [...selectedRowIds];
      rowIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      set({ selectedRowIds: newSelection });
    } else {
      // Replace selection
      set({ selectedRowIds: rowIds });
    }

    console.log("Multi-select rows:", rowIds, "Multi:", multiSelect);
  },

  clearRowSelection: () => {
    set({ selectedRowIds: [] });
  },

  clearSeatSelection: () => {
    set({ selectedSeatIds: [] });
  },

  clearAreaSelections: () => {
    set({
      selectedRowIds: [],
      selectedSeatIds: [],
    });
  },

  mergeRows: (primaryRowId: string, rowIdsToMerge: string[]) => {
    const { zoomedArea, shapes } = get();
    if (!zoomedArea) return;

    const area = shapes.find((s) => s.id === zoomedArea.id) as PolygonShape;
    if (!area || !area.rows) return;

    const primaryRow = area.rows.find((r) => r.id === primaryRowId);
    const rowsToMerge = area.rows.filter((r) => rowIdsToMerge.includes(r.id));

    if (!primaryRow || rowsToMerge.length === 0) return;

    // Collect all seats
    const allSeats = [...primaryRow.seats];
    let maxSeatNumber = Math.max(...primaryRow.seats.map((s) => s.number));

    rowsToMerge.forEach((row) => {
      row.seats.forEach((seat) => {
        allSeats.push({
          ...seat,
          id: generateUniqueId("seat"),
          number: maxSeatNumber + 1,
          row: primaryRow.name,
        });
        maxSeatNumber++;
      });
    });

    // Update the area
    const updatedRows = area.rows.filter((r) => !rowIdsToMerge.includes(r.id));
    const updatedPrimaryRow = { ...primaryRow, seats: allSeats };
    updatedRows[updatedRows.findIndex((r) => r.id === primaryRowId)] =
      updatedPrimaryRow;

    // Update the shape
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === area.id ? { ...s, rows: updatedRows } : s
      ),
      selectedRowIds: [primaryRowId],
    }));
  },

  mergeSeats: (primarySeatId: string, seatIdsToMerge: string[]) => {
    const { zoomedArea, shapes } = get();
    if (!zoomedArea) return;

    const area = shapes.find((s) => s.id === zoomedArea.id) as PolygonShape;
    if (!area || !area.rows) return;

    // Find the seats and their rows
    let primarySeat: SeatShape | null = null;
    let primaryRowId: string | null = null;
    const seatsToMerge: SeatShape[] = [];

    area.rows.forEach((row) => {
      row.seats.forEach((seat) => {
        if (seat.id === primarySeatId) {
          primarySeat = seat;
          primaryRowId = row.id;
        } else if (seatIdsToMerge.includes(seat.id)) {
          seatsToMerge.push(seat);
        }
      });
    });

    if (!primarySeat || !primaryRowId) return;

    // Update primary seat
    const updatedPrimarySeat = {
      ...(primarySeat as SeatShape),
      seatLabel: `${(primarySeat as SeatShape).number} (Merged)`,
    };

    // Remove merged seats from their rows
    const updatedRows = area.rows.map((row) => ({
      ...row,
      seats: row.seats
        .filter((seat) => !seatIdsToMerge.includes(seat.id))
        .map((seat) => (seat.id === primarySeatId ? updatedPrimarySeat : seat)),
    }));

    // Update the shape
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === area.id ? { ...s, rows: updatedRows } : s
      ),
      selectedSeatIds: [primarySeatId],
    }));
  },
});
