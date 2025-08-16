"use client";

import React, { useState, useCallback } from "react";
import {
  CanvasItem,
  ContainerGroup,
  RectangleShape,
  EllipseShape,
  TextShape,
  PolygonShape,
} from "../types";
import { useSeatMapStore } from "../store/seat-map-store";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { getSelectionTransform } from "../events/transform-events";
import * as PIXI from "pixi.js";

interface PropertiesSidebarProps {
  onGroupItems?: (items: CanvasItem[]) => void;
  onUngroupItems?: (container: ContainerGroup) => void;
}

export const PropertiesSidebar = React.memo(
  ({ onGroupItems, onUngroupItems }: PropertiesSidebarProps) => {
    const selectedItems = useSeatMapStore((state) => state.selectedShapes);
    const shapes = useSeatMapStore((state) => state.shapes);
    const updateShapes = useSeatMapStore((state) => state.updateShapes);
    console.log("Rendering PropertiesSidebar");

    // Simple immediate update function - no debouncing
    const handleUpdate = useCallback(
      (id: string, updates: Partial<CanvasItem>) => {
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return;

        // Apply updates to the shape object
        Object.assign(shape, updates);

        // Handle graphics updates
        if (updates.x !== undefined || updates.y !== undefined) {
          shape.graphics.position.set(shape.x, shape.y);
        }

        if (updates.rotation !== undefined) {
          shape.graphics.rotation = shape.rotation;
        }

        if (updates.scaleX !== undefined || updates.scaleY !== undefined) {
          shape.graphics.scale.set(shape.scaleX, shape.scaleY);
        }

        if (updates.opacity !== undefined) {
          shape.graphics.alpha = shape.opacity;
        }

        if (updates.visible !== undefined) {
          shape.graphics.visible = shape.visible;
        }

        // Handle type-specific graphics updates
        updateShapeGraphics(shape, updates);

        // Update the store
        updateShapes([...shapes]);

        // Update selection transform
        const selectionTransform = getSelectionTransform();
        if (selectionTransform && selectedItems.some((s) => s.id === id)) {
          selectionTransform.updateSelection(selectedItems);
        }
      },
      [shapes, updateShapes, selectedItems]
    );

    const renderPropertiesPanel = () => {
      if (selectedItems.length === 0) {
        return <div className="p-4 text-gray-500">No items selected</div>;
      }

      if (selectedItems.length === 1) {
        return (
          <SingleItemProperties
            item={selectedItems[0]}
            onUpdate={handleUpdate}
          />
        );
      }

      return (
        <div className="p-4">
          <div className="text-sm text-gray-600 mb-4">
            {selectedItems.length} items selected
          </div>
          {selectedItems.length > 1 && onGroupItems && (
            <button
              onClick={() => onGroupItems(selectedItems)}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Group Selected Items
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="w-80 bg-gray-900 border border-gray-700 z-10 flex flex-col text-white">
        <div className="flex border-b border-gray-700">
          <button className="flex-1 px-4 py-2 text-md font-semibold">
            Properties
          </button>
        </div>
        <div className="flex-1 overflow-auto">{renderPropertiesPanel()}</div>
      </div>
    );
  }
);

PropertiesSidebar.displayName = "PropertiesSidebar";

const formatNumber = (value: number, isFloat: boolean = false): string => {
  if (isFloat) {
    // Round to 3 decimal places and remove trailing zeros
    const rounded = Math.round(value * 1000) / 1000;
    const str = rounded.toString();
    // Remove leading zeros but keep one zero before decimal
    return str.replace(/^0+(?=\d)/, "") || "0";
  } else {
    // For integers, just convert to string and remove leading zeros
    const str = Math.round(value).toString();
    return str.replace(/^0+(?=\d)/, "") || "0";
  }
};

// Helper function to parse numbers
const parseNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};
// Helper function to update shape graphics
const updateShapeGraphics = (
  shape: CanvasItem,
  updates: Partial<CanvasItem>
) => {
  if (shape.type === "rectangle") {
    if (
      (updates as RectangleShape).width !== undefined ||
      (updates as RectangleShape).height !== undefined ||
      (updates as RectangleShape).cornerRadius !== undefined ||
      (updates as RectangleShape).color !== undefined ||
      (updates as RectangleShape).strokeColor !== undefined
    ) {
      const graphics = shape.graphics as PIXI.Graphics;
      graphics.clear();
      graphics
        .roundRect(
          -shape.width / 2,
          -shape.height / 2,
          shape.width,
          shape.height,
          shape.cornerRadius
        )
        .fill(shape.color)
        .stroke({ width: shape.strokeWidth, color: shape.strokeColor });
    }
  } else if (shape.type === "ellipse") {
    if (
      (updates as EllipseShape).radiusX !== undefined ||
      (updates as EllipseShape).radiusY !== undefined ||
      (updates as EllipseShape).color !== undefined ||
      (updates as EllipseShape).strokeColor !== undefined
    ) {
      const graphics = shape.graphics as PIXI.Graphics;
      graphics.clear();
      graphics
        .ellipse(0, 0, shape.radiusX, shape.radiusY)
        .fill(shape.color)
        .stroke({ width: shape.strokeWidth, color: shape.strokeColor });
    }
  } else if (shape.type === "text") {
    if (
      (updates as TextShape).text !== undefined ||
      (updates as TextShape).fontSize !== undefined ||
      (updates as TextShape).fontFamily !== undefined ||
      (updates as TextShape).color !== undefined
    ) {
      const textGraphics = shape.graphics as PIXI.Text;
      textGraphics.text = shape.text;
      textGraphics.style.fontSize = shape.fontSize;
      textGraphics.style.fontFamily = shape.fontFamily;
      textGraphics.style.fill = shape.color;
    }
  } else if (shape.type === "polygon") {
    if (
      (updates as PolygonShape).points !== undefined ||
      (updates as PolygonShape).cornerRadius !== undefined ||
      (updates as PolygonShape).color !== undefined ||
      (updates as PolygonShape).strokeColor !== undefined
    ) {
      updatePolygonGraphics(shape);
    }
  }
};

// Simplified single item properties - no local state, direct updates
const SingleItemProperties = React.memo(
  ({
    item,
    onUpdate,
  }: {
    item: CanvasItem;
    onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  }) => {
    console.log("Rendering SingleItemProperties for", item.id);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };
    return (
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={item.name}
            onKeyDown={handleKeyDown}
            onChange={(e) => onUpdate(item.id, { name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">X</label>
            <input
              type="number"
              value={Math.round(item.x)}
              onKeyDown={handleKeyDown}
              onChange={(e) => onUpdate(item.id, { x: Number(e.target.value) })}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Y</label>
            <input
              type="number"
              value={Math.round(item.y)}
              onKeyDown={handleKeyDown}
              onChange={(e) => onUpdate(item.id, { y: Number(e.target.value) })}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
        </div>

        {/* Scale */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Scale X</label>
            <input
              type="number"
              step="0.1"
              value={item.scaleX}
              onKeyDown={handleKeyDown}
              onChange={(e) =>
                onUpdate(item.id, { scaleX: Number(e.target.value) })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scale Y</label>
            <input
              type="number"
              step="0.1"
              value={item.scaleY}
              onKeyDown={handleKeyDown}
              onChange={(e) =>
                onUpdate(item.id, { scaleY: Number(e.target.value) })
              }
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Rotation (degrees)
          </label>
          <input
            type="number"
            value={Math.round(item.rotation * (180 / Math.PI))}
            onKeyDown={handleKeyDown}
            onChange={(e) =>
              onUpdate(item.id, {
                rotation: Number(e.target.value) * (Math.PI / 180),
              })
            }
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium mb-1">Opacity</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={item.opacity}
            onKeyDown={handleKeyDown}
            onChange={(e) =>
              onUpdate(item.id, { opacity: Number(e.target.value) })
            }
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(item.opacity * 100)}%
          </div>
        </div>

        {/* Type-specific properties */}
        <TypeSpecificProperties item={item} onUpdate={onUpdate} />
      </div>
    );
  }
);

SingleItemProperties.displayName = "SingleItemProperties";

// Type-specific properties component
const TypeSpecificProperties = React.memo(
  ({
    item,
    onUpdate,
  }: {
    item: CanvasItem;
    onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  }) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };
    switch (item.type) {
      case "rectangle":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Width</label>
                <input
                  type="number"
                  value={item.width}
                  onKeyDown={handleKeyDown}
                  onChange={(e) =>
                    onUpdate(item.id, { width: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height</label>
                <input
                  type="number"
                  value={item.height}
                  onKeyDown={handleKeyDown}
                  onChange={(e) =>
                    onUpdate(item.id, { height: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Corner Radius
              </label>
              <input
                type="number"
                value={item.cornerRadius}
                onKeyDown={handleKeyDown}
                onChange={(e) =>
                  onUpdate(item.id, { cornerRadius: Number(e.target.value) })
                }
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
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Radius X
                </label>
                <input
                  type="number"
                  value={item.radiusX}
                  onKeyDown={handleKeyDown}
                  onChange={(e) =>
                    onUpdate(item.id, { radiusX: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Radius Y
                </label>
                <input
                  type="number"
                  value={item.radiusY}
                  onKeyDown={handleKeyDown}
                  onChange={(e) =>
                    onUpdate(item.id, { radiusY: Number(e.target.value) })
                  }
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
              <textarea
                value={item.text}
                onChange={(e) => onUpdate(item.id, { text: e.target.value })}
                className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Font Size
              </label>
              <input
                type="number"
                value={item.fontSize}
                onKeyDown={handleKeyDown}
                onChange={(e) =>
                  onUpdate(item.id, { fontSize: Number(e.target.value) })
                }
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
              <div className="text-sm text-gray-400">
                {item.points.length} points
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Corner Radius
              </label>
              <input
                type="number"
                value={item.cornerRadius}
                onKeyDown={handleKeyDown}
                onChange={(e) =>
                  onUpdate(item.id, { cornerRadius: Number(e.target.value) })
                }
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

      default:
        return null;
    }
  }
);

TypeSpecificProperties.displayName = "TypeSpecificProperties";

const ColorPicker = React.memo(
  ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (color: number) => void;
  }) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="color"
        value={`#${value.toString(16).padStart(6, "0")}`}
        onChange={(e) => onChange(parseInt(e.target.value.slice(1), 16))}
        className="w-full h-8 border border-gray-600 rounded"
      />
    </div>
  )
);

ColorPicker.displayName = "ColorPicker";
