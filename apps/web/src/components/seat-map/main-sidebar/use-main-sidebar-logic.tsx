import { useState, useEffect, useCallback, useMemo } from "react";
import { useCanvasStore, useAreaMode } from "../store/main-store";
import { Shape } from "@/types/seat-map-types";

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
const isPolygonShape = (shape: any): boolean => shape?.type === "polygon";

export function useMainSidebarLogic() {
  const {
    selectedShapeIds,
    shapes,
    updateShape,
    updateMultipleShapes,
    saveToHistory,
  } = useCanvasStore();

  const { isInAreaMode, selectedRowIds, selectedSeatIds, zoomedArea } =
    useAreaMode();

  const [batchValues, setBatchValues] = useState<Record<string, any>>({});

  const selectedShapes = useMemo(() => {
    return shapes.filter((shape) => selectedShapeIds.includes(shape.id));
  }, [shapes, selectedShapeIds]);

  const singleShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const isPolygonSelected = singleShape && isPolygonShape(singleShape);

  // Calculate batch values for multiple shapes
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
            commonValues.fill = textFills[0];
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

  // Handle batch changes
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
        }
      } else {
        const shapeUpdates = selectedShapeIds.map((id) => ({
          id,
          updates: { [key]: value },
        }));
        updateMultipleShapes(shapeUpdates);
      }
    },
    [selectedShapes, selectedShapeIds, updateMultipleShapes, saveToHistory]
  );

  // Handle single shape updates
  const handleSingleShapeUpdate = useCallback(
    (updates: Record<string, any>) => {
      if (singleShape) {
        const filteredUpdates = { ...updates };

        if (singleShape.type === "polygon" && "rotation" in filteredUpdates) {
          console.warn("Rotation not supported for polygon shapes");
          delete filteredUpdates.rotation;
        }

        const validatedUpdates = Object.entries(filteredUpdates).reduce(
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

  // Calculate shape type summary
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

  // Get single shape batch values for tabs
  const getSingleShapeBatchValues = useCallback(() => {
    if (!singleShape) return {};

    return {
      fill: singleShape.fill,
      stroke: singleShape.stroke,
      strokeWidth: singleShape.strokeWidth || 1,
      opacity: singleShape.opacity ?? 1,
      name: singleShape.name,
      fontSize: safeGetProperty(singleShape, "fontSize", 16),
      fontFamily: safeGetProperty(singleShape, "fontFamily", "Arial"),
      align: safeGetProperty(singleShape, "align", "left"),
      width: safeGetProperty(singleShape, "width", 200),
      height: safeGetProperty(singleShape, "height", 24),

      ...(isRectShape(singleShape) && {
        cornerRadius: safeGetProperty(singleShape, "cornerRadius", 0),
      }),
      ...(isCircleShape(singleShape) && {
        radius: safeGetProperty(singleShape, "radius", 50),
      }),
    };
  }, [singleShape]);

  return {
    selectedShapes,
    selectedShapeIds,
    singleShape,
    isPolygonSelected,
    batchValues,
    shapeTypeSummary,
    isInAreaMode,
    selectedRowIds,
    selectedSeatIds,
    zoomedArea,
    handlers: {
      handleBatchChange,
      handleSingleShapeUpdate,
      updateMultipleShapes,
      saveToHistory,
      getSingleShapeBatchValues,
    },
    utils: {
      safeGetProperty,
      isRectShape,
      isCircleShape,
      isTextShape,
      isPolygonShape,
    },
  };
}
