"use client";

import { useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Line } from "react-konva";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useCanvasEvents } from "./hooks/useCanvasEvents";
import { useCanvasResize } from "./hooks/useCanvasResize";
import { usePanZoom } from "./hooks/usePanZoom";
import { renderShape } from "./utils/shape-renderer";
import { buildShapeProps } from "./utils/shape-props-builder";

export default function CanvasEditorClient() {
  const stageRef = useRef(null);
  const hasInitialized = useRef(false);

  const { shapes, selectedShapeIds, canvasSize, viewportSize, zoom, pan } =
    useCanvasStore();

  const eventHandlers = useCanvasEvents();
  const panZoomHandlers = usePanZoom();

  const { isInitialLoad } = useCanvasResize();

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
  }, [viewportSize.width, viewportSize.height]); // Remove panZoomHandlers.centerCanvas from dependencies

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      panZoomHandlers.handleKeyDown(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panZoomHandlers.handleKeyDown]);

  // Add context menu handler
  const handleContextMenu = useCallback((e: any) => {
    e.evt.preventDefault();
  }, []);

  const renderShapeWithProps = (shape: any) => {
    const isSelected = selectedShapeIds.includes(shape.id);
    const commonProps = buildShapeProps(shape, isSelected, eventHandlers);

    return renderShape({ shape, isSelected, commonProps });
  };

  const renderGrid = useCallback(() => {
    // Only show grid when zoomed in enough
    if (zoom < 0.5) return null;

    const gridSize = 50;
    const { width, height } = canvasSize;

    // Calculate visible area to only render visible grid lines
    const visibleLeft = Math.max(0, -pan.x / zoom);
    const visibleTop = Math.max(0, -pan.y / zoom);
    const visibleRight = Math.min(width, (-pan.x + viewportSize.width) / zoom);
    const visibleBottom = Math.min(
      height,
      (-pan.y + viewportSize.height) / zoom
    );

    const lines = [];

    // Vertical lines (only visible ones)
    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const endX = Math.ceil(visibleRight / gridSize) * gridSize;
    for (let i = startX; i <= endX; i += gridSize) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, visibleTop, i, visibleBottom]}
          stroke="#C0C0C0"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }

    // Horizontal lines (only visible ones)
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    const endY = Math.ceil(visibleBottom / gridSize) * gridSize;
    for (let i = startY; i <= endY; i += gridSize) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[visibleLeft, i, visibleRight, i]}
          stroke="#C0C0C0"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }

    return lines;
  }, [canvasSize, zoom, pan, viewportSize]);

  const renderCanvasBorder = useCallback(() => {
    return (
      <Rect
        x={0}
        y={0}
        width={canvasSize.width}
        height={canvasSize.height}
        stroke="#666"
        strokeWidth={2}
        fill="transparent"
        listening={false}
        dash={[10, 5]}
      />
    );
  }, [canvasSize]);

  const renderSelectionRectangle = useCallback(() => {
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
  return (
    <div className="canvas-container relative bg-gray-100 h-full w-full">
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
          panZoomHandlers.handleMouseDown(e);
        }}
        onMouseMove={(e) => {
          eventHandlers.handleStageMouseMove(e);
          panZoomHandlers.handleMouseMove(e);
        }}
        onMouseUp={(e) => {
          eventHandlers.handleStageMouseUp(e);
          panZoomHandlers.handleMouseUp(e);
        }}
        onWheel={panZoomHandlers.handleWheel}
        onContextMenu={handleContextMenu}
        className="absolute top-0 left-0"
      >
        <Layer>
          {/* Optional Grid */}
          {renderGrid()}

          {/* Canvas Border */}
          {renderCanvasBorder()}

          {/* Shapes */}
          {shapes.map(renderShapeWithProps)}

          {/* Selection Rectangle */}
          {renderSelectionRectangle()}
        </Layer>
      </Stage>

      {/* Canvas Navigation Info */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm">
        Zoom: {Math.round(zoom * 100)}% | X: {Math.round(pan.x)} | Y:{" "}
        {Math.round(pan.y)}
      </div>
    </div>
  );
}
