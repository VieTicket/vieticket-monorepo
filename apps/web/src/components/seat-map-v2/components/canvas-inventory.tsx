import React, { useMemo } from "react";
import {
  Layers,
  Square,
  Circle as CircleIcon,
  Type,
  Hexagon,
} from "lucide-react";
import { PixiShape, CanvasInventoryProps } from "../types";

export function CanvasInventory({
  shapes,
  selectedShapeIds,
  onShapeSelect,
  onShapePan,
}: CanvasInventoryProps) {
  const shapesByType = useMemo(() => {
    const polygons = shapes.filter((shape) => shape.type === "polygon");
    const rectangles = shapes.filter((shape) => shape.type === "rectangle");
    const ellipses = shapes.filter((shape) => shape.type === "ellipse");
    const texts = shapes.filter((shape) => shape.type === "text");

    return { polygons, rectangles, ellipses, texts };
  }, [shapes]);

  const handleShapeClick = (shapeId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      onShapePan(shapeId);
    } else {
      onShapeSelect(shapeId);
    }
  };

  const renderShapeItem = (shape: PixiShape, icon: React.ReactNode) => {
    const isSelected = selectedShapeIds.includes(shape.id);
    return (
      <div
        key={shape.id}
        className={`flex items-center py-1.5 px-2 ${
          isSelected ? "bg-blue-900" : "hover:bg-gray-700"
        } rounded cursor-pointer text-xs`}
        onClick={(e) => handleShapeClick(shape.id, e)}
      >
        {icon}
        <span className="truncate text-white">
          {shape.name || `${shape.type} ${shape.id.slice(-5)}`}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-white p-3 shadow z-10 w-64 overflow-y-auto border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <Layers className="w-5 h-5 mr-2" />
          Canvas Elements
        </h2>
      </div>

      {/* Polygons Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <Hexagon className="w-3.5 h-3.5 mr-1.5" />
          <span>Areas ({shapesByType.polygons.length})</span>
        </div>
        {shapesByType.polygons.length > 0 ? (
          <div className="space-y-0.5">
            {shapesByType.polygons.map((shape) =>
              renderShapeItem(
                shape,
                <div
                  className="w-2.5 h-2.5 mr-2 rounded-sm"
                  style={{ backgroundColor: shape.fill || "#4a5568" }}
                />
              )
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No areas created
          </div>
        )}
      </div>

      {/* Rectangles Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <Square className="w-3.5 h-3.5 mr-1.5" />
          <span>Rectangles ({shapesByType.rectangles.length})</span>
        </div>
        {shapesByType.rectangles.length > 0 ? (
          <div className="space-y-0.5">
            {shapesByType.rectangles.map((shape) =>
              renderShapeItem(
                shape,
                <div
                  className="w-2.5 h-2.5 mr-2 rounded"
                  style={{ backgroundColor: shape.fill || "#3b82f6" }}
                />
              )
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No rectangles created
          </div>
        )}
      </div>

      {/* Ellipses Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <CircleIcon className="w-3.5 h-3.5 mr-1.5" />
          <span>Ellipses ({shapesByType.ellipses.length})</span>
        </div>
        {shapesByType.ellipses.length > 0 ? (
          <div className="space-y-0.5">
            {shapesByType.ellipses.map((shape) =>
              renderShapeItem(
                shape,
                <div
                  className="w-2.5 h-2.5 mr-2 rounded-full"
                  style={{ backgroundColor: shape.fill || "#10b981" }}
                />
              )
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No ellipses created
          </div>
        )}
      </div>

      {/* Text Section */}
      <div className="mb-4">
        <div className="flex items-center text-xs font-medium text-gray-300 mb-2 bg-gray-700 p-1.5 rounded-sm">
          <Type className="w-3.5 h-3.5 mr-1.5" />
          <span>Text ({shapesByType.texts.length})</span>
        </div>
        {shapesByType.texts.length > 0 ? (
          <div className="space-y-0.5">
            {shapesByType.texts.map((shape) =>
              renderShapeItem(
                shape,
                <Type className="w-2.5 h-2.5 mr-2 text-gray-400" />
              )
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 pl-2 py-1">
            No text elements created
          </div>
        )}
      </div>
    </div>
  );
}
