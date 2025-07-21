// Update: selection-overlay.tsx
import React, { useState } from "react";
import { Group, Rect, Circle, Line, Text } from "react-konva";
import { Shape } from "@/types/seat-map-types";
import { useCanvasStore } from "../store/main-store";

interface SelectionOverlayProps {
  selectedShapes: Shape[];
  onResize?: (
    shapeId: string,
    newBounds: { x: number; y: number; width: number; height: number }
  ) => void;
  onRotate?: (shapeId: string, rotation: number) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedShapes,
  onResize,
  onRotate,
}) => {
  if (selectedShapes.length === 0) return null;

  // Helper function to rotate a point around a center
  const rotatePoint = (
    point: { x: number; y: number },
    center: { x: number; y: number },
    angleDegrees: number
  ) => {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);

    const translatedX = point.x - center.x;
    const translatedY = point.y - center.y;

    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;

    return {
      x: rotatedX + center.x,
      y: rotatedY + center.y,
    };
  };

  // FIXED: Handle rotation in bounds calculation with correct rotation origin (top-left corner)
  const getShapeBounds = (shape: Shape) => {
    const rotation = shape.rotation || 0;

    switch (shape.type) {
      case "rect":
        if (rotation === 0) {
          // No rotation - use simple bounds
          return {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
          };
        } else {
          // FIXED: Rotated rectangle - rotation origin is at (shape.x, shape.y) - top-left corner
          const rotationOrigin = {
            x: shape.x,
            y: shape.y,
          };

          const corners = [
            { x: shape.x, y: shape.y }, // Top-left (rotation origin)
            { x: shape.x + shape.width, y: shape.y }, // Top-right
            { x: shape.x + shape.width, y: shape.y + shape.height }, // Bottom-right
            { x: shape.x, y: shape.y + shape.height }, // Bottom-left
          ];

          const rotatedCorners = corners.map((corner) =>
            rotatePoint(corner, rotationOrigin, rotation)
          );

          const minX = Math.min(...rotatedCorners.map((p) => p.x));
          const maxX = Math.max(...rotatedCorners.map((p) => p.x));
          const minY = Math.min(...rotatedCorners.map((p) => p.y));
          const maxY = Math.max(...rotatedCorners.map((p) => p.y));

          return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        }

      case "circle":
        if (rotation === 0) {
          // No rotation - use simple bounds
          return {
            x: shape.x - shape.radius,
            y: shape.y - shape.radius,
            width: shape.radius * 2,
            height: shape.radius * 2,
          };
        } else {
          // FIXED: For circles, rotation origin is at (shape.x, shape.y) - the center
          // The bounds of the circle are from (x-radius, y-radius) to (x+radius, y+radius)
          const rotationOrigin = {
            x: shape.x,
            y: shape.y,
          };

          const corners = [
            { x: shape.x - shape.radius, y: shape.y - shape.radius }, // Top-left of bounding box
            { x: shape.x + shape.radius, y: shape.y - shape.radius }, // Top-right
            { x: shape.x + shape.radius, y: shape.y + shape.radius }, // Bottom-right
            { x: shape.x - shape.radius, y: shape.y + shape.radius }, // Bottom-left
          ];

          const rotatedCorners = corners.map((corner) =>
            rotatePoint(corner, rotationOrigin, rotation)
          );

          const minX = Math.min(...rotatedCorners.map((p) => p.x));
          const maxX = Math.max(...rotatedCorners.map((p) => p.x));
          const minY = Math.min(...rotatedCorners.map((p) => p.y));
          const maxY = Math.max(...rotatedCorners.map((p) => p.y));

          return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        }

      case "text":
        const textWidth =
          shape.width ||
          Math.max(
            100,
            (shape.name?.length || 10) * (shape.fontSize || 16) * 0.6
          );
        const textHeight = shape.fontSize || 16;

        if (rotation === 0) {
          // No rotation - use simple bounds
          return {
            x: shape.x,
            y: shape.y,
            width: textWidth,
            height: textHeight,
          };
        } else {
          // FIXED: Rotated text - rotation origin is at (shape.x, shape.y) - top-left corner
          const rotationOrigin = {
            x: shape.x,
            y: shape.y,
          };

          const corners = [
            { x: shape.x, y: shape.y }, // Top-left (rotation origin)
            { x: shape.x + textWidth, y: shape.y }, // Top-right
            { x: shape.x + textWidth, y: shape.y + textHeight }, // Bottom-right
            { x: shape.x, y: shape.y + textHeight }, // Bottom-left
          ];

          const rotatedCorners = corners.map((corner) =>
            rotatePoint(corner, rotationOrigin, rotation)
          );

          const minX = Math.min(...rotatedCorners.map((p) => p.x));
          const maxX = Math.max(...rotatedCorners.map((p) => p.x));
          const minY = Math.min(...rotatedCorners.map((p) => p.y));
          const maxY = Math.max(...rotatedCorners.map((p) => p.y));

          return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        }

      case "polygon":
        if (!shape.points || shape.points.length < 1) {
          // FIX: Changed from 2 to 1
          return { x: shape.x, y: shape.y, width: 50, height: 50 };
        }

        // FIX: Calculate polygon bounds with 2D points array
        let minX = shape.x + shape.points[0].x;
        let maxX = shape.x + shape.points[0].x;
        let minY = shape.y + shape.points[0].y;
        let maxY = shape.y + shape.points[0].y;

        for (let i = 1; i < shape.points.length; i++) {
          const pointX = shape.x + shape.points[i].x;
          const pointY = shape.y + shape.points[i].y;
          minX = Math.min(minX, pointX);
          maxX = Math.max(maxX, pointX);
          minY = Math.min(minY, pointY);
          maxY = Math.max(maxY, pointY);
        }

        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        };

      default:
        return { x: 0, y: 0, width: 50, height: 50 };
    }
  };

  const getCombinedBounds = () => {
    if (selectedShapes.length === 1) {
      return getShapeBounds(selectedShapes[0]);
    }

    // For multiple shapes, get the bounding box that contains all shapes
    const bounds = selectedShapes.map(getShapeBounds);
    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxX = Math.max(...bounds.map((b) => b.x + b.width));
    const maxY = Math.max(...bounds.map((b) => b.y + b.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const bounds = getCombinedBounds();
  const handleSize = 8;
  const strokeWidth = 2;
  const rotationHandleDistance = 20; // Distance from top edge

  const renderCornerHandle = (x: number, y: number, cursor: string) => (
    <Rect
      x={x - handleSize / 2}
      y={y - handleSize / 2}
      width={handleSize}
      height={handleSize}
      fill="#4A90E2"
      stroke="#ffffff"
      strokeWidth={1}
      listening={true}
      draggable={false}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = cursor;
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "default";
      }}
    />
  );

  const renderRotationHandle = () => {
    if (selectedShapes.length !== 1 || selectedShapes[0].type === "polygon") {
      return null; // No rotation for multiple selection or polygons
    }

    const centerX = bounds.x + bounds.width / 2;
    const handleY = bounds.y - rotationHandleDistance;

    return (
      <Group>
        {/* Line connecting to rotation handle */}
        <Line
          points={[centerX, bounds.y, centerX, handleY]}
          stroke="#4A90E2"
          strokeWidth={1}
          listening={false}
        />

        {/* Rotation handle */}
        <Circle
          x={centerX}
          y={handleY}
          radius={handleSize / 2}
          fill="#4A90E2"
          stroke="#ffffff"
          strokeWidth={1}
          listening={true}
          draggable={false}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "grab";
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
          }}
        />
      </Group>
    );
  };

  // ADDED: Debug info to show rotation values
  const renderDebugInfo = () => {
    if (selectedShapes.length !== 1) return null;

    const shape = selectedShapes[0];
    const rotation = shape.rotation || 0;

    if (rotation === 0) return null;

    return (
      <Group>
        <Rect
          x={bounds.x}
          y={bounds.y - 25}
          width={100}
          height={18}
          fill="rgba(0, 0, 0, 0.8)"
          cornerRadius={3}
          listening={false}
        />
        <Text
          x={bounds.x + 5}
          y={bounds.y - 20}
          text={`Rotation: ${Math.round(rotation)}°`}
          fontSize={12}
          fill="white"
          listening={false}
        />
      </Group>
    );
  };

  return (
    <Group>
      {/* Selection border */}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        stroke="#4A90E2"
        strokeWidth={strokeWidth}
        dash={[5, 5]}
        listening={false}
      />

      {/* Corner handles */}
      {renderCornerHandle(bounds.x, bounds.y, "nw-resize")}
      {renderCornerHandle(bounds.x + bounds.width, bounds.y, "ne-resize")}
      {renderCornerHandle(bounds.x, bounds.y + bounds.height, "sw-resize")}
      {renderCornerHandle(
        bounds.x + bounds.width,
        bounds.y + bounds.height,
        "se-resize"
      )}

      {/* Edge handles (for single shape only) */}
      {selectedShapes.length === 1 && (
        <>
          {renderCornerHandle(
            bounds.x + bounds.width / 2,
            bounds.y,
            "n-resize"
          )}
          {renderCornerHandle(
            bounds.x + bounds.width / 2,
            bounds.y + bounds.height,
            "s-resize"
          )}
          {renderCornerHandle(
            bounds.x,
            bounds.y + bounds.height / 2,
            "w-resize"
          )}
          {renderCornerHandle(
            bounds.x + bounds.width,
            bounds.y + bounds.height / 2,
            "e-resize"
          )}
        </>
      )}

      {/* Rotation handle */}
      {renderRotationHandle()}

      {/* Debug info for rotation */}
      {renderDebugInfo()}

      {/* Selection info */}
      {selectedShapes.length > 1 && (
        <Group>
          <Rect
            x={bounds.x + bounds.width + 10}
            y={bounds.y}
            width={80}
            height={20}
            fill="rgba(74, 144, 226, 0.9)"
            cornerRadius={3}
            listening={false}
          />
          <Text
            x={bounds.x + bounds.width + 15}
            y={bounds.y + 5}
            text={`${selectedShapes.length} selected`}
            fontSize={12}
            fill="white"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};
