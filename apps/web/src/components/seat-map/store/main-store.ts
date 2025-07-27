import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useMemo } from "react";
import { createShapesSlice, type ShapesSlice } from "../slices/shapes-slice";
import { createHistorySlice, type HistorySlice } from "../slices/history-slice";
import { createCanvasSlice, type CanvasSlice } from "../slices/canvas-slice";
import { createAreaSlice, type AreaSlice } from "../slices/area-slice";
import {
  createValidationSlice,
  type ValidationSlice,
} from "../slices/validation-slice";

type CanvasStore = ShapesSlice &
  HistorySlice &
  CanvasSlice &
  AreaSlice &
  ValidationSlice;

const initializeStore = () => {
  return create<CanvasStore>()(
    devtools(
      (...args) => ({
        ...createShapesSlice(...args),
        ...createHistorySlice(...args),
        ...createCanvasSlice(...args),
        ...createAreaSlice(...args),
        ...createValidationSlice(...args),
      }),
      {
        name: "canvas-store",
      }
    )
  );
};

let storeInstance: ReturnType<typeof initializeStore>;

function getStore() {
  if (typeof window === "undefined") {
    return initializeStore();
  }

  if (!storeInstance) {
    storeInstance = initializeStore();
  }

  return storeInstance;
}

export const useCanvasStore = getStore();

export const useShapes = () => useCanvasStore((state) => state.shapes);

export const useSelectedShapeIds = () =>
  useCanvasStore((state) => state.selectedShapeIds);

export const useCurrentTool = () =>
  useCanvasStore((state) => state.currentTool);

export const useZoom = () => useCanvasStore((state) => state.zoom);

export const useIsInAreaMode = () =>
  useCanvasStore((state) => state.isInAreaMode);
export const useZoomedArea = () => useCanvasStore((state) => state.zoomedArea);
export const useSelectedRowIds = () =>
  useCanvasStore((state) => state.selectedRowIds);
export const useSelectedSeatIds = () =>
  useCanvasStore((state) => state.selectedSeatIds);

export const useAreaMode = () => {
  const isInAreaMode = useIsInAreaMode();
  const zoomedArea = useZoomedArea();
  const selectedRowIds = useSelectedRowIds();
  const selectedSeatIds = useSelectedSeatIds();

  return useMemo(
    () => ({
      isInAreaMode,
      zoomedArea,
      selectedRowIds,
      selectedSeatIds,
    }),
    [isInAreaMode, zoomedArea, selectedRowIds, selectedSeatIds]
  );
};

export const useCanvasActions = () => {
  return {
    addShape: useCanvasStore.getState().addShape,
    updateShape: useCanvasStore.getState().updateShape,
    deleteShape: useCanvasStore.getState().deleteShape,
    selectShape: useCanvasStore.getState().selectShape,
    clearSelection: useCanvasStore.getState().clearSelection,
    moveShape: useCanvasStore.getState().moveShape,
    duplicateShape: useCanvasStore.getState().duplicateShape,
    undo: useCanvasStore.getState().undo,
    redo: useCanvasStore.getState().redo,
    canUndo: useCanvasStore.getState().canUndo,
    canRedo: useCanvasStore.getState().canRedo,
    zoomIn: useCanvasStore.getState().zoomIn,
    zoomOut: useCanvasStore.getState().zoomOut,
    duplicateShapes: useCanvasStore.getState().duplicateSelectedShapes,
    deleteSelectedShapes: useCanvasStore.getState().deleteSelectedShapes,
    setCurrentTool: useCanvasStore.getState().setCurrentTool,
    loadFromStorage: useCanvasStore.getState().loadFromStorage,
    clearStorage: useCanvasStore.getState().clearStorage,
    loadSeatMapData: useCanvasStore.getState().loadSeatMapData,
    setCurrentSeatMapId: useCanvasStore.getState().setCurrentSeatMapId,
    mirrorHorizontally: useCanvasStore.getState().mirrorHorizontally,
    mirrorVertically: useCanvasStore.getState().mirrorVertically,
    panToShape: useCanvasStore.getState().panToShape,
  };
};

export const useEnterAreaMode = () =>
  useCanvasStore((state) => state.enterAreaMode);
export const useExitAreaMode = () =>
  useCanvasStore((state) => state.exitAreaMode);
export const useAddRowToArea = () =>
  useCanvasStore((state) => state.addRowToArea);
export const useAddSeatToRow = () =>
  useCanvasStore((state) => state.addSeatToRow);
export const useSelectRow = () => useCanvasStore((state) => state.selectRow);
export const useSelectSeat = () => useCanvasStore((state) => state.selectSeat);
export const useClearAreaSelections = () =>
  useCanvasStore((state) => state.clearAreaSelections);
