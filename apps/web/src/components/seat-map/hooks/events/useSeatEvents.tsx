import { useCallback } from "react";
import { useSeatDrawing } from "../useSeatDrawing";
import { useInAreaEvents } from "./useInAreaEvents";

export const useSeatEvents = () => {
  const seatDrawing = useSeatDrawing();
  const areaEvents = useInAreaEvents();

  const handleSeatGridMouseDown = useCallback(
    (canvasCoords: { x: number; y: number }) => {
      if (seatDrawing.clickCount < 2) {
        seatDrawing.startSeatDrawing(canvasCoords, "grid");
      } else {
        // Pass the proper callback for adding seats to multiple rows
        seatDrawing.finishSeatDrawing(areaEvents.handleAddSeatsToMultipleRows);
      }
    },
    [seatDrawing, areaEvents.handleAddSeatsToMultipleRows]
  );

  const handleSeatRowMouseDown = useCallback(
    (canvasCoords: { x: number; y: number }) => {
      if (seatDrawing.clickCount === 0) {
        seatDrawing.startSeatDrawing(canvasCoords, "row");
      } else {
        // Pass the proper callback for adding seats to a single row
        seatDrawing.finishSeatDrawing(areaEvents.handleAddSeatsToSingleRow);
      }
    },
    [seatDrawing, areaEvents.handleAddSeatsToSingleRow]
  );

  const handleSeatMouseMove = useCallback(
    (canvasCoords: { x: number; y: number }) => {
      if (seatDrawing.isDrawing) {
        seatDrawing.updateSeatPreview(canvasCoords);
      }
    },
    [seatDrawing]
  );

  return {
    handleSeatGridMouseDown,
    handleSeatRowMouseDown,
    handleSeatMouseMove,
    seatDrawing,
  };
};
