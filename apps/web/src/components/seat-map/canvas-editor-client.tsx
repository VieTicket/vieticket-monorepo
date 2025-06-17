"use client";

import { useRef } from "react";
import { Stage, Layer, Rect } from "react-konva";
import { useCanvasStore } from "@/components/seat-map/store/main-store";
import { useCanvasEvents } from "./hooks/use-canvas-events";
import { useCanvasResize } from "./hooks/use-canvas-resize";
import { renderShape } from "./utils/shape-renderer";
import { buildShapeProps } from "./utils/shape-props-builder";

export default function CanvasEditorClient() {
  const stageRef = useRef(null);

  const { shapes, selectedShapeIds, canvasSize, zoom, pan } = useCanvasStore();

  useCanvasResize();
  const eventHandlers = useCanvasEvents();

  const renderShapeWithProps = (shape: any) => {
    const isSelected = selectedShapeIds.includes(shape.id);
    const commonProps = buildShapeProps(shape, isSelected, eventHandlers);

    return renderShape({ shape, isSelected, commonProps });
  };

  return (
    <div className="canvas-container relative bg-white min-h-[600px] h-full w-full">
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onClick={eventHandlers.handleStageClick}
        onMouseDown={eventHandlers.handleStageMouseDown}
        onMouseMove={eventHandlers.handleStageMouseMove}
        onMouseUp={eventHandlers.handleStageMouseUp}
        className="absolute top-0 left-0"
      >
        <Layer>
          {shapes.map(renderShapeWithProps)}
          {eventHandlers.selectionRect && eventHandlers.isSelecting && (
            <Rect
              x={eventHandlers.selectionRect.x}
              y={eventHandlers.selectionRect.y}
              width={eventHandlers.selectionRect.width}
              height={eventHandlers.selectionRect.height}
              fill="rgba(0, 162, 255, 0.1)"
              stroke="rgba(0, 162, 255, 0.6)"
              strokeWidth={1}
              dash={[5, 5]}
              listening={false} // Prevent this from interfering with mouse events
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
