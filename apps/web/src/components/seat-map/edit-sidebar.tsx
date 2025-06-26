"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useCanvasStore } from "./store/main-store";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Copy, Trash2, Settings } from "lucide-react";

import { StyleControls } from "./edit-sidebar/style-controls";
import { TextControls } from "./edit-sidebar/text-controls";
import { TransformControls } from "./edit-sidebar/transform-controls";
import { SingleShapeEditor } from "./edit-sidebar/single-shape-editor";

const safeGetProperty = (
  obj: any,
  property: string,
  defaultValue: any
): any => {
  if (!obj || typeof obj !== "object") return defaultValue;

  try {
    const value = obj[property];
    return value !== undefined && value !== null ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

const isRectShape = (shape: any): boolean => shape?.type === "rect";
const isCircleShape = (shape: any): boolean => shape?.type === "circle";
const isTextShape = (shape: any): boolean => shape?.type === "text";

export default function EditSidebar() {
  const {
    selectedShapeIds,
    shapes,
    updateShape,
    updateMultipleShapes,
    saveToHistory,
  } = useCanvasStore();

  const [batchValues, setBatchValues] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<
    "props" | "style" | "text" | "transform"
  >("style");

  const selectedShapes = useMemo(() => {
    return shapes.filter((shape) => selectedShapeIds.includes(shape.id));
  }, [shapes, selectedShapeIds]);

  const singleShape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  useEffect(() => {
    if (selectedShapes.length > 1) {
      const calculateCommonValues = () => {
        const commonValues: Record<string, any> = {};

        const fills = selectedShapes.map((s) => s.fill).filter(Boolean);
        if (fills.length > 0 && fills.every((f) => f === fills[0])) {
          commonValues.fill = fills[0];
        }

        const strokes = selectedShapes.map((s) => s.stroke).filter(Boolean);
        if (strokes.length > 0 && strokes.every((s) => s === strokes[0])) {
          commonValues.stroke = strokes[0];
        }

        const strokeWidths = selectedShapes.map((s) => s.strokeWidth || 1);
        if (strokeWidths.every((w) => w === strokeWidths[0])) {
          commonValues.strokeWidth = strokeWidths[0];
        }

        const opacities = selectedShapes.map((s) => s.opacity ?? 1);
        if (opacities.every((o) => o === opacities[0])) {
          commonValues.opacity = opacities[0];
        }

        const rectShapes = selectedShapes.filter(isRectShape);
        if (rectShapes.length > 0) {
          const radii = rectShapes.map((s) =>
            safeGetProperty(s, "cornerRadius", 0)
          );
          if (radii.every((r) => r === radii[0])) {
            commonValues.cornerRadius = radii[0];
          }
        }

        const circleShapes = selectedShapes.filter(isCircleShape);
        if (circleShapes.length > 0) {
          const radii = circleShapes.map((s) =>
            safeGetProperty(s, "radius", 50)
          );
          if (radii.every((r) => r === radii[0])) {
            commonValues.radius = radii[0];
          }
        }

        const textShapes = selectedShapes.filter(isTextShape);
        if (textShapes.length > 0) {
          const fontSizes = textShapes.map((s) =>
            safeGetProperty(s, "fontSize", 16)
          );
          if (fontSizes.every((f) => f === fontSizes[0])) {
            commonValues.fontSize = fontSizes[0];
          }

          const textFills = textShapes.map((s) => s.fill).filter(Boolean);
          if (
            textFills.length > 0 &&
            textFills.every((f) => f === textFills[0])
          ) {
            commonValues.textFill = textFills[0];
          }

          const fontFamilies = textShapes.map((s) =>
            safeGetProperty(s, "fontFamily", "Arial")
          );
          if (fontFamilies.every((f) => f === fontFamilies[0])) {
            commonValues.fontFamily = fontFamilies[0];
          }

          const aligns = textShapes.map((s) =>
            safeGetProperty(s, "align", "left")
          );
          if (aligns.every((a) => a === aligns[0])) {
            commonValues.align = aligns[0];
          }
        }

        return commonValues;
      };

      const newCommonValues = calculateCommonValues();
      setBatchValues(newCommonValues);
    } else {
      setBatchValues({});
    }
  }, [selectedShapes]);

  const handleBatchChange = useCallback(
    (key: string, value: any) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      setBatchValues((prev) => ({ ...prev, [key]: value }));

      if (key === "textFill") {
        const textShapeIds = selectedShapes
          .filter(isTextShape)
          .map((s) => s.id);

        if (textShapeIds.length > 0) {
          const shapeUpdates = textShapeIds.map((id) => ({
            id,
            updates: { fill: value },
          }));
          updateMultipleShapes(shapeUpdates);
          saveToHistory();
        }
      } else if (key === "cornerRadius") {
        const rectShapeIds = selectedShapes
          .filter(isRectShape)
          .map((s) => s.id);

        if (rectShapeIds.length > 0) {
          const shapeUpdates = rectShapeIds.map((id) => ({
            id,
            updates: { cornerRadius: value },
          }));
          updateMultipleShapes(shapeUpdates);
          saveToHistory();
        }
      } else if (key === "radius") {
        const circleShapeIds = selectedShapes
          .filter(isCircleShape)
          .map((s) => s.id);

        if (circleShapeIds.length > 0) {
          const shapeUpdates = circleShapeIds.map((id) => ({
            id,
            updates: { radius: value },
          }));
          updateMultipleShapes(shapeUpdates);
          saveToHistory();
        }
      } else if (
        key === "fontSize" ||
        key === "fontFamily" ||
        key === "align"
      ) {
        const textShapeIds = selectedShapes
          .filter(isTextShape)
          .map((s) => s.id);

        if (textShapeIds.length > 0) {
          const shapeUpdates = textShapeIds.map((id) => ({
            id,
            updates: { [key]: value },
          }));
          updateMultipleShapes(shapeUpdates);
          saveToHistory();
        }
      } else {
        const shapeUpdates = selectedShapeIds.map((id) => ({
          id,
          updates: { [key]: value },
        }));
        updateMultipleShapes(shapeUpdates);
        saveToHistory();
      }
    },
    [selectedShapes, selectedShapeIds, updateMultipleShapes, saveToHistory]
  );

  const handleSingleShapeUpdate = useCallback(
    (updates: Record<string, any>) => {
      if (singleShape) {
        const validatedUpdates = Object.entries(updates).reduce(
          (acc, [key, value]) => {
            if (
              typeof value === "string" &&
              [
                "x",
                "y",
                "strokeWidth",
                "opacity",
                "cornerRadius",
                "radius",
                "fontSize",
                "rotation",
              ].includes(key)
            ) {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                acc[key] = numValue;
              }
            } else if (value !== undefined && value !== null && value !== "") {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, any>
        );

        if (Object.keys(validatedUpdates).length > 0) {
          updateShape(singleShape.id, validatedUpdates);
        }
      }
    },
    [singleShape, updateShape]
  );

  const shapeTypeSummary = useMemo(() => {
    return Object.entries(
      selectedShapes.reduce(
        (acc, shape) => {
          acc[shape.type] = (acc[shape.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      )
    );
  }, [selectedShapes]);

  if (selectedShapeIds.length === 0) {
    return (
      <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Properties</h2>
          <Badge variant="secondary" className="text-xs">
            0 selected
          </Badge>
        </div>
        <div className="text-center text-gray-400 py-8">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select shapes to edit properties</p>
        </div>
      </div>
    );
  }

  if (singleShape) {
    return (
      <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Shape</h2>
          <Badge variant="secondary" className="text-xs">
            1 selected
          </Badge>
        </div>

        {/* Tabs for single shape */}
        <div className="flex border-b border-gray-700 mb-4">
          <button
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "props"
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("props")}
          >
            Props
          </button>
          <button
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "style"
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("style")}
          >
            Style
          </button>
          <button
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "text"
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("text")}
          >
            Text
          </button>
          <button
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "transform"
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("transform")}
          >
            Transform
          </button>
        </div>

        {/* Tab Content for single shape */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            {activeTab === "props" && (
              <SingleShapeEditor
                shape={singleShape}
                onUpdate={handleSingleShapeUpdate}
                onSave={saveToHistory}
              />
            )}
            {activeTab === "style" && (
              <StyleControls
                selectedShapes={[singleShape]}
                batchValues={{
                  fill: singleShape.fill,
                  stroke: singleShape.stroke,
                  strokeWidth: singleShape.strokeWidth || 1,
                  opacity: singleShape.opacity ?? 1,

                  ...(isRectShape(singleShape) && {
                    cornerRadius: safeGetProperty(
                      singleShape,
                      "cornerRadius",
                      0
                    ),
                  }),
                  ...(isCircleShape(singleShape) && {
                    radius: safeGetProperty(singleShape, "radius", 50),
                  }),
                }}
                onBatchChange={(key, value) => {
                  handleSingleShapeUpdate({ [key]: value });
                  saveToHistory();
                }}
              />
            )}
            {activeTab === "text" && (
              <TextControls
                selectedShapes={[singleShape]}
                batchValues={{
                  textFill: singleShape.fill,
                  fontSize: safeGetProperty(singleShape, "fontSize", 16),
                  fontFamily: safeGetProperty(
                    singleShape,
                    "fontFamily",
                    "Arial"
                  ),
                  align: safeGetProperty(singleShape, "align", "left"),
                }}
                onBatchChange={(key, value) => {
                  const updateKey = key === "textFill" ? "fill" : key;
                  handleSingleShapeUpdate({ [updateKey]: value });
                  saveToHistory();
                }}
              />
            )}
            {activeTab === "transform" && (
              <TransformControls
                selectedShapes={[singleShape]}
                updateMultipleShapes={(updates) => {
                  if (updates.length > 0) {
                    handleSingleShapeUpdate(updates[0].updates);
                  }
                }}
                saveToHistory={saveToHistory}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  } else if (selectedShapeIds.length > 1 && activeTab === "props") {
    setActiveTab("style");
  }

  return (
    <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Batch Edit</h2>
        <Badge variant="secondary" className="text-xs">
          {selectedShapeIds.length} selected
        </Badge>
      </div>

      {/* Tabs for batch editing */}
      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "style"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("style")}
        >
          Style
        </button>
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "text"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("text")}
        >
          Text
        </button>
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === "transform"
              ? "border-blue-400 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("transform")}
        >
          Transform
        </button>
      </div>

      {/* Tab Content for batch editing */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          {activeTab === "style" && (
            <StyleControls
              selectedShapes={selectedShapes}
              batchValues={batchValues}
              onBatchChange={handleBatchChange}
            />
          )}
          {activeTab === "text" && (
            <TextControls
              selectedShapes={selectedShapes}
              batchValues={batchValues}
              onBatchChange={handleBatchChange}
            />
          )}
          {activeTab === "transform" && (
            <TransformControls
              selectedShapes={selectedShapes}
              updateMultipleShapes={updateMultipleShapes}
              saveToHistory={saveToHistory}
            />
          )}
        </CardContent>
      </Card>

      {/* Shape Type Summary */}
      <div className="mt-4">
        <Label className="text-xs text-gray-400">Selected Shapes</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {shapeTypeSummary.map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-xs text-white">
              {count}x {type}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
