import {
  CanvasItem,
  RectangleShape,
  EllipseShape,
  TextShape,
  PolygonShape,
  ImageShape,
  SVGShape,
  ContainerGroup,
} from "../types";
import { useSeatMapStore, UndoRedoAction } from "../store/seat-map-store";
import { shapes, setShapes, shapeContainer, addShape } from "../variables";
import { getSelectionTransform } from "../events/transform-events";
import { updateContainerGraphics } from "../shapes/container-shape";
import { updatePolygonGraphics } from "../shapes/polygon-shape";
import { updateSVGGraphics } from "../shapes/svg-shape";
import { createImage, updateImageGraphics } from "../shapes/image-shape";
import { getEventManager } from "../events/event-manager";
import { createRectangle } from "../shapes/rectangle-shape";
import { createEllipse } from "../shapes/ellipse-shape";
import { createText } from "../shapes/text-shape";
import { createPolygon } from "../shapes/polygon-shape";
import { createContainer } from "../shapes/container-shape";
import { createSVG } from "../shapes/svg-shape";
import * as PIXI from "pixi.js";
import { addShapeToStage } from "../shapes";

/**
 * Recreate a shape from stored data without graphics
 */
const recreateShape = async (shapeData: CanvasItem): Promise<CanvasItem> => {
  let recreatedShape: CanvasItem;
  switch (shapeData.type) {
    case "rectangle": {
      const rectData = shapeData as RectangleShape;
      recreatedShape = createRectangle(
        rectData.x - rectData.width / 2, // Convert center to top-left
        rectData.y - rectData.height / 2, // Convert center to top-left
        rectData.width,
        rectData.height
      );
      // Apply stored properties
      recreatedShape.id = rectData.id;
      recreatedShape.name = rectData.name;
      (recreatedShape as RectangleShape).cornerRadius = rectData.cornerRadius;
      (recreatedShape as RectangleShape).color = rectData.color;
      (recreatedShape as RectangleShape).strokeColor = rectData.strokeColor;
      (recreatedShape as RectangleShape).strokeWidth = rectData.strokeWidth;
      break;
    }

    case "ellipse": {
      const ellipseData = shapeData as EllipseShape;
      recreatedShape = createEllipse(
        ellipseData.x,
        ellipseData.y,
        ellipseData.radiusX,
        ellipseData.radiusY
      );
      // Apply stored properties
      recreatedShape.id = ellipseData.id;
      recreatedShape.name = ellipseData.name;
      (recreatedShape as EllipseShape).color = ellipseData.color;
      (recreatedShape as EllipseShape).strokeColor = ellipseData.strokeColor;
      (recreatedShape as EllipseShape).strokeWidth = ellipseData.strokeWidth;
      break;
    }

    case "text": {
      const textData = shapeData as TextShape;
      recreatedShape = createText(textData.x, textData.y, textData.text);
      // Apply stored properties
      recreatedShape.id = textData.id;
      recreatedShape.name = textData.name;
      (recreatedShape as TextShape).fontSize = textData.fontSize;
      (recreatedShape as TextShape).fontFamily = textData.fontFamily;
      (recreatedShape as TextShape).fontWeight = textData.fontWeight;
      (recreatedShape as TextShape).textAlign = textData.textAlign;
      (recreatedShape as TextShape).color = textData.color;

      // Update text graphics with stored properties
      if (recreatedShape.graphics instanceof PIXI.Text) {
        recreatedShape.graphics.style.fontSize = textData.fontSize;
        recreatedShape.graphics.style.fontFamily = textData.fontFamily;
        recreatedShape.graphics.style.fontWeight = textData.fontWeight;
        recreatedShape.graphics.style.align = textData.textAlign;
        recreatedShape.graphics.style.fill = textData.color;
      }
      break;
    }

    case "polygon": {
      const polygonData = shapeData as PolygonShape;
      recreatedShape = createPolygon(
        polygonData.points,
        polygonData.cornerRadius
      );
      // Apply stored properties
      recreatedShape.id = polygonData.id;
      recreatedShape.name = polygonData.name;
      (recreatedShape as PolygonShape).color = polygonData.color;
      (recreatedShape as PolygonShape).strokeColor = polygonData.strokeColor;
      (recreatedShape as PolygonShape).strokeWidth = polygonData.strokeWidth;
      break;
    }

    case "svg": {
      const svgData = shapeData as SVGShape;
      recreatedShape = createSVG(
        svgData.x,
        svgData.y,
        svgData.svgContent,
        svgData.name
      );
      // Apply stored properties
      recreatedShape.id = svgData.id;
      (recreatedShape as SVGShape).originalWidth = svgData.originalWidth;
      (recreatedShape as SVGShape).originalHeight = svgData.originalHeight;
      break;
    }

    case "image": {
      const imageData = shapeData as ImageShape;

      recreatedShape = await createImage(
        imageData.x,
        imageData.y,
        imageData.src,
        imageData.name
      );

      // Apply stored properties
      recreatedShape.id = imageData.id;
      recreatedShape.name = imageData.name;
      (recreatedShape as ImageShape).originalWidth = imageData.originalWidth;
      (recreatedShape as ImageShape).originalHeight = imageData.originalHeight;

      break;
    }

    case "container": {
      const containerData = shapeData as ContainerGroup;
      recreatedShape = createContainer([], containerData.name);
      // Apply stored properties
      recreatedShape.id = containerData.id;
      recreatedShape.name = containerData.name;
      (recreatedShape as ContainerGroup).expanded = containerData.expanded;

      // Recursively recreate children
      if (containerData.children && containerData.children.length > 0) {
        const recreatedChildren = await Promise.all(
          containerData.children.map((child) => recreateShape(child))
        );
        (recreatedShape as ContainerGroup).children = recreatedChildren;

        // Add children to container graphics
        recreatedChildren.forEach((child) => {
          if (recreatedShape.graphics instanceof PIXI.Container) {
            recreatedShape.graphics.addChild(child.graphics);
          }
        });
      }
      break;
    }

    default:
      throw new Error(`Unknown shape type: ${shapeData}`);
  }

  // Apply common properties
  recreatedShape.x = shapeData.x;
  recreatedShape.y = shapeData.y;
  recreatedShape.rotation = shapeData.rotation || 0;
  recreatedShape.scaleX = shapeData.scaleX || 1;
  recreatedShape.scaleY = shapeData.scaleY || 1;
  recreatedShape.opacity = shapeData.opacity || 1;
  recreatedShape.visible = shapeData.visible;
  recreatedShape.locked = shapeData.locked;
  recreatedShape.selected = shapeData.selected;

  // Update graphics with common properties
  if (recreatedShape.graphics) {
    recreatedShape.graphics.position.set(recreatedShape.x, recreatedShape.y);
    recreatedShape.graphics.rotation = recreatedShape.rotation;
    recreatedShape.graphics.scale.set(
      recreatedShape.scaleX,
      recreatedShape.scaleY
    );
    recreatedShape.graphics.alpha = recreatedShape.opacity;
    recreatedShape.graphics.visible = recreatedShape.visible;
  }

  return recreatedShape;
};

