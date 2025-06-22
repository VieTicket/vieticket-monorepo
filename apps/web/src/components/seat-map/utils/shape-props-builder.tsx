import { Shape } from "@/types/seat-map-types";

export interface ShapeEventHandlers {
  handleShapeClick: (shapeId: string, e: any) => void;
  handleShapeDragStart: (shapeId: string, e: any) => void;
  handleShapeDragMove: (shapeId: string, e: any) => void;
  handleShapeDragEnd: (shapeId: string, e: any) => void;
}

export const buildShapeProps = (
  shape: Shape,
  isSelected: boolean,
  eventHandlers: ShapeEventHandlers
) => {
  const {
    handleShapeClick,
    handleShapeDragStart,
    handleShapeDragMove,
    handleShapeDragEnd,
  } = eventHandlers;

  return {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation || 0,
    scaleX: shape.scaleX || 1,
    scaleY: shape.scaleY || 1,
    fill: shape.fill || "#ffffff",
    stroke: isSelected ? "#0066cc" : shape.stroke || "#000000",
    strokeWidth: isSelected ? 2 : shape.strokeWidth || 1,
    opacity: shape.opacity || 1,
    draggable: shape.draggable !== false,
    onClick: (e: any) => handleShapeClick(shape.id, e),
    onDragStart: (e: any) => handleShapeDragStart(shape.id, e),
    onDragMove: (e: any) => handleShapeDragMove(shape.id, e),
    onDragEnd: (e: any) => handleShapeDragEnd(shape.id, e),
  };
};
