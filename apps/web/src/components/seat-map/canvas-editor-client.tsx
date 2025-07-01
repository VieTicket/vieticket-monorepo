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

  const renderShapeWithProps = useCallback(
    (shape: any, isPreview = false) => {
      const isSelected = !isPreview && selectedShapeIds.includes(shape.id);
      const commonProps = buildShapeProps(shape, isSelected, eventHandlers);

      if (isPreview || currentTool !== "select") {
        commonProps.draggable = false;
        commonProps.onClick = () => {};
        commonProps.onDragStart = () => {};
        commonProps.onDragMove = () => {};
        commonProps.onDragEnd = () => {};
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
        isInAreaMode: eventHandlers.areaZoom.isInAreaMode,
        zoomedAreaId: eventHandlers.areaZoom.zoomedArea?.id,
        selectedRowIds: [],
        selectedSeatIds: [],
        onRowClick: eventHandlers.handleRowClick,
        onSeatClick: eventHandlers.handleSeatClick,
      });
    },
    [selectedShapeIds, currentTool, eventHandlers]
  );

  // const renderRowPreview = useCallback(() => {
  //   if (!eventHandlers.rowDrawing.previewRow) return null;

  //   const { row, seats } = eventHandlers.rowDrawing.previewRow;

  //   return (
  //     <Group key="row-preview">
  //       {seats.length > 1 && (
  //         <Line
  //           points={[
  //             seats[0].x,
  //             seats[0].y,
  //             seats[seats.length - 1].x,
  //             seats[seats.length - 1].y,
  //           ]}
  //           stroke="#FF6B6B"
  //           strokeWidth={2}
  //           dash={[5, 5]}
  //           opacity={0.7}
  //           listening={false}
  //         />
  //       )}

  //       {seats.map((seat, index) => (
  //         <Circle
  //           key={`preview-seat-${index}`}
  //           x={seat.x}
  //           y={seat.y}
  //           radius={seat.radius}
  //           fill={seat.fill}
  //           stroke={seat.stroke}
  //           strokeWidth={seat.strokeWidth}
  //           opacity={0.7}
  //           listening={false}
  //         />
  //       ))}
  //     </Group>
  //   );
  // }, [eventHandlers.rowDrawing.previewRow]);

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
    <div className="canvas-container relative bg-gray-100 h-screen w-full">
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
          if (currentTool === "select" || e.evt.button !== 0) {
            panZoomHandlers.handleMouseDown(e);
          }
        }}
        onMouseMove={(e) => {
          eventHandlers.handleStageMouseMove(e);
          if (currentTool === "select" || e.evt.button !== 0) {
            panZoomHandlers.handleMouseMove(e);
          }
        }}
        onMouseUp={(e) => {
          eventHandlers.handleStageMouseUp(e);
          panZoomHandlers.handleMouseUp(e);
        }}
        onWheel={panZoomHandlers.handleWheel}
        className="absolute top-0 left-0"
        style={{ cursor: getCursor() }}
      >
        <Layer clearBeforeDraw={true}>
          {showGrid && renderGrid()}

          {shapes.map((shape) => renderShapeWithProps(shape, false))}

          {eventHandlers.previewShape &&
            currentTool !== "select" &&
            renderShapeWithProps(
              { ...eventHandlers.previewShape, id: "preview" },
              true
            )}

          {/* {renderRowPreview()}

          {renderSeatPreviews()} */}

          {shouldShowSelectionOverlay() && (
            <SelectionOverlay
              selectedShapes={selectedShapes}
              onResize={(shapeId, newBounds) => {
                console.log("Resize shape:", shapeId, newBounds);
              }}
            />
          )}
        </Layer>
      </Stage>

      <div className="absolute bottom-16 left-32 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm">
        Zoom: {Math.round(zoom * 100)}% | X: {Math.round(pan.x)} | Y:{" "}
        {Math.round(pan.y)}
        {showGrid && <span className="text-green-600 ml-2">Grid ON</span>}
        {eventHandlers.isDragging && (
          <span className="text-orange-600 ml-2">DRAGGING</span>
        )}
        {eventHandlers.areaZoom.isInAreaMode && (
          <span className="text-blue-600 ml-2">
            AREA MODE:{" "}
            {eventHandlers.areaZoom.zoomedArea?.name || "Unnamed Area"}
          </span>
        )}
        {/* {eventHandlers.rowDrawing.isDrawingRow && (
          <span className="text-purple-600 ml-2">DRAWING ROW</span>
        )} */}
      </div>
    </div>
  );
}
