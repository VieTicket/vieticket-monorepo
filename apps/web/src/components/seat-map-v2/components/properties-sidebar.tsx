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
import { useDebounce } from "@/hooks/useDebounce";
import {
  previouslyClickedShape,
  setPreviouslyClickedShape,
  setWasDragged,
  setWasTransformed,
  wasDragged,
  wasTransformed,
} from "../variables";
import { findParentContainer } from "../shapes";

interface PropertiesSidebarProps {
  onGroupItems?: (items: CanvasItem[]) => void;
  onUngroupItems?: (container: ContainerGroup) => void;
}

export const PropertiesSidebar = React.memo(
  ({ onGroupItems, onUngroupItems }: PropertiesSidebarProps) => {
    const selectedItems = useSeatMapStore((state) => state.selectedShapes);
    const shapes = useSeatMapStore((state) => state.shapes);
    const updateShapes = useSeatMapStore((state) => state.updateShapes);

    const findShapeById = useCallback(
      (id: string): CanvasItem | null => {
        const findInShapes = (shapeList: CanvasItem[]): CanvasItem | null => {
          for (const shape of shapeList) {
            if (shape.id === id) {
              return shape;
            }
            if (shape.type === "container") {
              const container = shape as ContainerGroup;
              const found = findInShapes(container.children);
              if (found) return found;
            }
          }
          return null;
        };

        return findInShapes(shapes);
      },
      [shapes]
    );

    const handleUpdate = useCallback(
      (id: string, updates: Partial<CanvasItem>) => {
        const shape = findShapeById(id);
        if (!shape) return;

        Object.assign(shape, updates);

        if (updates.x !== undefined || updates.y !== undefined) {
          const parentContainer = findParentContainer(shape);
          if (parentContainer) {
            // Shape is in a container - position is relative to container
            shape.graphics.position.set(shape.x, shape.y);
          } else {
            // Shape is at root level - position is absolute
            shape.graphics.position.set(shape.x, shape.y);
          }
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

        updateShapeGraphics(shape, updates);

        updateShapes([...shapes], true);

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
    const rounded = Math.round(value * 1000) / 1000;
    const str = rounded.toString();

    return str.replace(/^0+(?=\d)/, "") || "0";
  } else {
    const str = Math.round(value).toString();
    return str.replace(/^0+(?=\d)/, "") || "0";
  }
};

const parseNumber = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

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
const DebouncedInput = React.memo(
  ({
    value,
    onChange,
    onUpdate,
    isFloat = false,
    className,
    ...props
  }: {
    value: number;
    onChange: (value: string) => void;
    onUpdate: (value: number) => void;
    isFloat?: boolean;
    className?: string;
    [key: string]: any;
  }) => {
    const [localValue, setLocalValue] = useState(() =>
      formatNumber(value, isFloat)
    );
    const debouncedValue = useDebounce(localValue, 300);

    React.useEffect(() => {
      const numericValue = parseNumber(debouncedValue);
      if (numericValue !== value && !isNaN(numericValue)) {
        if (wasDragged || wasTransformed) {
          setLocalValue(formatNumber(value, isFloat));
          return;
        }
        const selectedItems = useSeatMapStore.getState().selectedShapes;
        const currentShape =
          selectedItems.length === 1 ? selectedItems[0] : null;

        if (
          !previouslyClickedShape ||
          (currentShape && previouslyClickedShape.id === currentShape.id)
        ) {
          onUpdate(numericValue);
        } else {
          setLocalValue(formatNumber(value, isFloat));
        }
      }
    }, [debouncedValue, value, onUpdate, isFloat]);

    React.useEffect(() => {
      setLocalValue(formatNumber(value, isFloat));
    }, [value, isFloat]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      setWasDragged(false);
      setWasTransformed(false);
      setPreviouslyClickedShape(null);
      setLocalValue(inputValue);
      onChange(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    return (
      <input
        {...props}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

DebouncedInput.displayName = "DebouncedInput";

const DebouncedTextarea = React.memo(
  ({
    value,
    onChange,
    onUpdate,
    className,
    ...props
  }: {
    value: string;
    onChange: (value: string) => void;
    onUpdate: (value: string) => void;
    className?: string;
    [key: string]: any;
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const debouncedValue = useDebounce(localValue, 300);

    React.useEffect(() => {
      if (debouncedValue !== value) {
        const selectedItems = useSeatMapStore.getState().selectedShapes;
        const currentShape =
          selectedItems.length === 1 ? selectedItems[0] : null;

        if (
          !previouslyClickedShape ||
          (currentShape && previouslyClickedShape.id === currentShape.id)
        ) {
          onUpdate(debouncedValue);
        } else {
          setLocalValue(value);
        }
      }
    }, [debouncedValue, value, onUpdate]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const inputValue = e.target.value;
      setLocalValue(inputValue);
      setPreviouslyClickedShape(null);
      onChange(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.currentTarget.blur();
      }
    };

    return (
      <textarea
        {...props}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

DebouncedTextarea.displayName = "DebouncedTextarea";

const SingleItemProperties = React.memo(
  ({
    item,
    onUpdate,
  }: {
    item: CanvasItem;
    onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  }) => {
    return (
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <DebouncedTextarea
            value={item.name}
            onChange={() => {}}
            onUpdate={(value) => onUpdate(item.id, { name: value })}
            rows={1}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white resize-none"
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">X</label>
            <DebouncedInput
              type="number"
              value={item.x}
              onChange={() => {}}
              onUpdate={(value) => onUpdate(item.id, { x: value })}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Y</label>
            <DebouncedInput
              type="number"
              value={item.y}
              onChange={() => {}}
              onUpdate={(value) => onUpdate(item.id, { y: value })}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
        </div>

        {findParentContainer(item) && (
          <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
            <div>
              Inside container: {findParentContainer(item)?.name || "Unnamed"}
            </div>
            <div>Position is relative to container</div>
          </div>
        )}

        {/* Scale */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Scale X</label>
            <DebouncedInput
              type="number"
              step="0.001"
              value={item.scaleX}
              onChange={() => {}}
              onUpdate={(value) => onUpdate(item.id, { scaleX: value })}
              isFloat={true}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scale Y</label>
            <DebouncedInput
              type="number"
              step="0.001"
              value={item.scaleY}
              onChange={() => {}}
              onUpdate={(value) => onUpdate(item.id, { scaleY: value })}
              isFloat={true}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Rotation (degrees)
          </label>
          <DebouncedInput
            type="number"
            step="0.001"
            value={item.rotation * (180 / Math.PI)}
            onChange={() => {}}
            onUpdate={(value) =>
              onUpdate(item.id, { rotation: value * (Math.PI / 180) })
            }
            isFloat={true}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium mb-1">Opacity</label>
          <DebouncedInput
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={item.opacity}
            onChange={() => {}}
            onUpdate={(value) =>
              onUpdate(item.id, { opacity: Math.max(0, Math.min(1, value)) })
            }
            isFloat={true}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
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

const TypeSpecificProperties = React.memo(
  ({
    item,
    onUpdate,
  }: {
    item: CanvasItem;
    onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  }) => {
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

      // Update the polygon case in TypeSpecificProperties
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
                    <div className="flex-1">
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
                const { ungroupContainer } = require("../utils/grouping");
                ungroupContainer(item as ContainerGroup);
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

const ColorPicker = React.memo(
  ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (color: number) => void;
  }) => {
    const [localColorValue, setLocalColorValue] = useState(
      `#${value.toString(16).padStart(6, "0")}`
    );

    const debouncedColorValue = useDebounce(localColorValue, 300);

    React.useEffect(() => {
      const debouncedColorNumber = parseInt(debouncedColorValue.slice(1), 16);
      if (debouncedColorNumber !== value && !isNaN(debouncedColorNumber)) {
        const selectedItems = useSeatMapStore.getState().selectedShapes;
        const currentShape =
          selectedItems.length === 1 ? selectedItems[0] : null;

        if (
          !previouslyClickedShape ||
          (currentShape && previouslyClickedShape.id === currentShape.id)
        ) {
          onChange(debouncedColorNumber);
        } else {
          setLocalColorValue(`#${value.toString(16).padStart(6, "0")}`);
        }
      }
    }, [debouncedColorValue, onChange, value]);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalColorValue(e.target.value);
      setPreviouslyClickedShape(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <input
          type="color"
          value={localColorValue}
          onChange={handleColorChange}
          onKeyDown={handleKeyDown}
          className="w-full h-8 border border-gray-600 rounded"
        />
      </div>
    );
  }
);

ColorPicker.displayName = "ColorPicker";
