import { Rect, Circle, Line, Text } from "react-konva";
import { Shape } from "@/types/seat-map-types";

export interface ShapeProps {
  shape: Shape;
  isSelected: boolean;
  commonProps: any;
}

export const renderShape = ({ shape, isSelected, commonProps }: ShapeProps) => {
  const { id: key, ...props } = commonProps;

  switch (shape.type) {
    case "rect":
      return (
        <Rect
          key={key}
          {...props}
          width={shape.width}
          height={shape.height}
          cornerRadius={shape.cornerRadius || 0}
        />
      );

    case "circle":
      return <Circle key={key} {...props} radius={shape.radius} />;

    case "polygon":
      return (
        <Line
          key={key}
          {...props}
          points={shape.points}
          closed={shape.closed !== false}
        />
      );

    case "text":
      return (
        <Text
          key={key}
          {...props}
          text={shape.text}
          fontSize={shape.fontSize || 16}
          fontFamily={shape.fontFamily || "Arial"}
          fontStyle={shape.fontStyle || "normal"}
          align={shape.align || "left"}
          width={shape.width}
        />
      );

    default:
      return null;
  }
};
