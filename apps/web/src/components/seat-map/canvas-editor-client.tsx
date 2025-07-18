"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Line, Group, Circle } from "react-konva";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useCanvasEvents } from "./hooks/useCanvasEvents";
import { useCanvasResize } from "./hooks/useCanvasResize";
import { usePanZoom } from "./hooks/usePanZoom";
import { renderShape } from "./utils/shape-renderer";
import { buildShapeProps } from "./utils/shape-props-builder";
import { SelectionOverlay } from "./utils/selection-overlay";
import { useKeyMap } from "./hooks/useKeyMap";
import { useStageRef } from "./providers/stage-provider";

export default function CanvasEditorClient() {
  const hasInitialized = useRef(false);
  const stageRef = useStageRef();

  const { shapes, selectedShapeIds, viewportSize, zoom, pan, currentTool } =
    useCanvasStore();

  const eventHandlers = useCanvasEvents();
  const panZoomHandlers = usePanZoom();

  const { isInitialLoad } = useCanvasResize();
  useKeyMap();

  useEffect(() => {
    if (
      viewportSize.width > 0 &&
      viewportSize.height > 0 &&
      !hasInitialized.current
    ) {
      setTimeout(() => {
        panZoomHandlers.centerCanvas();
        hasInitialized.current = true;
      }, 100);
    }
  }, []);

  const renderSelectionRectangle = useMemo(() => {
    if (!eventHandlers.selectionRect || !eventHandlers.isSelecting) return null;

    return (
      <Rect
        x={eventHandlers.selectionRect.x}
        y={eventHandlers.selectionRect.y}
        width={eventHandlers.selectionRect.width}
        height={eventHandlers.selectionRect.height}
        fill="rgba(0, 162, 255, 0.1)"
        stroke="rgba(0, 162, 255, 0.6)"
        strokeWidth={1}
        dash={[5, 5]}
        listening={false}
      />
    );
  }, [eventHandlers.selectionRect, eventHandlers.isSelecting]);

  const { isInAreaMode, zoomedArea, selectedRowIds, selectedSeatIds } = useMemo(
    () => ({
      isInAreaMode: eventHandlers.areaZoom.isInAreaMode,
      zoomedArea: eventHandlers.areaZoom.zoomedArea,
      selectedRowIds: eventHandlers.areaZoom.selectedRowIds || [],
      selectedSeatIds: eventHandlers.areaZoom.selectedSeatIds || [],
    }),
    [
      eventHandlers.areaZoom.isInAreaMode,
      eventHandlers.areaZoom.zoomedArea,
      eventHandlers.areaZoom.selectedRowIds,
      eventHandlers.areaZoom.selectedSeatIds,
    ]
  );

  const areaEvents = useMemo(
    () => ({
      onRowClick: eventHandlers.handleRowClick,
      onSeatClick: eventHandlers.handleSeatClick,
      onRowDoubleClick: eventHandlers.handleRowDoubleClick,
      onSeatDoubleClick: eventHandlers.handleSeatDoubleClick,
      onRowDragStart: eventHandlers.handleRowDragStart,
      onRowDragMove: eventHandlers.handleRowDragMove,
      onRowDragEnd: eventHandlers.handleRowDragEnd,
      onSeatDragStart: eventHandlers.handleSeatDragStart,
      onSeatDragMove: eventHandlers.handleSeatDragMove,
      onSeatDragEnd: eventHandlers.handleSeatDragEnd,
    }),
    [
      eventHandlers.handleRowClick,
      eventHandlers.handleSeatClick,
      eventHandlers.handleRowDoubleClick,
      eventHandlers.handleSeatDoubleClick,
      eventHandlers.handleRowDragStart,
      eventHandlers.handleRowDragMove,
      eventHandlers.handleRowDragEnd,
      eventHandlers.handleSeatDragStart,
      eventHandlers.handleSeatDragMove,
      eventHandlers.handleSeatDragEnd,
    ]
  );

  const renderShapeWithProps = (shape: any, isPreview = false) => {
    const isSelected = !isPreview && selectedShapeIds.includes(shape.id);
    const zoomedAreaId = zoomedArea?.id;
    const isCurrentZoomedArea = isInAreaMode && shape.id === zoomedAreaId;

    if (isInAreaMode && !isCurrentZoomedArea) {
      return null;
    }

    const commonProps = buildShapeProps(shape, isSelected, eventHandlers);

    if (isPreview || currentTool !== "select" || isInAreaMode) {
      commonProps.draggable = false;

      commonProps.onClick = () => {};
      commonProps.onDragStart = () => {};
      commonProps.onDragMove = () => {};
      commonProps.onDragEnd = () => {};

      if (isInAreaMode && !isCurrentZoomedArea) {
        commonProps.listening = false;
      }
    }

    const shapeKey = isPreview ? `preview-${shape.id}` : shape.id;

    return renderShape({
      shape,
      isSelected,
      commonProps: {
        ...commonProps,
        key: shapeKey,
        perfectDrawEnabled: false,
      },
      isInAreaMode,
      zoomedAreaId,
      selectedRowIds,
      selectedSeatIds,
      areaEvents,
      isCustomerView: false, // Explicitly set to false for editor
    });
  };

  const getCursor = () => {
    switch (currentTool) {
      case "select":
        return "default";
      case "rect":
      case "circle":
      case "polygon":
        return "crosshair";
      case "text":
        return "text";
      default:
        return "default";
    }
  };

  const renderSeatPreviews = useMemo(() => {
    if (!eventHandlers.seatDrawing.previewSeats.length) return null;

    const polygonCenter = eventHandlers.areaZoom.zoomedArea?.center || {
      x: 0,
      y: 0,
    };

    return eventHandlers.seatDrawing.previewSeats.map((seat, index) => (
      <Circle
        key={`preview-seat-${index}`}
        x={polygonCenter.x + seat.x}
        y={polygonCenter.y + seat.y}
        radius={seat.radius}
        fill={seat.fill}
        stroke={seat.stroke}
        strokeWidth={seat.strokeWidth}
        opacity={0.7}
        listening={false}
      />
    ));
  }, [
    eventHandlers.seatDrawing.previewSeats,
    eventHandlers.areaZoom.zoomedArea,
  ]);

  const selectedShapes = useMemo(
    () => shapes.filter((shape) => selectedShapeIds.includes(shape.id)),
    [shapes, selectedShapeIds]
  );

  const shouldShowSelectionOverlay = () => {
    if (currentTool !== "select") return false;

    if (selectedShapes.length === 0) return false;

    if (eventHandlers.isDragging) return false;

    if (eventHandlers.isSelecting) return false;

    return true;
  };

  const renderGuideLines = useMemo(() => {
    if (!eventHandlers?.guideLines || eventHandlers.guideLines.length === 0) {
      return null;
    }

    return eventHandlers.guideLines.map((line, index) => (
      <Line
        key={`guide-line-${index}`}
        points={[line.start.x, line.start.y, line.end.x, line.end.y]}
        stroke={
          line.type === "horizontal"
            ? "#3498db"
            : line.type === "vertical"
              ? "#2ecc71"
              : line.type === "perpendicular"
                ? "#9b59b6"
                : "#e74c3c"
        }
        strokeWidth={1 / zoom}
        dash={[5, 5]}
        opacity={0.7}
        listening={false}
        perfectDrawEnabled={false}
      />
    ));
  }, [eventHandlers.guideLines, zoom]);

  return (
    <div
      className={`canvas-container relative h-screen w-full ${
        eventHandlers.areaZoom.isInAreaMode ? "bg-gray-200" : "bg-gray-100"
      }`}
    >
      <Stage
        ref={stageRef}
        width={viewportSize.width}
        height={viewportSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onClick={eventHandlers.handleStageClick}
        onMouseDown={(e) => {
          eventHandlers.handleStageMouseDown(e);

          if (
            (currentTool === "select" &&
              !eventHandlers.areaZoom.isInAreaMode) ||
            e.evt.button !== 0
          ) {
            panZoomHandlers.handleMouseDown(e);
          }
        }}
        onMouseMove={(e) => {
          eventHandlers.handleStageMouseMove(e);

          if (
            (currentTool === "select" &&
              !eventHandlers.areaZoom.isInAreaMode) ||
            e.evt.button !== 0
          ) {
            panZoomHandlers.handleMouseMove(e);
          }
        }}
        onMouseUp={(e) => {
          eventHandlers.handleStageMouseUp(e);
          if (!eventHandlers.areaZoom.isInAreaMode) {
            panZoomHandlers.handleMouseUp(e);
          }
        }}
        onWheel={
          !eventHandlers.areaZoom.isInAreaMode
            ? panZoomHandlers.handleWheel
            : undefined
        }
        className="absolute top-0 left-0"
        style={{ cursor: getCursor() }}
      >
        <Layer clearBeforeDraw={true}>
          {shapes
            .filter((shape) => {
              if (!eventHandlers.areaZoom.isInAreaMode) return true;

              return shape.id === eventHandlers.areaZoom.zoomedArea?.id;
            })
            .map((shape) => renderShapeWithProps(shape, false))}

          {eventHandlers.previewShape &&
            currentTool !== "select" &&
            (!eventHandlers.areaZoom.isInAreaMode ||
              ["row", "seat-grid", "seat-row"].includes(currentTool)) &&
            renderShapeWithProps(
              { ...eventHandlers.previewShape, id: "preview" },
              true
            )}

          {currentTool === "polygon" && renderGuideLines}

          {eventHandlers.areaZoom.isInAreaMode && renderSeatPreviews}

          {renderSelectionRectangle}

          {!eventHandlers.areaZoom.isInAreaMode &&
            shouldShowSelectionOverlay() && (
              <SelectionOverlay selectedShapes={selectedShapes} />
            )}
        </Layer>
      </Stage>
      <div className="absolute bottom-16 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm">
        Zoom: {Math.round(zoom * 100)}% | X: {Math.round(pan.x)} | Y:{" "}
        {Math.round(pan.y)}
      </div>
    </div>
  );
}
