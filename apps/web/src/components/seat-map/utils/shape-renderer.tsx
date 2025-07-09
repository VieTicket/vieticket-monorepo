import React from "react";
import { Circle, Group, Line, Rect, Text } from "react-konva";
import { Shape, PolygonShape } from "@/types/seat-map-types";
import { createHitFunc } from "./shape-hit-detection";
import { renderAreaContent, AreaEventProps } from "./area-renderer";

export interface ShapeProps {
  shape: Shape;
  isSelected: boolean;
  commonProps: any;
  isInAreaMode?: boolean;
  zoomedAreaId?: string;
  selectedRowIds?: string[];
  selectedSeatIds?: string[];
  // FIX: Use consolidated area events interface
  areaEvents?: AreaEventProps;
}

export const renderShape = ({
  shape,
  isSelected,
  commonProps,
  isInAreaMode = false,
  zoomedAreaId,
  selectedRowIds = [],
  selectedSeatIds = [],
  areaEvents,
}: ShapeProps) => {
  const { key, ...restProps } = commonProps;
  const hitFunc = createHitFunc(shape);

  switch (shape.type) {
    case "rect":
      return (
        <Group key={key} {...restProps}>
          <Rect
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            cornerRadius={shape.cornerRadius || 0}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth || 1}
            dash={shape.dash || []}
            opacity={shape.opacity}
            hitFunc={hitFunc}
            listening={!isInAreaMode}
          />
          {shape.name && (
            <Text
              text={shape.name}
              fontSize={14}
              fontFamily="Arial"
              x={shape.width / 2}
              y={shape.height / 2}
              offsetX={shape.name.length * 3}
              offsetY={7}
              fill="black"
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      );

    case "circle":
      return (
        <Group key={key} {...restProps}>
          <Circle
            x={0}
            y={0}
            radius={shape.radius}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth || 1}
            dash={shape.dash || []}
            opacity={shape.opacity}
            hitFunc={hitFunc}
            listening={!isInAreaMode}
          />
          {shape.name && (
            <Text
              text={shape.name}
              fontSize={14}
              fontFamily="Arial"
              x={0}
              y={0}
              offsetX={shape.name.length * 3}
              offsetY={7}
              fill="black"
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      );

    case "polygon":
      const polygonShape = shape as PolygonShape;
      const isCurrentArea = isInAreaMode && zoomedAreaId === shape.id;
      const hasRows =
        Array.isArray(polygonShape.rows) && polygonShape.rows.length > 0;

      // FIX: Convert 2D points array to flat array for Konva Line component
      const flatPoints =
        shape.points?.reduce((acc, point) => {
          acc.push(point.x, point.y);
          return acc;
        }, [] as number[]) || [];

      return (
        <Group key={key} {...restProps}>
          {/* Polygon outline with area mode styling */}
          <Line
            x={0}
            y={0}
            points={flatPoints} // FIX: Use converted flat points array
            closed={shape.closed !== false} // Default to true if not specified
            fill={isCurrentArea ? "#f5f5f5" : shape.fill}
            stroke={isCurrentArea ? "#999999" : shape.stroke}
            strokeWidth={shape.strokeWidth || 1}
            dash={shape.dash || []}
            opacity={shape.opacity || 1}
            hitFunc={hitFunc}
            listening={!isInAreaMode}
          />

          {/* Area name - FIX: Use 2D points for center calculation */}
          {shape.name && (
            <Text
              x={getPolygonCenter(shape.points).x}
              y={getPolygonCenter(shape.points).y}
              text={shape.name}
              fontSize={14}
              fontFamily="Arial"
              fill={isCurrentArea ? "#333" : "#000"}
              align="center"
              verticalAlign="middle"
              offsetX={shape.name.length * 3.5}
              offsetY={7}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {/* Area content (rows and seats) when in area mode */}
          {hasRows && (
            <Group>
              {renderAreaContent({
                rows: polygonShape.rows || [],
                selectedRowIds,
                selectedSeatIds,
                areaEvents, // FIX: Pass consolidated area events
                isInteractive: isInAreaMode,
              })}
            </Group>
          )}
        </Group>
      );

    case "text":
      return (
        <Group key={key} {...restProps}>
          <Text
            x={0}
            y={0}
            text={shape.text || shape.name || "New Text"}
            fontSize={shape.fontSize || 16}
            fontFamily={shape.fontFamily || "Arial"}
            fontStyle={shape.fontStyle || "normal"}
            align={shape.align || "left"}
            fill={shape.fill || "#000000"}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth || 0}
            width={shape.width || 200}
            height={shape.height || 24}
            listening={!isInAreaMode}
            hitFunc={hitFunc}
            wrap="none"
            perfectDrawEnabled={false}
          />
        </Group>
      );

    default:
      console.warn(`Unknown shape type: ${(shape as any).type}`);
      return null;
  }
};

// FIX: Update getPolygonCenter to work with 2D points array
const getPolygonCenter = (points: { x: number; y: number }[] = []) => {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate the bounding box center
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    maxX = Math.max(maxX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxY = Math.max(maxY, points[i].y);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
};

// FIX: Alternative centroid calculation (more accurate for irregular polygons)
const getPolygonCentroid = (points: { x: number; y: number }[] = []) => {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y };
  }

  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }

  // Calculate polygon centroid using the standard formula
  let area = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    area += factor;
    centroidX += (points[i].x + points[j].x) * factor;
    centroidY += (points[i].y + points[j].y) * factor;
  }

  area *= 0.5;

  if (Math.abs(area) < 0.0001) {
    // Fallback to simple average if area is too small
    const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x: avgX, y: avgY };
  }

  centroidX /= 6 * area;
  centroidY /= 6 * area;

  return { x: centroidX, y: centroidY };
};
