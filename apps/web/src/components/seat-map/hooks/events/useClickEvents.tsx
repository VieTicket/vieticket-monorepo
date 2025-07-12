import { useCallback, useRef } from "react";
import {
  useCanvasStore,
  useAreaMode,
  useAreaActions,
} from "@/components/seat-map/store/main-store";
import { useAreaZoom } from "../useAreaZoom";

export interface ClickContext {
  isInAreaMode: boolean;
  currentTool: string;
  shapes: any[];
  zoomedArea: any;
}

export interface ClickHandlers {
  selectShape: (id: string, multiSelect: boolean) => void;
  selectRow: (id: string, multiSelect: boolean) => void;
  selectSeat: (id: string, multiSelect: boolean) => void;
  clearSelection: () => void;
  clearAreaSelections: () => void;
  handleAreaDoubleClick: (areaId: string) => void;
}

export const useClickEvents = () => {
  const lastClickTime = useRef(0);
  const lastClickTarget = useRef<string | null>(null);
  const lastClickType = useRef<"shape" | "row" | "seat" | null>(null);

  const { currentTool, shapes, selectShape, clearSelection } = useCanvasStore();

  const { isInAreaMode, zoomedArea } = useAreaMode();
  const { selectRow, selectSeat, clearAreaSelections } = useAreaActions();
  const areaZoom = useAreaZoom();

  const context: ClickContext = {
    isInAreaMode,
    currentTool,
    shapes,
    zoomedArea,
  };

  const handlers: ClickHandlers = {
    selectShape,
    selectRow,
    selectSeat,
    clearSelection,
    clearAreaSelections,
    handleAreaDoubleClick: areaZoom.handleAreaDoubleClick,
  };

  const handleClick = useCallback(
    (itemId: string, itemType: "shape" | "row" | "seat", e: any) => {
      if (context.currentTool !== "select") return;

      e.cancelBubble = true;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastClickTime.current;
      const isDoubleClick =
        timeDiff < 300 &&
        lastClickTarget.current === itemId &&
        lastClickType.current === itemType;

      if (isDoubleClick) {
        handleDoubleClick(itemId, itemType, e, context, handlers);
      } else {
        handleSingleClick(itemId, itemType, e, context, handlers);
      }

      lastClickTime.current = currentTime;
      lastClickTarget.current = itemId;
      lastClickType.current = itemType;
    },
    [context, handlers]
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (e.target === e.target.getStage()) {
        handlers.clearSelection();
        if (context.isInAreaMode) {
          handlers.clearAreaSelections();
        }
      }
    },
    [context.isInAreaMode, handlers]
  );

  return {
    handleShapeClick: (shapeId: string, e: any) =>
      handleClick(shapeId, "shape", e),
    handleRowClick: (rowId: string, e: any) => handleClick(rowId, "row", e),
    handleSeatClick: (seatId: string, e: any) => handleClick(seatId, "seat", e),
    handleStageClick,
  };
};

// Helper Functions
const handleSingleClick = (
  itemId: string,
  itemType: "shape" | "row" | "seat",
  e: any,
  context: ClickContext,
  handlers: ClickHandlers
) => {
  const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;

  switch (itemType) {
    case "shape":
      handlers.selectShape(itemId, multiSelect);
      break;

    case "row":
      if (context.isInAreaMode) {
        handlers.selectRow(itemId, multiSelect);
      }
      break;

    case "seat":
      if (context.isInAreaMode) {
        if (multiSelect) {
          // Multi-select: toggle seat selection
          handlers.selectSeat(itemId, true);
        } else {
          // Single click on seat selects the row
          const seatRow = context.zoomedArea?.rows?.find((row: any) =>
            row.seats?.some((seat: any) => seat.id === itemId)
          );
          if (seatRow) {
            handlers.selectRow(seatRow.id, false);
          }
        }
      }
      break;
  }
};

const handleDoubleClick = (
  itemId: string,
  itemType: "shape" | "row" | "seat",
  e: any,
  context: ClickContext,
  handlers: ClickHandlers
) => {
  switch (itemType) {
    case "shape":
      const shape = context.shapes.find((s) => s.id === itemId);
      if (shape && shape.type === "polygon") {
        handlers.handleAreaDoubleClick(itemId);
      }
      break;

    case "row":
      if (context.isInAreaMode) {
        // Double click on row could trigger row name editing
        handlers.selectRow(itemId, false);
        // TODO: Implement row name editing modal/inline editing
      }
      break;

    case "seat":
      if (context.isInAreaMode) {
        // Double click on seat selects the individual seat
        handlers.selectSeat(itemId, false);
      }
      break;
  }
};
