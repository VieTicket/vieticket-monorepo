"use client";

import React, { useCallback } from "react";
import { CanvasItem } from "../../types";
import {
  cloneCanvasItem,
  ShapeContext,
  useSeatMapStore,
} from "../../store/seat-map-store";
import { getSelectionTransform } from "../../events/transform-events";
import { findParentContainer, findShapeById } from "../../shapes";
import { updateShapeGraphics } from "../utils/shape-graphics-updater";
import { DebouncedInput } from "../inputs/debounced-input";
import { DebouncedTextarea } from "../inputs/debounced-textarea";
import { TypeSpecificProperties } from "./type-specific-properties";

interface SingleItemPropertiesProps {
  item: CanvasItem;
}

export const SingleItemProperties = React.memo(
  ({ item }: SingleItemPropertiesProps) => {
    const selectedItems = useSeatMapStore((state) => state.selectedShapes);
    const shapes = useSeatMapStore((state) => state.shapes);
    const updateShapes = useSeatMapStore((state) => state.updateShapes);

    // Add this function to check if changes are only property updates that shouldn't save to history
    const shouldSavePropertyChangeToHistory = (
      originalShape: CanvasItem,
      updatedShape: CanvasItem,
      updates: Partial<CanvasItem>
    ): boolean => {
      // Properties that should NOT save to history (cosmetic/display changes)
      const nonHistoryProperties = new Set([
        "visible",
        "locked",
        "selected",
        "expanded", // for containers
        "color",
        "strokeColor",
        "opacity",
        "text", // for text shapes
        "fontSize",
        "fontFamily",
      ]);

      // Properties that SHOULD save to history (structural/positional changes)
      const historyProperties = new Set([
        "name",
        "x",
        "y",
        "rotation",
        "scaleX",
        "scaleY",
        "width",
        "height",
        "radiusX",
        "radiusY",
        "cornerRadius",
        "points", // for polygons
      ]);

      // Check if any of the updates are structural changes
      const hasStructuralChanges = Object.keys(updates).some((key) =>
        historyProperties.has(key)
      );

      // If there are structural changes, save to history
      if (hasStructuralChanges) {
        return true;
      }

      // Check if all changes are cosmetic
      const allChangesAreCosmetic = Object.keys(updates).every((key) =>
        nonHistoryProperties.has(key)
      );

      // Only save to history if changes are NOT purely cosmetic
      return !allChangesAreCosmetic;
    };

    const handleUpdate = useCallback(
      (id: string, updates: Partial<CanvasItem>) => {
        const shape = findShapeById(id);
        if (!shape) return;

        // ✅ Capture the original state before any modifications
        const originalShape = cloneCanvasItem(shape);

        // Apply the updates
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

        // ✅ Check if this change should be saved to history
        const shouldSaveToHistory = shouldSavePropertyChangeToHistory(
          originalShape,
          shape,
          updates
        );

        if (shouldSaveToHistory) {
          // ✅ Build context for the property change
          const buildPropertyChangeContext = (): ShapeContext => {
            const parentContainer = findParentContainer(shape);

            return {
              topLevel: parentContainer
                ? []
                : [
                    {
                      id: shape.id,
                      type: shape.type,
                      parentId: null,
                    },
                  ],
              nested: parentContainer
                ? [
                    {
                      id: shape.id,
                      type: shape.type,
                      parentId: parentContainer.id,
                    },
                  ]
                : [],
              operation: "modify",
              containerPositions: parentContainer
                ? {
                    [parentContainer.id]: {
                      x: parentContainer.x,
                      y: parentContainer.y,
                    },
                  }
                : undefined,
            };
          };

          const context = buildPropertyChangeContext();

          // ✅ Save to history with proper context
          useSeatMapStore.getState()._saveToHistory(
            {
              shapes: [originalShape],
              context,
            },
            {
              shapes: [cloneCanvasItem(shape)],
              context,
            }
          );
        }

        // ✅ Update shapes without saving history again (already saved above if needed)
        updateShapes([...shapes], false);

        const selectionTransform = getSelectionTransform();
        if (selectionTransform && selectedItems.some((s) => s.id === id)) {
          selectionTransform.updateSelection(selectedItems);
        }
      },
      [shapes, updateShapes, selectedItems]
    );

    return (
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <DebouncedTextarea
            value={item.name}
            onChange={() => {}}
            onUpdate={(value) => handleUpdate(item.id, { name: value })}
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
              onUpdate={(value) => handleUpdate(item.id, { x: value })}
              className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Y</label>
            <DebouncedInput
              type="number"
              value={item.y}
              onChange={() => {}}
              onUpdate={(value) => handleUpdate(item.id, { y: value })}
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
              onUpdate={(value) => handleUpdate(item.id, { scaleX: value })}
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
              onUpdate={(value) => handleUpdate(item.id, { scaleY: value })}
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
              handleUpdate(item.id, { rotation: value * (Math.PI / 180) })
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
              handleUpdate(item.id, {
                opacity: Math.max(0, Math.min(1, value)),
              })
            }
            isFloat={true}
            className="w-full px-2 py-1 border border-gray-600 rounded text-sm bg-gray-800 text-white"
          />
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(item.opacity * 100)}%
          </div>
        </div>

        {/* Type-specific properties */}
        <TypeSpecificProperties item={item} onUpdate={handleUpdate} />
      </div>
    );
  }
);

SingleItemProperties.displayName = "SingleItemProperties";
