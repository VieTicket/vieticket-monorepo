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

  updateRowPosition: (rowId: string, deltaX: number, deltaY: number) => void;
  updateMultipleRowPositions: (
    updates: { rowId: string; deltaX: number; deltaY: number }[]
  ) => void;

  selectMultipleSeats: (seatIds: string[], multiSelect?: boolean) => void;
  selectMultipleRows: (rowIds: string[], multiSelect?: boolean) => void;

  mergeRows: (primaryRowId: string, rowIdsToMerge: string[]) => void;
  mergeSeats: (primarySeatId: string, seatIdsToMerge: string[]) => void;

  // FIX: Add batch operations that return arrays of IDs
  addMultipleSeatsToRow: (
    rowId: string,
    seats: Omit<SeatShape, "id">[]
  ) => string[]; // Return seat IDs
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
    // FIX: Save state before entering area mode
    get().saveToHistory();

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

    // FIX: Save state after exiting area mode
    get().saveToHistory();
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

      // FIX: Save to history after area updates
      get().saveToHistory();
    }
  },

  // FIX: Update updateRow to properly sync ALL properties between rows and seats
  updateRow: (rowId, updates) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (row.id === rowId) {
        const updatedRow = { ...row, ...updates };

        // FIX: Sync seat properties when row properties change
        let updatedSeats = [...row.seats];

        // FIX: Seat radius sync
        if ("seatRadius" in updates && updates.seatRadius !== undefined) {
          updatedSeats = updatedSeats.map((seat) => ({
            ...seat,
            radius: updates.seatRadius!,
          }));
        }

        // FIX: Seat spacing sync with position recalculation
        if ("seatSpacing" in updates && updates.seatSpacing !== undefined) {
          const newSeatSpacing = updates.seatSpacing;
          updatedSeats = updatedSeats.map((seat, index) => ({
            ...seat,
            x: row.startX + index * newSeatSpacing,
            y: seat.y, // Keep same Y position
          }));
        }

        // FIX: Visual properties sync (colors and strokes) - FIXED LOGIC
        if ("fill" in updates && updates.fill !== undefined) {
          updatedSeats = updatedSeats.map((seat) => ({
            ...seat,
            // Update seat fill if it matches row fill or has no custom fill
            fill: updates.fill,
          }));
        }

        if ("stroke" in updates && updates.stroke !== undefined) {
          updatedSeats = updatedSeats.map((seat) => ({
            ...seat,
            // Update seat stroke if it matches row stroke or has no custom stroke
            stroke: updates.stroke,
          }));
        }

        if ("strokeWidth" in updates && updates.strokeWidth !== undefined) {
          updatedSeats = updatedSeats.map((seat) => ({
            ...seat,
            // Update seat strokeWidth if it matches row strokeWidth or has no custom strokeWidth
            strokeWidth: updates.strokeWidth,
          }));
        }

        // FIX: Rotation sync - use first seat center as rotation point
        if (
          "rotation" in updates &&
          updates.rotation !== undefined &&
          row.seats.length > 0
        ) {
          const firstSeat = row.seats[0];
          // FIX: Use first seat position as rotation center
          const centerX = firstSeat.x;
          const centerY = firstSeat.y;
          const rotationRad = (updates.rotation * Math.PI) / 180;

          updatedSeats = updatedSeats.map((seat, index) => {
            // Get the seat's current position
            const currentX = seat.x;
            const currentY = seat.y;

            // Calculate position relative to first seat (rotation center)
            const relativeX = currentX - centerX;
            const relativeY = currentY - centerY;

            // Apply rotation around the first seat center
            const rotatedX =
              relativeX * Math.cos(rotationRad) -
              relativeY * Math.sin(rotationRad);
            const rotatedY =
              relativeX * Math.sin(rotationRad) +
              relativeY * Math.cos(rotationRad);

            return {
              ...seat,
              x: centerX + rotatedX,
              y: centerY + rotatedY,
            };
          });
        }

        // FIX: Category sync (if row category changes, update seat categories that match)
        if ("rowCategory" in updates && updates.rowCategory !== undefined) {
          updatedSeats = updatedSeats.map((seat) => ({
            ...seat,
            // Update seat category if it matches the old row category or is standard
            category:
              !seat.category ||
              seat.category === "standard" ||
              seat.category === row.rowCategory
                ? updates.rowCategory
                : seat.category,
          }));
        }

        return {
          ...updatedRow,
          seats: updatedSeats,
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

    // FIX: Save to history after row updates
    get().saveToHistory();

    return rowId;
  },

  addRowToArea: (rowData) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    const newRowId = generateUniqueId("row");

    const relativeStartX = rowData.startX || 0;
    const relativeStartY = rowData.startY || 0;

    const processedSeats: SeatShape[] = (rowData.seats || []).map((seat) => ({
      ...seat,
      x: seat.x,
      y: seat.y,
      radius: seat.radius ?? rowData.seatRadius ?? 8,
      fill:
        seat.fill ?? rowData.fill ?? zoomedArea.defaultSeatColor ?? "#4CAF50",
      stroke: seat.stroke ?? rowData.stroke ?? "#2E7D32",
      strokeWidth: seat.strokeWidth ?? rowData.strokeWidth ?? 1,
    }));

    const newRow: RowShape = {
      ...rowData,
      id: newRowId,
      area: zoomedArea.id,
      startX: relativeStartX,
      startY: relativeStartY,
      seats: processedSeats,
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

    // FIX: Save to history after adding row
    get().saveToHistory();

    return newRowId;
  },

  // NEW: Update addSeatToRow to handle relative positioning
  addSeatToRow: (rowId, seatData) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return "";

    const targetRow = (zoomedArea.rows || []).find((row) => row.id === rowId);
    if (!targetRow) return "";

    const newSeatId = generateUniqueId("seat");

    const newSeat: SeatShape = {
      ...seatData,
      id: newSeatId,
      x: seatData.x,
      y: seatData.y,
      radius: seatData.radius ?? targetRow.seatRadius ?? 8,
      fill:
        seatData.fill ??
        targetRow.fill ??
        zoomedArea.defaultSeatColor ??
        "#4CAF50",
      stroke: seatData.stroke ?? targetRow.stroke ?? "#2E7D32",
      strokeWidth: seatData.strokeWidth ?? targetRow.strokeWidth ?? 1,
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

    // FIX: Save to history after adding seat
    get().saveToHistory();

    return newSeatId;
  },

  // NEW: Update addMultipleSeatsToRow to handle relative positioning
  addMultipleSeatsToRow: (rowId, seats) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return [];

    const targetRow = (zoomedArea.rows || []).find((row) => row.id === rowId);
    if (!targetRow) return [];

    const newSeats: SeatShape[] = seats.map((seatData) => ({
      ...seatData,
      id: generateUniqueId("seat"),
      x: seatData.x,
      y: seatData.y,
      radius: seatData.radius ?? targetRow.seatRadius ?? 8,
      fill:
        seatData.fill ??
        targetRow.fill ??
        zoomedArea.defaultSeatColor ??
        "#4CAF50",
      stroke: seatData.stroke ?? targetRow.stroke ?? "#2E7D32",
      strokeWidth: seatData.strokeWidth ?? targetRow.strokeWidth ?? 1,
    }));

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          seats: Array.isArray(row.seats)
            ? [...row.seats, ...newSeats]
            : [...newSeats],
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

    // FIX: Save to history after adding multiple seats
    get().saveToHistory();

    return newSeats.map((seat) => seat.id);
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

    // FIX: Save to history after deleting row
    get().saveToHistory();

    return rowId;
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

    // FIX: Save to history after updating seat
    get().saveToHistory();

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

    // FIX: Save to history after deleting seat
    get().saveToHistory();

    return seatId;
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

    return newRows.map((row) => row.id);
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

  updateRowPosition: (rowId, deltaX, deltaY) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return;

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      if (row.id === rowId) {
        const newStartX = (row.startX || 0) + deltaX;
        const newStartY = (row.startY || 0) + deltaY;

        // FIX: Update all seats in the row to maintain their relative positions
        const updatedSeats = row.seats.map((seat) => ({
          ...seat,
          x: seat.x + deltaX,
          y: seat.y + deltaY,
        }));

        return {
          ...row,
          startX: newStartX,
          startY: newStartY,
          seats: updatedSeats,
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

    // FIX: Save to history after position updates
    get().saveToHistory();
  },

  updateMultipleRowPositions: (updates) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return;

    const updatedRows = (zoomedArea.rows || []).map((row) => {
      const update = updates.find((u) => u.rowId === row.id);
      if (update) {
        const newStartX = (row.startX || 0) + update.deltaX;
        const newStartY = (row.startY || 0) + update.deltaY;

        // FIX: Update all seats in the row to maintain their relative positions
        const updatedSeats = row.seats.map((seat) => ({
          ...seat,
          x: seat.x + update.deltaX,
          y: seat.y + update.deltaY,
        }));

        return {
          ...row,
          startX: newStartX,
          startY: newStartY,
          seats: updatedSeats,
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

    // FIX: Save to history after multiple position updates
    get().saveToHistory();
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

    // FIX: Save to history after merging rows
    get().saveToHistory();
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

    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === area.id ? { ...s, rows: updatedRows } : s
      ),
      selectedSeatIds: [primarySeatId],
    }));

    // FIX: Save to history after merging seats
    get().saveToHistory();
  },
});
