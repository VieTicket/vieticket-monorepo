"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { useDebouncedCallback, useDebounceState } from "@/hooks/useDebounce";
import * as PIXI from "pixi.js";

interface PropertiesSidebarProps {
  onGroupItems?: (items: CanvasItem[]) => void;
  onUngroupItems?: (container: ContainerGroup) => void;
}

export const PropertiesSidebar = React.memo(
  ({ onGroupItems, onUngroupItems }: PropertiesSidebarProps) => {
    // Get selected items from store
    const selectedItems = useSeatMapStore((state) => state.selectedShapes);
    const shapes = useSeatMapStore((state) => state.shapes);
    const updateShapes = useSeatMapStore((state) => state.updateShapes);
    const setSelectedShapes = useSeatMapStore(
      (state) => state.setSelectedShapes
    );

    // Debounced update function (300ms delay for performance)
    const debouncedShapeUpdate = useDebouncedCallback(
      (id: string, updates: Partial<CanvasItem>) => {
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return;

        // Apply updates to the shape object
        Object.assign(shape, updates);

        // Handle graphics updates based on shape type and what changed
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

        // Handle type-specific updates
        if (shape.type === "rectangle") {
          if (
            (updates as Partial<RectangleShape>).width !== undefined ||
            (updates as Partial<RectangleShape>).height !== undefined ||
            (updates as Partial<RectangleShape>).cornerRadius !== undefined ||
            (updates as Partial<RectangleShape>).color !== undefined ||
            (updates as Partial<RectangleShape>).strokeColor !== undefined
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
            (updates as Partial<EllipseShape>).radiusX !== undefined ||
            (updates as Partial<EllipseShape>).radiusY !== undefined ||
            (updates as Partial<EllipseShape>).color !== undefined ||
            (updates as Partial<EllipseShape>).strokeColor !== undefined
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
            (updates as Partial<TextShape>).text !== undefined ||
            (updates as Partial<TextShape>).fontSize !== undefined ||
            (updates as Partial<TextShape>).fontFamily !== undefined ||
            (updates as Partial<TextShape>).color !== undefined
          ) {
            const textGraphics = shape.graphics as PIXI.Text;
            textGraphics.text = shape.text;
            textGraphics.style.fontSize = shape.fontSize;
            textGraphics.style.fontFamily = shape.fontFamily;
            textGraphics.style.fill = shape.color;
          }
        } else if (shape.type === "polygon") {
          if (
            (updates as Partial<PolygonShape>).points !== undefined ||
            (updates as Partial<PolygonShape>).cornerRadius !== undefined ||
            (updates as Partial<PolygonShape>).color !== undefined ||
            (updates as Partial<PolygonShape>).strokeColor !== undefined
          ) {
            updatePolygonGraphics(shape);
          }
        }

        // Update the store
        updateShapes([...shapes]);

        // Update selection transform if this shape is selected
        const selectionTransform = getSelectionTransform();
        if (selectionTransform && selectedItems.some((s) => s.id === id)) {
          selectionTransform.updateSelection(selectedItems);
        }
      },
      300
    );

    // Immediate update function for critical properties
    const immediateShapeUpdate = useCallback(
      (id: string, updates: Partial<CanvasItem>) => {
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return;

        Object.assign(shape, updates);
        updateShapes([...shapes]);
      },
      [shapes, updateShapes]
    );

    const renderPropertiesPanel = useCallback(() => {
      if (selectedItems.length === 0) {
        return <div className="p-4 text-gray-500">No items selected</div>;
      }

      if (selectedItems.length === 1) {
        const item = selectedItems[0];
        return (
          <SingleItemProperties item={item} onUpdate={debouncedShapeUpdate} />
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
    }, [selectedItems, debouncedShapeUpdate, onGroupItems]);

    return (
      <div className="w-80 bg-gray-900 border border-gray-300 border border-gray-300-gray-700 z-10 flex flex-col text-white">
        {/* Tab Header */}
        <div className="flex border border-gray-300-b border border-gray-300-gray-700">
          <button className="flex-1 px-4 py-2 text-md font-semibold">
            Properties
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">{renderPropertiesPanel()}</div>
      </div>
    );
  }
);

PropertiesSidebar.displayName = "PropertiesSidebar";

// Memoized single item properties component
const SingleItemProperties = React.memo(
  ({
    item,
    onUpdate,
  }: {
    item: CanvasItem;
    onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  }) => {
    // Local state for immediate UI updates with debounced backend updates
    const [localName, , setDebouncedName] = useDebounceState(item.name, 300);
    const [localX, , setDebouncedX] = useDebounceState(item.x, 300);
    const [localY, , setDebouncedY] = useDebounceState(item.y, 300);
    const [localScaleX, , setDebouncedScaleX] = useDebounceState(
      item.scaleX,
      300
    );
    const [localScaleY, , setDebouncedScaleY] = useDebounceState(
      item.scaleY,
      300
    );
    const [localRotation, , setDebouncedRotation] = useDebounceState(
      item.rotation,
      300
    );
    const [localOpacity, , setDebouncedOpacity] = useDebounceState(
      item.opacity,
      300
    );
    const isInitialRender = useRef(true);

    // Update backend when debounced values change
    useEffect(() => {
      if (localName !== item.name) {
        onUpdate(item.id, { name: localName });
      }
    }, [localName, item.name, item.id, onUpdate]);

    useEffect(() => {
      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }

      if (Math.round(localX) !== Math.round(item.x)) {
        onUpdate(item.id, { x: localX });
      }
    }, [localX, item.x, item.id, onUpdate]);

    useEffect(() => {
      if (isInitialRender.current) {
        return;
      }

      if (Math.round(localY) !== Math.round(item.y)) {
        onUpdate(item.id, { y: localY });
      }
    }, [localY, item.y, item.id, onUpdate]);

    useEffect(() => {
      if (localScaleX !== item.scaleX) {
        onUpdate(item.id, { scaleX: localScaleX });
      }
    }, [localScaleX, item.scaleX, item.id, onUpdate]);

    useEffect(() => {
      if (localScaleY !== item.scaleY) {
        onUpdate(item.id, { scaleY: localScaleY });
      }
    }, [localScaleY, item.scaleY, item.id, onUpdate]);

    useEffect(() => {
      if (localRotation !== item.rotation) {
        onUpdate(item.id, { rotation: localRotation });
      }
    }, [localRotation, item.rotation, item.id, onUpdate]);

    useEffect(() => {
      if (localOpacity !== item.opacity) {
        onUpdate(item.id, { opacity: localOpacity });
      }
    }, [localOpacity, item.opacity, item.id, onUpdate]);

    // Reset the flag when item changes
    useEffect(() => {
      isInitialRender.current = true;
    }, [item.id]);

    return (
      <div className="p-4 space-y-4">
        {/* Common properties */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={localName}
            onChange={(e) => setDebouncedName(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">X</label>
            <input
              type="number"
              value={Math.round(localX)}
              onChange={(e) => setDebouncedX(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Y</label>
            <input
              type="number"
              value={Math.round(localY)}
              onChange={(e) => setDebouncedY(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
              value={localScaleX}
              onChange={(e) => setDebouncedScaleX(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scale Y</label>
            <input
              type="number"
              step="0.1"
              value={localScaleY}
              onChange={(e) => setDebouncedScaleY(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
            value={Math.round(localRotation * (180 / Math.PI))}
            onChange={(e) =>
              setDebouncedRotation(Number(e.target.value) * (Math.PI / 180))
            }
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium mb-1">Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={localOpacity}
            onChange={(e) => setDebouncedOpacity(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(localOpacity * 100)}%
          </div>
        </div>

        {/* Type-specific properties */}
        <TypeSpecificProperties item={item} onUpdate={onUpdate} />
      </div>
    );
  }
);

SingleItemProperties.displayName = "SingleItemProperties";

// Memoized type-specific properties component
const TypeSpecificProperties = React.memo(
  ({
    item,
    onUpdate,
  }: {
    item: CanvasItem;
    onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  }) => {
    const renderProperties = useCallback(() => {
      switch (item.type) {
        case "rectangle":
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Width
                  </label>
                  <input
                    type="number"
                    value={item.width}
                    onChange={(e) =>
                      onUpdate(item.id, { width: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Height
                  </label>
                  <input
                    type="number"
                    value={item.height}
                    onChange={(e) =>
                      onUpdate(item.id, { height: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
                  onChange={(e) =>
                    onUpdate(item.id, { cornerRadius: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
                    onChange={(e) =>
                      onUpdate(item.id, { radiusX: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Radius Y
                  </label>
                  <input
                    type="number"
                    value={item.radiusY}
                    onChange={(e) =>
                      onUpdate(item.id, { radiusY: Number(e.target.value) })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
                  onChange={(e) =>
                    onUpdate(item.id, { fontSize: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
                  onChange={(e) =>
                    onUpdate(item.id, { cornerRadius: Number(e.target.value) })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-300"
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
    }, [item, onUpdate]);

    return renderProperties();
  }
);

TypeSpecificProperties.displayName = "TypeSpecificProperties";

// Memoized color picker component
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
        className="w-full h-8 border border-gray-300 rounded"
      />
    </div>
  )
);

ColorPicker.displayName = "ColorPicker";
