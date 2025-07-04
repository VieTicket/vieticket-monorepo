import { useRef, useCallback } from "react";
import {
  useCanvasStore,
  useAreaActions,
} from "@/components/seat-map/store/main-store";
import { useSelectionEvents } from "./events/useSelectionEvents";
import { useDrawingEvents } from "./events/useDrawingEvents";
import { usePolygonEvents } from "./events/usePolygonEvents";
import { useDragEvents } from "./events/useDragEvents";
import { useAreaZoom } from "./useAreaZoom";
import { useSeatDrawing } from "./useSeatDrawing";
import { SeatShape } from "@/types/seat-map-types";

export const useCanvasEvents = () => {
  const { currentTool, selectShape, clearSelection, zoom, pan, shapes } =
    useCanvasStore();

  // FIX: Move hook calls to the top level of the hook function
  const { selectRow, selectSeat, clearAreaSelections, addSeatToRow } =
    useAreaActions();

  const { addRowToArea } = useAreaActions();
  const { zoomedArea } = useAreaZoom();

  const selectionEvents = useSelectionEvents();
  const drawingEvents = useDrawingEvents();
  const polygonEvents = usePolygonEvents();
  const dragEvents = useDragEvents();
  const areaZoom = useAreaZoom();
  const seatDrawing = useSeatDrawing();

  // Track double-click
  const lastClickTime = useRef(0);
  const lastClickTarget = useRef<string | null>(null);

  const getCanvasCoordinates = (pointerPosition: any) => {
    return {
      x: (pointerPosition.x - pan.x) / zoom,
      y: (pointerPosition.y - pan.y) / zoom,
    };
  };

  const handleAddSeatToAreaRow = useCallback(
    (rowId: string, seat: Omit<SeatShape, "id">) => {
      if (!areaZoom.zoomedArea) return;

      // Use the hook we called at the top level
      addSeatToRow(rowId, seat);
    },
    [areaZoom.zoomedArea, addSeatToRow]
  );

  const findOrCreateRowForSeats = useCallback(
    (area: any): string => {
      if (!area) {
        console.error("Cannot find/create row: No area provided");
        return "error-no-area";
      }

      console.log("Finding or creating row for area:", area.id);
      console.log(
        "Area has rows:",
        Array.isArray(area.rows) ? area.rows.length : "no rows array"
      );

      if (!area.rows || area.rows.length === 0) {
        // No rows exist, create one
        const newRow = {
          id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Pre-generate ID
          type: "row" as const,
          name: "Row A",
          startX: area.points ? area.points[0] : 0,
          startY: area.points ? area.points[1] : 0,
          seatRadius: 8,
          seatSpacing: 20,
          rotation: 0,
          area: area.id || "",
          seats: [],
          fill: "#e0e0e0",
          stroke: "#666666",
          strokeWidth: 1,
          visible: true,
        };

        console.log("Creating new row:", newRow);

        // Use the hook we called at the top level
        addRowToArea(newRow);

        // Force a refresh of area from store
        const updatedArea = zoomedArea;
        console.log(
          "After creating row, area now has rows:",
          updatedArea && Array.isArray(updatedArea.rows)
            ? updatedArea.rows.length
            : "unknown"
        );

        return newRow.id; // Return the pre-generated ID
      }

      // Return the ID of the first row
      console.log("Using existing row:", area.rows[0].id);
      return area.rows[0].id;
    },
    [addRowToArea]
  );

  const handleShapeClick = useCallback(
    (shapeId: string, e: any) => {
      if (currentTool !== "select") return;
      e.cancelBubble = true;

      // Handle double-click for area zoom
      const currentTime = Date.now();
      const timeDiff = currentTime - lastClickTime.current;

      if (timeDiff < 300 && lastClickTarget.current === shapeId) {
        // Double-click detected
        const shape = shapes.find((s) => s.id === shapeId);
        if (shape && shape.type === "polygon") {
          areaZoom.handleAreaDoubleClick(shapeId);
          return;
        }
      }

      lastClickTime.current = currentTime;
      lastClickTarget.current = shapeId;

      // Regular single click
      const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;
      selectShape(shapeId, multiSelect);
      console.log("Shape clicked:", shapeId);
    },
    [currentTool, shapes, areaZoom, selectShape]
  );

  // FIX: Update seat click to handle multi-select
  const handleSeatClick = useCallback(
    (seatId: string, e: any) => {
      e.cancelBubble = true;

      const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;

      if (multiSelect) {
        // Multi-select: toggle seat selection
        selectSeat(seatId, true);
        console.log("Multi-select seat:", seatId);
      } else {
        // Find which row this seat belongs to
        const seatRow = areaZoom.zoomedArea?.rows?.find((row) =>
          row.seats?.some((seat) => seat.id === seatId)
        );

        if (seatRow) {
          // Single click on seat selects the row
          selectRow(seatRow.id, false);
          console.log("Seat clicked, selecting row:", seatRow.name);
        }
      }
    },
    [selectRow, selectSeat, areaZoom.zoomedArea]
  );

  // FIX: Update row click to handle multi-select
  const handleRowClick = useCallback(
    (rowId: string, e: any) => {
      e.cancelBubble = true;
      
      const multiSelect = e.evt?.ctrlKey || e.evt?.metaKey || false;
      selectRow(rowId, multiSelect);
      
      if (multiSelect) {
        console.log("Multi-select row:", rowId);
      } else {
        console.log("Single select row:", rowId);
      }
    },
    [selectRow]
  );

  // FIX: Add new handler for seat double-click
  const handleSeatDoubleClick = useCallback(
    (seatId: string, e: any) => {
      e.cancelBubble = true;

      // Double click on seat selects the individual seat
      selectSeat(seatId, false);
      console.log("Seat double-clicked, selecting seat:", seatId);
    },
    [selectSeat]
  );

  // FIX: Add new handler for row double-click (for editing row name)
  const handleRowDoubleClick = useCallback(
    (rowId: string, e: any) => {
      e.cancelBubble = true;

      // Double click on row could trigger row name editing
      // For now, just select the row
      selectRow(rowId, false);
      console.log("Row double-clicked for editing:", rowId);

      // TODO: Implement row name editing modal/inline editing
    },
    [selectRow]
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (e.target === e.target.getStage()) {
        clearSelection();
        clearAreaSelections(); // Also clear area selections
      }
    },
    [clearSelection, clearAreaSelections]
  );

  const handleStageMouseDown = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      const canvasCoords = getCanvasCoordinates(pointerPosition);

      const isStageTarget = e.target === stage;
      const isPolygonPreview =
        currentTool === "polygon" &&
        polygonEvents.isDrawingPolygon &&
        (e.target.constructor.name === "Line" ||
          e.target.attrs?.id === "preview" ||
          e.target.attrs?.id === "polygon-preview");

      if (!isStageTarget && !isPolygonPreview) {
        return;
      }
      switch (currentTool) {
        case "select":
          if (isStageTarget) {
            selectionEvents.handleSelectionMouseDown(canvasCoords, e);
          }
          break;
        case "polygon":
          polygonEvents.handlePolygonMouseDown(canvasCoords, e);
          break;
        // FIX: Remove row case
        case "seat-grid":
          if (isStageTarget) {
            if (seatDrawing.clickCount < 2) {
              seatDrawing.startSeatDrawing(canvasCoords, "grid");
            } else {
              // FIX: Pass the proper callback for adding seats to multiple rows
              seatDrawing.finishSeatDrawing(handleAddSeatsToMultipleRows);
            }
          }
          break;
        case "seat-row":
          if (isStageTarget) {
            if (seatDrawing.clickCount === 0) {
              seatDrawing.startSeatDrawing(canvasCoords, "row");
            } else {
              // FIX: Pass the proper callback for adding seats to a single row
              seatDrawing.finishSeatDrawing(handleAddSeatsToSingleRow);
            }
          }
          break;
        default:
          if (isStageTarget) {
            drawingEvents.handleDrawingMouseDown(canvasCoords, e);
          }
          break;
      }
    },
    [
      currentTool,
      getCanvasCoordinates,
      selectionEvents,
      polygonEvents,
      seatDrawing,
      drawingEvents,
      zoomedArea,
      findOrCreateRowForSeats,
    ]
  );

  // FIX: Add callback for handling seats that need to be added to multiple rows (grid)
  const handleAddSeatsToMultipleRows = useCallback(
    (seatsGroupedByRow: { [rowName: string]: SeatShape[] }) => {
      console.log("Adding seats to multiple rows:", seatsGroupedByRow);

      Object.entries(seatsGroupedByRow).forEach(([rowName, seats]) => {
        // Find existing row or create new one
        let existingRow = areaZoom.zoomedArea?.rows?.find(
          (row) => row.name === rowName
        );

        if (!existingRow) {
          // Create new row
          const newRow = {
            id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "row" as const,
            name: rowName,
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
          };

          addRowToArea(newRow);
          existingRow = newRow;
        }

        // Add seats to the row
        seats.forEach((seat) => {
          const { id, ...seatData } = seat;
          addSeatToRow(existingRow!.id, {
            ...seatData,
            row: rowName,
          });
        });
      });
    },
    [areaZoom.zoomedArea, addRowToArea, addSeatToRow]
  );

  // FIX: Add callback for handling seats that need to be added to a single row (row)
  const handleAddSeatsToSingleRow = useCallback(
    (seats: SeatShape[]) => {
      console.log("Adding seats to single row:", seats);

      if (seats.length === 0) return;

      const rowName = seats[0].row;
      let existingRow = areaZoom.zoomedArea?.rows?.find(
        (row) => row.name === rowName
      );

      if (!existingRow) {
        // Create new row
        const newRow = {
          id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "row" as const,
          name: rowName,
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
        };

        addRowToArea(newRow);
        existingRow = newRow;
      }

      // Add seats to the row
      seats.forEach((seat) => {
        const { id, ...seatData } = seat;
        addSeatToRow(existingRow!.id, {
          ...seatData,
          row: rowName,
        });
      });
    },
    [areaZoom.zoomedArea, addRowToArea, addSeatToRow]
  );

  // Implement other handlers with useCallback...
  const handleStageMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      const canvasCoords = getCanvasCoordinates(pointerPosition);

      if (currentTool === "select" && selectionEvents.isSelecting) {
        selectionEvents.handleSelectionMouseMove(canvasCoords);
      } else if (currentTool === "polygon" && polygonEvents.isDrawingPolygon) {
        polygonEvents.handlePolygonMouseMove(canvasCoords);
      } else if (
        (currentTool === "seat-grid" || currentTool === "seat-row") &&
        seatDrawing.isDrawing
      ) {
        seatDrawing.updateSeatPreview(canvasCoords);
      } else if (
        currentTool !== "select" &&
        currentTool !== "polygon" &&
        currentTool !== "seat-grid" &&
        currentTool !== "seat-row" &&
        drawingEvents.isDrawing
      ) {
        drawingEvents.handleDrawingMouseMove(canvasCoords);
      }
    },
    [
      currentTool,
      getCanvasCoordinates,
      selectionEvents,
      polygonEvents,
      seatDrawing,
      drawingEvents,
    ]
  );

  const handleStageMouseUp = useCallback(
    (e: any) => {
      if (currentTool === "select" && selectionEvents.isSelecting) {
        selectionEvents.handleSelectionMouseUp(e);
      } else if (
        currentTool !== "select" &&
        currentTool !== "polygon" &&
        currentTool !== "seat-grid" &&
        currentTool !== "seat-row" &&
        drawingEvents.isDrawing
      ) {
        drawingEvents.handleDrawingMouseUp(e);
      }
    },
    [currentTool, selectionEvents, drawingEvents]
  );

  const getPreviewShape = useCallback(() => {
    if (currentTool === "polygon") {
      return polygonEvents.previewShape;
    } else {
      return drawingEvents.previewShape;
    }
  }, [currentTool, polygonEvents.previewShape, drawingEvents.previewShape]);

  return {
    handleShapeClick,
    handleStageClick,
    ...dragEvents,

    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,

    getCanvasCoordinates,

    // Selection and drawing states
    selectionRect: selectionEvents.selectionRect,
    isSelecting: selectionEvents.isSelecting,
    previewShape: getPreviewShape(),
    isDrawing: drawingEvents.isDrawing,
    isDrawingPolygon: polygonEvents.isDrawingPolygon,
    polygonPoints: polygonEvents.polygonPoints,
    currentTool,

    // Drag state
    isDragging: dragEvents.isDragging,

    // Area and row functionality
    areaZoom,
    seatDrawing,

    // Area-specific handlers
    handleRowClick,
    handleSeatClick,
    handleSeatDoubleClick, // Add new handler
    handleRowDoubleClick,

    // Polygon methods
    cancelPolygon: polygonEvents.cancelPolygon,
    finishPolygon: polygonEvents.finishPolygon,
    isNearFirstPoint: polygonEvents.isNearFirstPoint,
  };
};
