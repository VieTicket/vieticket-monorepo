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

      console.log(restProps);
      console.log("Polygon Shape:", polygonShape);
      const centerX = polygonShape.center?.x || 0;
      const centerY = polygonShape.center?.y || 0;
      const flatPoints =
        shape.points?.reduce((acc, point) => {
          acc.push(point.x, point.y);
          return acc;
        }, [] as number[]) || [];

      return (
        <Group key={key} {...restProps} x={0} y={0}>
          <Line
            x={0}
            y={0}
            points={flatPoints}
            closed={shape.closed !== false}
            fill={isCurrentArea ? "#f5f5f5" : shape.fill}
            stroke={isCurrentArea ? "#999999" : shape.stroke}
            strokeWidth={shape.strokeWidth || 1}
            dash={shape.dash || []}
            opacity={shape.opacity || 1}
            hitFunc={hitFunc}
            listening={!isInAreaMode}
          />

          {shape.name && (
            <Text
              x={centerX - restProps.x}
              y={centerY - restProps.y}
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

          {hasRows && (
            <Group x={centerX - restProps.x} y={centerY - restProps.y}>
              {renderAreaContent({
                rows: polygonShape.rows || [],
                selectedRowIds,
                selectedSeatIds,
                areaEvents,
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
