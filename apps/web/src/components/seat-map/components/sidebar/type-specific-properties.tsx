"use client";

import React from "react";
import { CanvasItem, ContainerGroup, SeatShape } from "../../types";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";
import { ColorPicker } from "../inputs/color-picker";
import { AreaModeProperties } from "./area-mode-properties";
import { useSeatMapStore } from "../../store/seat-map-store";

interface TypeSpecificPropertiesProps {
  item: CanvasItem;
  onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
}

export const TypeSpecificProperties = React.memo(
  ({ item, onUpdate }: TypeSpecificPropertiesProps) => {
    const selectedShapes = useSeatMapStore((state) => state.selectedShapes);

    switch (item.type) {
      case "rectangle":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Width</label>
                <DebouncedInput
                  type="number"
                  value={item.width}
                  onChange={() => {}}
                  onUpdate={(value) => onUpdate(item.id, { width: value })}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height</label>
                <DebouncedInput
                  type="number"
                  value={item.height}
                  onChange={() => {}}
                  onUpdate={(value) => onUpdate(item.id, { height: value })}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Corner Radius
              </label>
              <DebouncedInput
                type="number"
                value={item.cornerRadius}
                onChange={() => {}}
                onUpdate={(value) => onUpdate(item.id, { cornerRadius: value })}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>
            <ColorPicker
              label="Fill Color"
              value={item.color}
              onChange={(color) => onUpdate(item.id, { color })}
            />
            <ColorPicker
              label="Stroke Color"
              value={item.strokeColor}
              onChange={(color) => onUpdate(item.id, { strokeColor: color })}
            />
          </div>
        );

      case "ellipse":
        // Check if this is a seat (has gridId and rowId)
        const isSeat = "gridId" in item && "rowId" in item;

        if (isSeat) {
          // Handle seat-specific properties with area mode component
          const seatShapes = selectedShapes.filter(
            (shape): shape is SeatShape =>
              shape.type === "ellipse" && "gridId" in shape && "rowId" in shape
          );

          return (
            <div className="space-y-3">
              {/* Basic ellipse properties */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Radius X
                  </label>
                  <DebouncedInput
                    type="number"
                    value={item.radiusX}
                    onChange={() => {}}
                    onUpdate={(value) => onUpdate(item.id, { radiusX: value })}
                    className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Radius Y
                  </label>
                  <DebouncedInput
                    type="number"
                    value={item.radiusY}
                    onChange={() => {}}
                    onUpdate={(value) => onUpdate(item.id, { radiusY: value })}
                    className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                  />
                </div>
              </div>
              <ColorPicker
                label="Fill Color"
                value={item.color}
                onChange={(color) => onUpdate(item.id, { color })}
              />
              <ColorPicker
                label="Stroke Color"
                value={item.strokeColor}
                onChange={(color) => onUpdate(item.id, { strokeColor: color })}
              />

              {/* Seat-specific area mode properties */}
              <div className="border-t border-gray-700 pt-3">
                <AreaModeProperties selectedShapes={seatShapes} />
              </div>
            </div>
          );
        }

        // Regular ellipse
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Radius X
                </label>
                <DebouncedInput
                  type="number"
                  value={item.radiusX}
                  onChange={() => {}}
                  onUpdate={(value) => onUpdate(item.id, { radiusX: value })}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Radius Y
                </label>
                <DebouncedInput
                  type="number"
                  value={item.radiusY}
                  onChange={() => {}}
                  onUpdate={(value) => onUpdate(item.id, { radiusY: value })}
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
            </div>
            <ColorPicker
              label="Fill Color"
              value={item.color}
              onChange={(color) => onUpdate(item.id, { color })}
            />
            <ColorPicker
              label="Stroke Color"
              value={item.strokeColor}
              onChange={(color) => onUpdate(item.id, { strokeColor: color })}
            />
          </div>
        );

      case "text":
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Text</label>
              <DebouncedTextarea
                value={item.text}
                onChange={() => {}}
                onUpdate={(value) => onUpdate(item.id, { text: value })}
                rows={3}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Font Size
              </label>
              <DebouncedInput
                type="number"
                value={item.fontSize}
                onChange={() => {}}
                onUpdate={(value) => onUpdate(item.id, { fontSize: value })}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Font Family
              </label>
              <select
                value={item.fontFamily}
                onChange={(e) =>
                  onUpdate(item.id, { fontFamily: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
              </select>
            </div>
            <ColorPicker
              label="Text Color"
              value={item.color}
              onChange={(color) => onUpdate(item.id, { color })}
            />
          </div>
        );

      case "polygon":
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Points</label>
              <div className="text-sm text-gray-400 mb-2">
                {item.points.length} points
              </div>

              {/* Individual Point Corner Radius Controls */}
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-600 rounded p-2">
                {item.points.map((point, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-gray-400">P{index + 1}:</span>
                    <div className="flex-1 w-24">
                      <DebouncedInput
                        type="number"
                        min="0"
                        step="0.1"
                        value={point.radius || item.cornerRadius / 2}
                        onChange={() => {}}
                        onUpdate={(value) => {
                          const updatedPoints = [...item.points];
                          updatedPoints[index] = {
                            ...updatedPoints[index],
                            radius: value ?? 0,
                          };
                          onUpdate(item.id, { points: updatedPoints });
                        }}
                        isFloat={true}
                        className="w-full px-2 py-1 border border-gray-600 rounded text-xs bg-gray-800 text-white"
                        placeholder="Corner radius"
                      />
                    </div>
                    <span className="text-gray-500 text-xs">
                      ({Math.round(point.x * 100) / 100},{" "}
                      {Math.round(point.y * 100) / 100})
                    </span>
                  </div>
                ))}
              </div>

              {/* Bulk Actions */}
              <button
                onClick={() => {
                  const updatedPoints = item.points.map((point) => ({
                    ...point,
                    radius: item.points[0].radius ?? 0,
                  }));
                  onUpdate(item.id, { points: updatedPoints });
                }}
                className="w-full flex-1 px-2 py-1 my-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
              >
                Reset All
              </button>
            </div>
            <ColorPicker
              label="Fill Color"
              value={item.color}
              onChange={(color) => onUpdate(item.id, { color })}
            />
            <ColorPicker
              label="Stroke Color"
              value={item.strokeColor}
              onChange={(color) => onUpdate(item.id, { strokeColor: color })}
            />
          </div>
        );

      case "container":
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Children</label>
              <div className="text-sm text-gray-400">
                {(item as ContainerGroup).children.length} items
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expanded</label>
              <input
                type="checkbox"
                checked={(item as ContainerGroup).expanded}
                onChange={(e) =>
                  onUpdate(item.id, { expanded: e.target.checked })
                }
                className="w-4 h-4"
              />
            </div>
            <button
              onClick={() => {
                const {
                  ungroupContainerForCanvas,
                } = require("../../utils/grouping");
                ungroupContainerForCanvas(item as ContainerGroup);
              }}
              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Ungroup Container
            </button>
          </div>
        );

      default:
        return null;
    }
  }
);

TypeSpecificProperties.displayName = "TypeSpecificProperties";
