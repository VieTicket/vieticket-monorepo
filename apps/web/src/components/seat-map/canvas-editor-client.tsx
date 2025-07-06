"use client";

import { useRef, useEffect, useCallback } from "react";
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
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    shapes,
    selectedShapeIds,
    canvasSize,
    viewportSize,
    zoom,
    pan,
    currentTool,
    showGrid,
    showHitCanvas,
  } = useCanvasStore();

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
  }, [viewportSize.width, viewportSize.height]);

  useEffect(() => {
    if (showHitCanvas && stageRef.current) {
      const timer = setTimeout(() => {
        const stage = stageRef.current;
        const layer = stage?.getLayers()[0];
        if (layer) {
          const hitCanvas = layer.getHitCanvas();
          if (hitCanvas && hitCanvas._canvas) {
            const canvas = hitCanvas._canvas;

            const existingDebugCanvas =
              document.getElementById("debug-hit-canvas");
            if (existingDebugCanvas) {
              existingDebugCanvas.remove();
            }

            const debugCanvas = document.createElement("canvas");
            debugCanvas.id = "debug-hit-canvas";
            debugCanvas.width = canvas.width;
            debugCanvas.height = canvas.height;
            debugCanvas.style.position = "absolute";
            debugCanvas.style.top = "0";
            debugCanvas.style.left = "0";
            debugCanvas.style.pointerEvents = "none";
            debugCanvas.style.opacity = "0.5";
            debugCanvas.style.zIndex = "1000";
            debugCanvas.style.border = "2px solid red";

            const debugCtx = debugCanvas.getContext("2d");
            if (debugCtx && canvas) {
              debugCtx.drawImage(canvas, 0, 0);
            }

            const canvasContainer = document.querySelector(".canvas-container");
            if (canvasContainer) {
              canvasContainer.appendChild(debugCanvas);
            }
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    } else {
      const existingDebugCanvas = document.getElementById("debug-hit-canvas");
      if (existingDebugCanvas) {
        existingDebugCanvas.remove();
      }
    }
  }, [showHitCanvas, shapes, zoom, pan]);

  const renderGrid = useCallback(() => {
    if (!showGrid) return null;

    const gridSize = 50;
    const lines = [];

    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize;
    const endX =
      Math.ceil((viewportSize.width - pan.x) / zoom / gridSize) * gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize;
    const endY =
      Math.ceil((viewportSize.height - pan.y) / zoom / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, startY, x, endY]}
          stroke="#e0e0e0"
          strokeWidth={1 / zoom}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    for (let y = startY; y <= endY; y += gridSize) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[startX, y, endX, y]}
          stroke="#e0e0e0"
          strokeWidth={1 / zoom}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    return lines;
  }, [showGrid, viewportSize, zoom, pan]);

  // FIX: Update selection rectangle rendering to work in area mode
  const renderSelectionRectangle = useCallback(() => {
    if (!eventHandlers.selectionRect || !eventHandlers.isSelecting) return null;

    // FIX: Show selection rectangle in both main mode and area mode
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

  const renderShapeWithProps = useCallback(
    (shape: any, isPreview = false) => {
      const isSelected = !isPreview && selectedShapeIds.includes(shape.id);

      const isInAreaMode = eventHandlers.areaZoom.isInAreaMode;
      const zoomedAreaId = eventHandlers.areaZoom.zoomedArea?.id;
      const isCurrentZoomedArea = isInAreaMode && shape.id === zoomedAreaId;

      if (isInAreaMode && !isCurrentZoomedArea) {
        return null; // Don't render other shapes in area mode
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
        isInAreaMode: isInAreaMode,
        zoomedAreaId: zoomedAreaId,
        selectedRowIds: eventHandlers.areaZoom.selectedRowIds || [],
        selectedSeatIds: eventHandlers.areaZoom.selectedSeatIds || [],
        onRowClick: eventHandlers.handleRowClick,
        onSeatClick: eventHandlers.handleSeatClick,
        // FIX: Add the new double-click handlers
        onRowDoubleClick: eventHandlers.handleRowDoubleClick,
        onSeatDoubleClick: eventHandlers.handleSeatDoubleClick,
      });
    },
    [selectedShapeIds, currentTool, eventHandlers]
  );

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
      case "row":
        return "crosshair";
      default:
        return "default";
    }
  };

  const renderSeatPreviews = useCallback(() => {
    if (!eventHandlers.seatDrawing.previewSeats.length) return null;

    return eventHandlers.seatDrawing.previewSeats.map((seat, index) => (
      <Circle
        key={`preview-seat-${index}`}
        x={seat.x}
        y={seat.y}
        radius={seat.radius}
        fill={seat.fill}
        stroke={seat.stroke}
        strokeWidth={seat.strokeWidth}
        opacity={0.7}
        listening={false}
      />
    ));
  }, [eventHandlers.seatDrawing.previewSeats]);

  const selectedShapes = shapes.filter((shape) =>
    selectedShapeIds.includes(shape.id)
  );

  const shouldShowSelectionOverlay = () => {
    if (currentTool !== "select") return false;

    if (selectedShapes.length === 0) return false;

    if (eventHandlers.isDragging) return false;

    if (eventHandlers.isSelecting) return false;

    return true;
  };

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
          {showGrid && !eventHandlers.areaZoom.isInAreaMode && renderGrid()}

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

          {eventHandlers.areaZoom.isInAreaMode && renderSeatPreviews()}

          {renderSelectionRectangle()}

          {!eventHandlers.areaZoom.isInAreaMode &&
            shouldShowSelectionOverlay() && (
              <SelectionOverlay
                selectedShapes={selectedShapes}
                // onResize={(shapeId, newBounds) => {
                //   console.log("Resize shape:", shapeId, newBounds);
                // }}
              />
            )}
        </Layer>
      </Stage>

      <div className="absolute bottom-20 left-20 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm">
        Zoom: {Math.round(zoom * 100)}% | X: {Math.round(pan.x)} | Y:{" "}
        {Math.round(pan.y)}
        {showGrid && <span className="text-green-600 ml-2">Grid ON</span>}
      </div>
    </div>
  );
}
