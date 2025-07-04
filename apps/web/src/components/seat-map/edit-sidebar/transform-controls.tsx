"use client";

import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Move3D, RotateCw, Layers } from "lucide-react";
import { Shape } from "@/types/seat-map-types";
import { useStoreInlineEdit } from "../hooks/useStoreInlineEdit";
import { useCanvasEvents } from "../hooks/useCanvasEvents";
import { useStageRef } from "../providers/stage-provider";

interface TransformControlsProps {
  selectedShapes: Shape[];
  updateMultipleShapes: (
    updates: { id: string; updates: Partial<Shape> }[]
  ) => void;
  saveToHistory: () => void;
}

export const TransformControls: React.FC<TransformControlsProps> = ({
  selectedShapes,
  updateMultipleShapes,
  saveToHistory,
}) => {
  const editId =
    selectedShapes.length === 1
      ? selectedShapes[0].id
      : `batch-${selectedShapes.map((s) => s.id).join("-")}`;

  const rotatableShapes = selectedShapes.filter(
    (shape) => shape.type !== "polygon"
  );
  const hasPolygons = selectedShapes.some((shape) => shape.type === "polygon");

  const avgRotation =
    rotatableShapes.length > 0
      ? rotatableShapes.reduce((sum, s) => sum + (s.rotation || 0), 0) /
        rotatableShapes.length
      : 0;

  const rotationEdit = useStoreInlineEdit(
    `${editId}-rotation`,
    Math.round(avgRotation),
    (value) => {
      const updates = rotatableShapes.map((shape) => ({
        id: shape.id,
        updates: { rotation: parseFloat(value) || 0 },
      }));
      if (updates.length > 0) {
        updateMultipleShapes(updates);
        saveToHistory();
      }
    }
  );

  const handleRotationChange = (deltaRotation: number) => {
    const updates = rotatableShapes.map((shape) => ({
      id: shape.id,
      updates: { rotation: (shape.rotation || 0) + deltaRotation },
    }));
    if (updates.length > 0) {
      updateMultipleShapes(updates);
      saveToHistory();
    }
  };

  const handleRotationReset = () => {
    const updates = rotatableShapes.map((shape) => ({
      id: shape.id,
      updates: { rotation: 0 },
    }));
    if (updates.length > 0) {
      updateMultipleShapes(updates);
      saveToHistory();
    }
  };

  return (
    <div className="space-y-4 text-white">
      {/* Position with Inline Editing */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Move3D className="w-3 h-3" />
          Position
        </Label>

        {/* Movement Buttons - affects ALL shapes including polygons */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            size="sm"
            className="border border-white/30"
            variant="ghost"
            onClick={() => {
              const updates = selectedShapes.map((shape) => ({
                id: shape.id,
                updates: { x: shape.x - 10 },
              }));
              updateMultipleShapes(updates);
              saveToHistory();
            }}
          >
            ← 10px
          </Button>
          <Button
            size="sm"
            className="border border-white/30"
            variant="ghost"
            onClick={() => {
              const updates = selectedShapes.map((shape) => ({
                id: shape.id,
                updates: { x: shape.x + 10 },
              }));
              updateMultipleShapes(updates);
              saveToHistory();
            }}
          >
            → 10px
          </Button>
          <Button
            size="sm"
            className="border border-white/30"
            variant="ghost"
            onClick={() => {
              const updates = selectedShapes.map((shape) => ({
                id: shape.id,
                updates: { y: shape.y - 10 },
              }));
              updateMultipleShapes(updates);
              saveToHistory();
            }}
          >
            ↑ 10px
          </Button>
          <Button
            size="sm"
            className="border border-white/30"
            variant="ghost"
            onClick={() => {
              const updates = selectedShapes.map((shape) => ({
                id: shape.id,
                updates: { y: shape.y + 10 },
              }));
              updateMultipleShapes(updates);
              saveToHistory();
            }}
          >
            ↓ 10px
          </Button>
        </div>
      </div>

      {/* Rotation with Inline Editing - FIXED: Only for non-polygon shapes */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <RotateCw className="w-3 h-3" />
          Rotation
          {hasPolygons && (
            <span className="text-xs text-yellow-400 ml-1">
              (excluding polygons)
            </span>
          )}
        </Label>

        {/* Show warning if only polygons are selected */}
        {rotatableShapes.length === 0 ? (
          <div className="mt-1 p-2 bg-yellow-900/30 border border-yellow-600/30 rounded text-xs text-yellow-300">
            Rotation not available for polygon shapes
          </div>
        ) : (
          <>
            {rotationEdit.isEditing ? (
              <Input
                type="number"
                value={rotationEdit.editValue}
                {...rotationEdit.eventHandlers}
                className="h-8 mt-1"
                step="1"
                placeholder="degrees"
                autoFocus
              />
            ) : (
              <div
                className="h-8 mt-1 px-3 py-1 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 bg-gray-800 flex items-center transition-colors"
                onClick={rotationEdit.eventHandlers.onClick}
              >
                <span className="text-gray-300">
                  {Math.round(avgRotation)}°
                  {rotatableShapes.length < selectedShapes.length &&
                    ` (${rotatableShapes.length}/${selectedShapes.length} shapes)`}
                </span>
              </div>
            )}

            {/* Rotation Buttons - FIXED: Only affect non-polygon shapes */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                size="sm"
                className="border border-white/30"
                variant="ghost"
                onClick={() => handleRotationChange(-15)}
                disabled={rotatableShapes.length === 0}
              >
                -15°
              </Button>
              <Button
                size="sm"
                className="border border-white/30"
                variant="ghost"
                onClick={handleRotationReset}
                disabled={rotatableShapes.length === 0}
              >
                Reset
              </Button>
              <Button
                size="sm"
                className="border border-white/30"
                variant="ghost"
                onClick={() => handleRotationChange(15)}
                disabled={rotatableShapes.length === 0}
              >
                +15°
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Alignment - affects ALL shapes including polygons */}
      <div>
        <Label className="text-xs flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Align Shapes
        </Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Button
            size="sm"
            className="border border-white/30"
            variant="ghost"
            onClick={() => {
              const leftmostX = Math.min(...selectedShapes.map((s) => s.x));
              const updates = selectedShapes.map((shape) => ({
                id: shape.id,
                updates: { x: leftmostX },
              }));
              updateMultipleShapes(updates);
              saveToHistory();
            }}
          >
            Align Left
          </Button>
          <Button
            size="sm"
            className="border border-white/30"
            variant="ghost"
            onClick={() => {
              const topmostY = Math.min(...selectedShapes.map((s) => s.y));
              const updates = selectedShapes.map((shape) => ({
                id: shape.id,
                updates: { y: topmostY },
              }));
              updateMultipleShapes(updates);
              saveToHistory();
            }}
          >
            Align Top
          </Button>
        </div>
      </div>
    </div>
  );
};
