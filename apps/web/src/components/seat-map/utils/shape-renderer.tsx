import { Circle, Group, Line, Rect, Text } from "react-konva";
import { Shape, PolygonShape } from "@/types/seat-map-types";
import { createHitFunc } from "./shape-hit-detection";
import { renderAreaContent } from "./area-renderer";

export interface ShapeProps {
  shape: Shape;
  isSelected: boolean;
  commonProps: any;
  // NEW: Area mode properties
  isInAreaMode?: boolean;
  zoomedAreaId?: string;
  selectedRowIds?: string[];
  selectedSeatIds?: string[];
  onRowClick?: (rowId: string, e: any) => void;
  onSeatClick?: (seatId: string, e: any) => void;
  onRowDoubleClick?: (rowId: string, e: any) => void;
  onSeatDoubleClick?: (seatId: string, e: any) => void;
}

export const renderShape = ({
  shape,
  isSelected,
  commonProps,
  isInAreaMode = false,
  zoomedAreaId,
  selectedRowIds = [],
  selectedSeatIds = [],
  onRowClick,
  onSeatClick,
  onRowDoubleClick,
  onSeatDoubleClick,
}: ShapeProps) => {
  const { key, ...restProps } = commonProps;
  const hitFunc = createHitFunc(shape);

  switch (shape.type) {
    case "rect":
      // Hide rectangles (stages) in area mode
      if (isInAreaMode) return null;

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
            listening={true}
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
      // Hide circles (stages) in area mode
      if (isInAreaMode) return null;

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
            listening={true}
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

      return (
        <Group key={key} {...restProps}>
          {/* Polygon outline */}
          <Line
            x={0}
            y={0}
            points={shape.points}
            closed={shape.closed}
            fill={shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth || 1}
            dash={shape.dash || []}
            opacity={isInAreaMode && !isCurrentArea ? 0.1 : shape.opacity || 1}
            hitFunc={hitFunc}
            listening={!isInAreaMode} // Only listen to clicks when not in area mode
          />

          {/* Area name */}
          {shape.name && (
            <Text
              x={getPolygonCenter(shape.points).x}
              y={getPolygonCenter(shape.points).y}
              text={shape.name}
              fontSize={12}
              fill="#000"
              align="center"
              verticalAlign="middle"
              offsetX={shape.name.length * 3}
              offsetY={6}
              listening={false}
              opacity={isInAreaMode && !isCurrentArea ? 0.1 : 1}
            />
          )}

          {/* NEW: Render rows and seats when in area mode for current area */}
          {isCurrentArea &&
            polygonShape.rows &&
            polygonShape.rows.length > 0 &&
            renderAreaContent({
              rows: polygonShape.rows,
              selectedRowIds,
              selectedSeatIds,
              onRowClick,
              onSeatClick,
              onRowDoubleClick,
              onSeatDoubleClick,
            })}
        </Group>
      );

    case "text":
      // Hide text shapes in area mode unless they're area-specific
      if (isInAreaMode) return null;

      return (
        <Text
          key={key}
          {...restProps}
          text={shape.text || shape.name || "New Text"}
          fontSize={shape.fontSize || 16}
          fontFamily={shape.fontFamily || "Arial"}
          fontStyle={shape.fontStyle || "normal"}
          align={shape.align || "left"}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth || 0}
          listening={true}
          hitFunc={hitFunc}
        />
      );

    default:
      return null;
  }
};

// Helper function
const getPolygonCenter = (points: number[]) => {
  if (!points || points.length < 2) {
    return { x: 0, y: 0 };
  }

  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];

  for (let i = 2; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
};
