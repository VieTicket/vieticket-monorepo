"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Stage, Layer } from "react-konva";
import { renderShape } from "./utils/shape-renderer";
import { useStageRef } from "./providers/stage-provider";
import { PolygonShape, RectShape, Shape } from "@/types/seat-map-types";

interface SeatMapCanvasCustomerProps {
  seatMapData: any;
  seatingStructure: any[];
  selectedSeats: string[];
  onSeatClick: (seatId: string, isAvailable: boolean) => void;
  getSeatStatus: (seatId: string) => string;
}

export default function SeatMapCanvasCustomer({
  seatMapData,
  seatingStructure,
  selectedSeats,
  onSeatClick,
  getSeatStatus,
}: SeatMapCanvasCustomerProps) {
  const stageRef = useStageRef();
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Handle viewport resize
  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current?.container();
      if (container) {
        const parent = container.parentElement;
        if (parent) {
          setViewportSize({
            width: parent.clientWidth,
            height: parent.clientHeight,
          });
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const getSeatFillColor = (status: string, isSelected: boolean) => {
    if (isSelected) return "#3b82f6"; // blue-500

    switch (status) {
      case "sold":
        return "#ef4444"; // red-500
      case "held":
        return "#f59e0b"; // amber-500
      case "available":
        return "#10b981"; // emerald-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  const getSeatStrokeColor = (status: string, isSelected: boolean) => {
    if (isSelected) return "#1d4ed8"; // blue-700
    return "#374151"; // gray-700
  };

  const enhancedShapes = useMemo(() => {
    if (!seatMapData?.shapes || !seatingStructure) return [];

    return seatMapData.shapes.map((shape: any) => {
      if (shape.type === "polygon" && shape.rows) {
        const matchingArea = seatingStructure.find(
          (area) => area.name === shape.name
        );

        if (matchingArea) {
          // Enhance rows with seat status and pricing
          const enhancedRows = shape.rows.map((row: any) => {
            const matchingRow = matchingArea.rows.find(
              (r: any) => r.rowName === row.name
            );

            if (matchingRow) {
              const enhancedSeats = row.seats.map((seat: any) => {
                const matchingSeat = matchingRow.seats.find(
                  (s: any) => s.seatNumber === seat.number.toString()
                );

                if (matchingSeat) {
                  const status = getSeatStatus(matchingSeat.id);
                  const isSelected = selectedSeats.includes(matchingSeat.id);

                  return {
                    ...seat,
                    id: matchingSeat.id,
                    status,
                    isSelected,
                    price: matchingArea.price,
                    fill: getSeatFillColor(status, isSelected),
                    stroke: getSeatStrokeColor(status, isSelected),
                    strokeWidth: isSelected ? 3 : 1,
                  };
                }
                return seat;
              });

              return {
                ...row,
                seats: enhancedSeats,
              };
            }
            return row;
          });

          return {
            ...shape,
            rows: enhancedRows,
          };
        }
      }
      return shape;
    });
  }, [seatMapData?.shapes, seatingStructure, selectedSeats, getSeatStatus]);

  // Pan and zoom handlers
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    setZoom(clampedScale);
    setPan({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  const handleMouseDown = useCallback((e: any) => {
    if (e.evt.button === 2 || e.evt.ctrlKey) {
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isDragging) return;

      const dx = e.evt.movementX;
      const dy = e.evt.movementY;

      setPan((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Customer-specific seat click handler
  const handleSeatClick = useCallback(
    (seatId: string, seatData: any) => {
      console.log("Seat clicked:", seatId, seatData);
      if (!seatData) return;

      const isAvailable = getSeatStatus(seatId) === "available";
      onSeatClick(seatId, isAvailable);
    },
    [onSeatClick]
  );

  // Area events for customer interaction
  const areaEvents = useMemo(
    () => ({
      onSeatClick: handleSeatClick,
      onSeatDoubleClick: (seatId: string, e: any) => {
        // Prevent double click from bubbling
        e.cancelBubble = true;
      },
    }),
    [handleSeatClick]
  );

  // Render shapes with customer-specific behavior
  const renderCustomerShape = (shape: any) => {
    const commonProps = {
      key: shape.id,
      x: shape.x,
      y: shape.y,
      draggable: false,
      listening: shape.type === "polygon", // Only polygon areas are interactive for customers
      perfectDrawEnabled: false,
    };

    return renderShape({
      shape,
      isSelected: false,
      commonProps,
      isInAreaMode: true, // Always show seats for customers
      zoomedAreaId: shape.id,
      selectedRowIds: [],
      selectedSeatIds: selectedSeats,
      areaEvents,
    });
  };

  // Center the canvas on load
  useEffect(() => {
    if (enhancedShapes.length > 0 && viewportSize.width > 0) {
      // Calculate bounds of all shapes
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      enhancedShapes.forEach((shape: Shape) => {
        if ((shape as PolygonShape).points) {
          (shape as PolygonShape).points.forEach((point: any) => {
            minX = Math.min(minX, shape.x + point.x);
            minY = Math.min(minY, shape.y + point.y);
            maxX = Math.max(maxX, shape.x + point.x);
            maxY = Math.max(maxY, shape.y + point.y);
          });
        } else {
          minX = Math.min(minX, shape.x);
          minY = Math.min(minY, shape.y);
          maxX = Math.max(maxX, shape.x + ((shape as RectShape).width || 100));
          maxY = Math.max(maxY, shape.y + ((shape as RectShape).height || 100));
        }
      });

      if (isFinite(minX)) {
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const scaleX = (viewportSize.width * 0.8) / contentWidth;
        const scaleY = (viewportSize.height * 0.8) / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setZoom(scale);
        setPan({
          x: viewportSize.width / 2 - centerX * scale,
          y: viewportSize.height / 2 - centerY * scale,
        });
      }
    }
  }, [enhancedShapes, viewportSize]);

  return (
    <div className="w-full h-full bg-gray-100 relative">
      <Stage
        ref={stageRef}
        width={viewportSize.width}
        height={viewportSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>{enhancedShapes.map(renderCustomerShape)}</Layer>
      </Stage>
    </div>
  );
}
