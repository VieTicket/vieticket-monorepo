// shape-renderer.tsx - Fix selection styling and key issues
import { Rect, Circle, Line, Text, Group } from "react-konva";
import { Shape } from "@/types/seat-map-types";

export interface ShapeProps {
  shape: Shape;
  isSelected: boolean;
  commonProps: any;
}

export const renderShape = ({ shape, isSelected, commonProps }: ShapeProps) => {
  const { id, key, ...restProps } = commonProps;

  // Optimize: Only apply expensive effects when actually selected
  const groupProps = {
    ...restProps,
    // Move shadow to shape level, not group level
  };

  switch (shape.type) {
    case "rect":
      return (
        <Group key={key} {...groupProps}>
          <Rect
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            cornerRadius={shape.cornerRadius || 0}
            fill={shape.fill}
            stroke={isSelected ? "#4A90E2" : shape.stroke}
            strokeWidth={isSelected ? 2 : shape.strokeWidth || 1}
            dash={isSelected ? [5, 5] : shape.dash || []}
            opacity={shape.opacity}
            // Apply shadow here for better performance
            shadowColor={isSelected ? "blue" : undefined}
            shadowBlur={isSelected ? 10 : 0}
            shadowOpacity={isSelected ? 0.6 : 0}
          />
          {shape.name && (
            <Text
              text={shape.name}
              fontSize={14} // Smaller font for performance
              fontFamily={"Arial"}
              x={shape.width / 2}
              y={shape.height / 2}
              offsetX={shape.name.length * 3}
              offsetY={7}
              fill={"black"}
              listening={false}
              perfectDrawEnabled={false} // Performance optimization
            />
          )}
        </Group>
      );

    case "circle":
      return (
        <Group key={key} {...groupProps}>
          <Circle
            x={0}
            y={0}
            radius={shape.radius}
            fill={shape.fill}
            stroke={isSelected ? "#4A90E2" : shape.stroke}
            strokeWidth={isSelected ? 2 : shape.strokeWidth || 1}
            dash={isSelected ? [5, 5] : shape.dash || []}
            opacity={shape.opacity}
            shadowColor={isSelected ? "blue" : undefined}
            shadowBlur={isSelected ? 10 : 0}
            shadowOpacity={isSelected ? 0.6 : 0}
          />
          {shape.name && (
            <Text
              text={shape.name}
              fontSize={14}
              fontFamily={"Arial"}
              x={0}
              y={0}
              offsetX={shape.name.length * 3}
              offsetY={7}
              fill={"black"}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      );

    case "polygon":
      return (
        <Group key={key} {...groupProps}>
          <Line
            x={0} // Relative to group
            y={0} // Relative to group
            points={shape.points}
            closed={shape.closed}
            fill={shape.fill}
            stroke={isSelected ? "#4A90E2" : shape.stroke}
            strokeWidth={isSelected ? 2 : shape.strokeWidth || 1}
            dash={isSelected ? [5, 5] : shape.dash || []}
            opacity={shape.opacity}
          />

          {shape.name && (
            <Text
              x={getPolygonCenter(shape.points).x} // Center relative to polygon
              y={getPolygonCenter(shape.points).y} // Center relative to polygon
              text={shape.name}
              fontSize={12}
              fill="#000"
              align="center"
              verticalAlign="middle"
              offsetX={shape.name.length * 3}
              offsetY={6}
              listening={false}
            />
          )}
        </Group>
      );

    case "text":
      return (
        <Text
          key={key}
          {...restProps}
          text={shape.text}
          fontSize={shape.fontSize || 16}
          fontFamily={shape.fontFamily || "Arial"}
          fontStyle={shape.fontStyle || "normal"}
          align={shape.align || "left"}
          fill={shape.fill}
          stroke={isSelected ? "#4A90E2" : shape.stroke}
          strokeWidth={isSelected ? 1 : shape.strokeWidth || 0}
        />
      );

    default:
      return null;
  }
};

// Helper function to calculate polygon center relative to its points
const getPolygonCenter = (points: number[]) => {
  if (!points || points.length < 2) {
    return { x: 0, y: 0 };
  }

  let minX = points[0];
  let maxX = points[0];
  let minY = points[1];
  let maxY = points[1];

  // Find bounds of the polygon
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