export const useUpdateRow = () => useCanvasStore((state) => state.updateRow);
export const useUpdateSeat = () => useCanvasStore((state) => state.updateSeat);
export const useDeleteRow = () => useCanvasStore((state) => state.deleteRow);
export const useDeleteSeat = () => useCanvasStore((state) => state.deleteSeat);
export const useSelectMultipleSeats = () =>
  useCanvasStore((state) => state.selectMultipleSeats);
export const useSelectMultipleRows = () =>
  useCanvasStore((state) => state.selectMultipleRows);
export const useAddMultipleSeatsToRow = () =>
  useCanvasStore((state) => state.addMultipleSeatsToRow);
export const useAddMultipleRowsToArea = () =>
  useCanvasStore((state) => state.addMultipleRowsToArea);
export const useUpdateRowPosition = () =>
  useCanvasStore((state) => state.updateRowPosition);
export const useUpdateMultipleRowPositions = () =>
  useCanvasStore((state) => state.updateMultipleRowPositions);
export const useDeleteSelectedRows = () =>
  useCanvasStore((state) => state.deleteSelectedRows);
export const useDeleteSelectedSeats = () =>
  useCanvasStore((state) => state.deleteSelectedSeats);
export const useDeleteSelectedAreaItems = () =>
  useCanvasStore((state) => state.deleteSelectedAreaItems);
export const useUpdateZoomedArea = () =>
  useCanvasStore((state) => state.updateZoomedArea);

export const useAreaActions = () => {
  const enterAreaMode = useEnterAreaMode();
  const exitAreaMode = useExitAreaMode();
  const addRowToArea = useAddRowToArea();
  const addSeatToRow = useAddSeatToRow();
  const selectRow = useSelectRow();
  const selectSeat = useSelectSeat();
  const clearAreaSelections = useClearAreaSelections();
  const updateRow = useUpdateRow();
  const updateSeat = useUpdateSeat();
  const deleteRow = useDeleteRow();
  const deleteSeat = useDeleteSeat();
  const selectMultipleSeats = useSelectMultipleSeats();
  const selectMultipleRows = useSelectMultipleRows();
  const addMultipleSeatsToRow = useAddMultipleSeatsToRow();
  const addMultipleRowsToArea = useAddMultipleRowsToArea();
  const updateRowPosition = useUpdateRowPosition();
  const updateMultipleRowPositions = useUpdateMultipleRowPositions();

  const deleteSelectedRows = useDeleteSelectedRows();
  const deleteSelectedSeats = useDeleteSelectedSeats();
  const deleteSelectedAreaItems = useDeleteSelectedAreaItems();

  return useMemo(
    () => ({
      enterAreaMode,
      exitAreaMode,
      addRowToArea,
      addSeatToRow,
      selectRow,
      selectSeat,
      clearAreaSelections,
      updateRow,
      updateSeat,
      deleteRow,
      deleteSeat,
      selectMultipleSeats,
      selectMultipleRows,
      addMultipleSeatsToRow,
      addMultipleRowsToArea,
      updateRowPosition,
      updateMultipleRowPositions,
      deleteSelectedRows,
      deleteSelectedSeats,
      deleteSelectedAreaItems,
    }),
    [
      enterAreaMode,
      exitAreaMode,
      addRowToArea,
      addSeatToRow,
      selectRow,
      selectSeat,
      clearAreaSelections,
      updateRow,
      updateSeat,
      deleteRow,
      deleteSeat,
      selectMultipleSeats,
      selectMultipleRows,
      addMultipleSeatsToRow,
      addMultipleRowsToArea,
      updateRowPosition,
      updateMultipleRowPositions,
      deleteSelectedRows,
      deleteSelectedSeats,
      deleteSelectedAreaItems,
    ]
  );
};

export const useLoadFromStorage = () =>
  useCanvasStore((state) => state.loadFromStorage);

export const useClearStorage = () =>
  useCanvasStore((state) => state.clearStorage);

export const useValidationErrors = () =>
  useCanvasStore((state) => state.validationErrors);
export const useShowValidationErrors = () =>
  useCanvasStore((state) => state.showValidationErrors);
export const useHighlightedSeats = () =>
  useCanvasStore((state) => state.highlightedSeats);

export const useValidationActions = () => {
  const store = useCanvasStore.getState();

  return useMemo(
    () => ({
      validateAllAreas: store.validateAllAreas || (() => {}),
      dismissValidationErrors: store.dismissValidationErrors || (() => {}),
      highlightSeatsInArea: store.highlightSeatsInArea || (() => {}),
      clearHighlightedSeats: store.clearHighlightedSeats || (() => {}),
      fixArea: store.fixArea || (() => {}),
    }),
    []
  );
};