/**
 * Restore graphics references for specific shapes (for existing shapes)
 */
const restoreGraphicsReferences = (shapesToRestore: CanvasItem[]) => {
  const currentShapes = shapes;

  shapesToRestore.forEach((restoredShape) => {
    const currentShape = currentShapes.find((s) => s.id === restoredShape.id);
    if (currentShape && currentShape.graphics) {
      restoredShape.graphics = currentShape.graphics;

      switch (restoredShape.type) {
        case "rectangle":
        case "ellipse":
        case "text":
          restoredShape.graphics.position.set(restoredShape.x, restoredShape.y);
          restoredShape.graphics.rotation = restoredShape.rotation || 0;
          restoredShape.graphics.scale.set(
            restoredShape.scaleX || 1,
            restoredShape.scaleY || 1
          );
          restoredShape.graphics.alpha = restoredShape.opacity || 1;
          restoredShape.graphics.visible = restoredShape.visible;
          break;
        case "polygon":
          updatePolygonGraphics(restoredShape as any);
          break;
        case "image":
          updateImageGraphics(restoredShape as any);
          break;
        case "svg":
          updateSVGGraphics(restoredShape as any);
          break;
        case "container":
          updateContainerGraphics(restoredShape as any);
          break;
      }
    }
  });
};

/**
 * Determine operation type based on before/after state data
 */
