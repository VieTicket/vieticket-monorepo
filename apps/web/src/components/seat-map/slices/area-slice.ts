// Create: slices/area-slice.ts
import { StateCreator } from "zustand";
import {
  PolygonShape,
  RowShape,
  SeatShape,
  AnyShapeUpdate,
} from "@/types/seat-map-types";

export interface AreaSlice {
  // Area mode state
  isInAreaMode: boolean;
  zoomedArea: PolygonShape | null;
  originalCanvasState: {
    zoom: number;
    pan: { x: number; y: number };
  } | null;

  // Area selections
  selectedRowIds: string[];
  selectedSeatIds: string[];

  // Area actions
  enterAreaMode: (
    area: PolygonShape,
    originalState: { zoom: number; pan: { x: number; y: number } }
  ) => void;
  exitAreaMode: () => void;
  // FIXED: Use the more flexible update type
  updateZoomedArea: (updates: AnyShapeUpdate) => void;

  // Row management
  addRowToArea: (row: Omit<RowShape, "id">) => void;
  updateRow: (rowId: string, updates: Partial<RowShape>) => void;
  deleteRow: (rowId: string) => void;

  // Seat management
  addSeatToRow: (rowId: string, seat: Omit<SeatShape, "id">) => void;
  updateSeat: (seatId: string, updates: Partial<SeatShape>) => void;
  deleteSeat: (seatId: string) => void;

  // Row and seat selection
  selectRow: (rowId: string, multiSelect?: boolean) => void;
  selectSeat: (seatId: string, multiSelect?: boolean) => void;
  clearRowSelection: () => void;
  clearSeatSelection: () => void;
  clearAreaSelections: () => void;
}

export const createAreaSlice: StateCreator<AreaSlice, [], [], AreaSlice> = (
  set,
  get
) => ({
  // Initial state
  isInAreaMode: false,
  zoomedArea: null,
  originalCanvasState: null,
  selectedRowIds: [],
  selectedSeatIds: [],

  // Area mode actions
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
    set({
      isInAreaMode: false,
      zoomedArea: null,
      originalCanvasState: null,
      selectedRowIds: [],
      selectedSeatIds: [],
    });
  },

  // FIXED: Use the more flexible update type
  updateZoomedArea: (updates) => {
    const { zoomedArea } = get();
    if (zoomedArea) {
      set({
        zoomedArea: { ...zoomedArea, ...updates } as PolygonShape,
      });
    }
  },

  // Row management
  addRowToArea: (rowData) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return;

    const newRow: RowShape = {
      ...rowData,
      id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      area: zoomedArea.id,
    };

    const updatedArea = {
      ...zoomedArea,
      rows: [...(zoomedArea.rows || []), newRow],
    };

    set({ zoomedArea: updatedArea });
  },

  updateRow: (rowId, updates) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return;

    const updatedRows = (zoomedArea.rows || []).map((row) =>
      row.id === rowId ? { ...row, ...updates } : row
    );

    set({
      zoomedArea: {
        ...zoomedArea,
        rows: updatedRows,
      },
    });
  },

  deleteRow: (rowId) => {
    const { zoomedArea, selectedRowIds } = get();
    if (!zoomedArea) return;

    const updatedRows = (zoomedArea.rows || []).filter(
      (row) => row.id !== rowId
    );
    const updatedSelectedRows = selectedRowIds.filter((id) => id !== rowId);

    set({
      zoomedArea: {
        ...zoomedArea,
        rows: updatedRows,
      },
      selectedRowIds: updatedSelectedRows,
    });
  },

  // Seat management
  addSeatToRow: (rowId, seatData) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return;

    const newSeat: SeatShape = {
      ...seatData,
      id: `seat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedRows = (zoomedArea.rows || []).map((row) =>
      row.id === rowId ? { ...row, seats: [...row.seats, newSeat] } : row
    );

    set({
      zoomedArea: {
        ...zoomedArea,
        rows: updatedRows,
      },
    });
  },

  updateSeat: (seatId, updates) => {
    const { zoomedArea } = get();
    if (!zoomedArea) return;

    const updatedRows = (zoomedArea.rows || []).map((row) => ({
      ...row,
      seats: row.seats.map((seat) =>
        seat.id === seatId ? { ...seat, ...updates } : seat
      ),
    }));

    set({
      zoomedArea: {
        ...zoomedArea,
        rows: updatedRows,
      },
    });
  },

  deleteSeat: (seatId) => {
    const { zoomedArea, selectedSeatIds } = get();
    if (!zoomedArea) return;

    const updatedRows = (zoomedArea.rows || []).map((row) => ({
      ...row,
      seats: row.seats.filter((seat) => seat.id !== seatId),
    }));

    const updatedSelectedSeats = selectedSeatIds.filter((id) => id !== seatId);

    set({
      zoomedArea: {
        ...zoomedArea,
        rows: updatedRows,
      },
      selectedSeatIds: updatedSelectedSeats,
    });
  },

  // Selection management
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
});
