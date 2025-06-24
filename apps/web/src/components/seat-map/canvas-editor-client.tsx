"use client";

import { useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Line } from "react-konva";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useCanvasEvents } from "./hooks/useCanvasEvents";
import { useCanvasResize } from "./hooks/useCanvasResize";
import { usePanZoom } from "./hooks/usePanZoom";
import { renderShape } from "./utils/shape-renderer";
import { buildShapeProps } from "./utils/shape-props-builder";
import { useKeyMap } from "./hooks/useKeyMap";

export default function CanvasEditorClient() {
  const hasInitialized = useRef(false);

  const {
    shapes,
    selectedShapeIds,
    canvasSize,
    viewportSize,
    zoom,
    pan,
    currentTool,
  } = useCanvasStore();

  const eventHandlers = useCanvasEvents();
  const panZoomHandlers = usePanZoom();

  const { stageRef } = eventHandlers;

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
          // Performance optimization
          perfectDrawEnabled: false,
        },
      });
    },
    [selectedShapeIds, currentTool, eventHandlers]
  );

  const renderSelectionRectangle = useCallback(() => {
    if (
      !eventHandlers.selectionRect ||
      !eventHandlers.isSelecting ||
      currentTool !== "select"
    )
      return null;
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
  }, [eventHandlers.selectionRect, eventHandlers.isSelecting, currentTool]);

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
        <Layer
          // Performance optimizations
          hitGraphEnabled={true}
          clearBeforeDraw={true}
        >
          {/* Existing shapes */}
          {shapes.map((shape) => renderShapeWithProps(shape, false))}

          {/* Preview shape */}
          {eventHandlers.previewShape &&
            currentTool !== "select" &&
            renderShapeWithProps(
              { ...eventHandlers.previewShape, id: "preview" },
              true
            )}

          {/* Selection rectangle */}
          {renderSelectionRectangle()}
        </Layer>
      </Stage>
    </div>
  );
}