const getOperationType = (before: any, after: any) => {
  const beforeShapes = before.shapes || [];
  const afterShapes = after.shapes || [];

  if (beforeShapes.length === 0 && afterShapes.length > 0) {
    return "CREATE";
  }

  if (beforeShapes.length > 0 && afterShapes.length === 0) {
    return "DELETE";
  }

  if (
    beforeShapes.length === afterShapes.length &&
    beforeShapes.every((b: CanvasItem) =>
      afterShapes.some((a: CanvasItem) => a.id === b.id)
    )
  ) {
    return "MODIFY";
  }

  if (
    !before.shapes &&
    !after.shapes &&
    (before.selectedShapes || after.selectedShapes)
  ) {
    return "SELECT";
  }

  return "MODIFY";
};

/**
 * Apply delta changes to restore state
 */
const applyDeltaRestore = async (action: UndoRedoAction, isUndo: boolean) => {
  const store = useSeatMapStore.getState();
  const currentShapes = [...store.shapes];
  console.log("Applying action:", action, "IsUndo:", isUndo);
  const eventManager = getEventManager();

  let updatedShapes = [...currentShapes];

  const operationType = getOperationType(
    isUndo ? action.data.after : action.data.before,
    isUndo ? action.data.before : action.data.after
  );
  const stateToApply = action.data.after;
  const affectedIds = stateToApply.affectedIds || [];

  console.log("Operation Type:", operationType, "IsUndo:", isUndo);

  switch (operationType) {
    case "CREATE":
      const shapesToRecreate = stateToApply.shapes || [];
      console.log("Shapes to recreate:", shapesToRecreate, stateToApply);
      for (const shapeData of shapesToRecreate) {
        try {
          const recreatedShape = await recreateShape(shapeData);
          shapeContainer!.addChild(recreatedShape.graphics);
          addShape(recreatedShape);
          if (!updatedShapes.find((s) => s.id === recreatedShape.id)) {
            updatedShapes.push(recreatedShape);
          }
        } catch (error) {
          console.error("Failed to recreate shape:", error);
        }
      }
      break;

    case "DELETE":
      affectedIds.forEach((id) => {
        const shapeToRemove = updatedShapes.find((s) => s.id === id);
        if (shapeToRemove) {
          eventManager?.removeShapeEvents(shapeToRemove);
          if (shapeToRemove.graphics && shapeToRemove.graphics.parent) {
            shapeToRemove.graphics.parent.removeChild(shapeToRemove.graphics);
          }
        }
      });
      updatedShapes = updatedShapes.filter(
        (shape) => !affectedIds.includes(shape.id)
      );
      break;

    case "MODIFY":
    default:
      // Apply the state changes by restoring graphics references
      const shapesToApply = stateToApply.shapes || [];
      shapesToApply.forEach((shapeToApply) => {
        const index = updatedShapes.findIndex((s) => s.id === shapeToApply.id);
        if (index !== -1) {
          // Merge the stored state with current shape, preserving graphics
          updatedShapes[index] = {
            ...updatedShapes[index],
            ...shapeToApply,
          };
        }
      });
      restoreGraphicsReferences(shapesToApply);
      break;
  }

  setShapes(updatedShapes);
  store.updateShapes(updatedShapes, false);
  store.setSelectedShapes([]);

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection([]);
  }
};

/**
 * Perform undo operation
 */
export const performUndo = async (): Promise<boolean> => {
  const actionToUndo = useSeatMapStore.getState().undo();

  if (!actionToUndo) {
    return false;
  }

  await applyDeltaRestore(actionToUndo, true);
  return true;
};

/**
 * Perform redo operation
 */
export const performRedo = async (): Promise<boolean> => {
  const actionToRedo = useSeatMapStore.getState().redo();

  if (!actionToRedo) {
    return false;
  }

  await applyDeltaRestore(actionToRedo, false);
  return true;
};

/**
 * Check if undo is possible
 */
export const canUndo = (): boolean => {
  return useSeatMapStore.getState().canUndo();
};

/**
 * Check if redo is possible
 */
export const canRedo = (): boolean => {
  return useSeatMapStore.getState().canRedo();
};

/**
 * Clear undo/redo history
 */
export const clearHistory = (): void => {
  useSeatMapStore.getState().clearHistory();
};
