import {
  CanvasItem,
  RectangleShape,
  EllipseShape,
  TextShape,
  PolygonShape,
  ImageShape,
  SVGShape,
  ContainerGroup,
  SeatShape,
  AreaModeContainer,
} from "../types";
import {
  useSeatMapStore,
  UndoRedoAction,
  ShapeContext,
  setApplyDeltaRestoreReference,
} from "../store/seat-map-store";
import {
  shapes,
  setShapes,
  shapeContainer,
  addShape,
  selectedContainer,
  areaModeContainer,
  initializeAreaModeContainer,
} from "../variables";
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
import { findParentContainer, findShapeRecursively } from "../shapes";
import { addToGroup, removeFromGroup, ungroupContainer } from "./grouping";
import { recreateSeat, removeSeatFromGrid } from "../shapes/seats";
import { setRecreateShapeReference } from "../collaboration/seatmap-socket-client";

const applyDeltaRestore = async (
  action: UndoRedoAction,
  isUndo: boolean,
  updateHistory: boolean = false,
  broadcastToOthers: boolean = true
) => {
  const store = useSeatMapStore.getState();
  const currentShapes = store.shapes;
  console.log("currentShapes:", currentShapes, shapes);
  const eventManager = getEventManager();

  let updatedShapes = [...currentShapes];

  const operationType = getOperationType(
    isUndo ? action.data.after : action.data.before,
    isUndo ? action.data.before : action.data.after
  );
  let stateToApply = getStateToApply(action, isUndo, operationType);

  const affectedIds = stateToApply.affectedIds || [];

  console.log(
    `🔄 Applying ${operationType} operation (isUndo: ${isUndo}, updateHistory: ${updateHistory})`
  );

  switch (operationType) {
    case "CREATE":
      const shapesToRecreate = stateToApply.shapes || [];
      const creationContext = stateToApply.context;

      console.log("Creation context:", stateToApply);

      if (creationContext?.nested.length || creationContext?.topLevel.length) {
        for (const topLevelItem of creationContext.topLevel) {
          const shapeData = shapesToRecreate.find(
            (s) => s.id === topLevelItem.id
          );
          if (shapeData) {
            try {
              const recreatedShape = await recreateShape(
                shapeData,
                true,
                false
              );
              shapeContainer!.addChild(recreatedShape.graphics);
              addShape(recreatedShape);
              updatedShapes.push(recreatedShape);
            } catch (error) {
              console.error("Failed to recreate top-level shape:", error);
            }
          }
        }

        for (const nestedItem of creationContext.nested) {
          const shapeData = shapesToRecreate.find(
            (s) => s.id === nestedItem.id
          );

          const parentContainer = findShapeRecursively(
            updatedShapes,
            nestedItem.parentId!
          ) as ContainerGroup;

          if (
            shapeData &&
            parentContainer &&
            parentContainer.type === "container"
          ) {
            try {
              const recreatedShape = await recreateShape(
                shapeData,
                false,
                creationContext.nested[0].type !== "container",
                false
              );

              parentContainer.children.push(recreatedShape);
              if (parentContainer.graphics instanceof PIXI.Container) {
                parentContainer.graphics.addChild(recreatedShape.graphics);
              }
            } catch (error) {
              console.error("Failed to recreate nested shape:", error);
            }
          }
        }
      } else {
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
      }
      break;

    case "DELETE":
      const context = stateToApply.context;

      const seatsBeingDeleted: string[] = [];

      if (context?.nested.length || context?.topLevel.length) {
        const allItemsToDelete = [
          ...(context.nested || []),
          ...(context.topLevel || []),
        ];
        allItemsToDelete.forEach((item) => {
          const shapeToDelete = findShapeRecursively(updatedShapes, item.id);
          if (
            shapeToDelete &&
            shapeToDelete.type === "ellipse" &&
            (shapeToDelete as any).rowId &&
            (shapeToDelete as any).gridId
          ) {
            seatsBeingDeleted.push(shapeToDelete.id);
          }
        });
      }

      console.log(
        "DELETE operation - removing shapes with context:",
        stateToApply
      );
      if (context?.nested.length || context?.topLevel.length) {
        context.nested.forEach((nestedItem) => {
          const findAndRemoveFromParent = (
            shapes: CanvasItem[],
            targetId: string,
            parentId: string
          ): boolean => {
            for (const shape of shapes) {
              if (shape.id === parentId && shape.type === "container") {
                const container = shape as ContainerGroup;
                const childIndex = container.children.findIndex(
                  (child) => child.id === targetId
                );
                if (childIndex !== -1) {
                  const childToRemove = container.children[childIndex];

                  eventManager?.removeShapeEvents(childToRemove);
                  if (childToRemove.graphics && childToRemove.graphics.parent) {
                    childToRemove.graphics.parent.removeChild(
                      childToRemove.graphics
                    );
                  }

                  container.children.splice(childIndex, 1);
                  return true;
                }
              }

              if (shape.type === "container") {
                const found = findAndRemoveFromParent(
                  (shape as ContainerGroup).children,
                  targetId,
                  parentId
                );
                if (found) return true;
              }
            }
            return false;
          };

          findAndRemoveFromParent(
            updatedShapes,
            nestedItem.id,
            nestedItem.parentId!
          );
        });

        context.topLevel.forEach((topLevelItem: { id: string }) => {
          const shapeToRemove = updatedShapes.find(
            (s) => s.id === topLevelItem.id
          );
          if (shapeToRemove) {
            eventManager?.removeShapeEvents(shapeToRemove);
            if (shapeToRemove.graphics && shapeToRemove.graphics.parent) {
              shapeToRemove.graphics.parent.removeChild(shapeToRemove.graphics);
            }
          }
        });

        const topLevelIds = context.topLevel.map((item) => item.id);
        updatedShapes = updatedShapes.filter(
          (shape) => !topLevelIds.includes(shape.id)
        );
      } else {
        affectedIds.forEach((id) => {
          const shapeToRemove = updatedShapes.find((s) => s.id === id);
          if (shapeToRemove) {
            eventManager?.removeShapeEvents(shapeToRemove);
            if (shapeToRemove.graphics && shapeToRemove.graphics.parent) {
              shapeToRemove.graphics.parent.removeChild(shapeToRemove.graphics);
            }
            shapeContainer?.removeChild(shapeToRemove.graphics);
          }
        });
        updatedShapes = updatedShapes.filter(
          (shape) => !affectedIds.includes(shape.id)
        );
      }

      if (seatsBeingDeleted.length > 0) {
        seatsBeingDeleted.forEach((seatId) => {
          removeSeatFromGrid(seatId);
        });
      }
      break;

    case "MOVE":
      const moveContext = stateToApply.context;

      if (moveContext?.moveContext) {
        const { itemId, fromParentId, toParentId, originalPosition } =
          moveContext.moveContext;

        const itemToMove = findShapeRecursively(updatedShapes, itemId);
        if (!itemToMove) break;

        console.log("MOVE operation:", {
          itemId,
          fromParentId,
          toParentId,
          originalPosition,
          currentPosition: { x: itemToMove.x, y: itemToMove.y },
        });

        const currentParent = findParentContainer(itemToMove);

        if (currentParent) {
          removeFromGroup(currentParent, [itemToMove]);
        } else {
          const rootIndex = updatedShapes.findIndex(
            (shape) => shape.id === itemId
          );
          if (rootIndex !== -1) {
            updatedShapes.splice(rootIndex, 1);
          }
          if (shapeContainer && itemToMove.graphics.parent === shapeContainer) {
            shapeContainer.removeChild(itemToMove.graphics);
          }
        }

        if (toParentId) {
          const newParent = findShapeRecursively(
            updatedShapes,
            toParentId
          ) as ContainerGroup;
          if (newParent && newParent.type === "container") {
            itemToMove.x = originalPosition.x;
            itemToMove.y = originalPosition.y;
            itemToMove.graphics.position.set(
              originalPosition.x,
              originalPosition.y
            );

            addToGroup(newParent, [itemToMove]);
          }
        } else {
          itemToMove.x = originalPosition.x;
          itemToMove.y = originalPosition.y;
          itemToMove.graphics.position.set(
            originalPosition.x,
            originalPosition.y
          );

          if (shapeContainer) {
            shapeContainer.addChild(itemToMove.graphics);
          }
          updatedShapes.push(itemToMove);

          const eventManager = getEventManager();
          if (eventManager) {
            const isInContainerContext = () => selectedContainer.length > 0;
            if (!isInContainerContext()) {
              eventManager.addShapeEvents(itemToMove);
            }
          }
        }

        setShapes([...shapes]);
      }
      break;

    case "GROUP":
      console.log("group action:", action);
      const shapesToRemove = stateToApply.shapes || [];

      const removeShapeRecursively = (shape: CanvasItem) => {
        const shapeToRemove = updatedShapes.find((s) => s.id === shape.id);
        if (shapeToRemove) {
          eventManager?.removeShapeEvents(shapeToRemove);
          if (shapeToRemove.graphics && shapeToRemove.graphics.parent) {
            shapeToRemove.graphics.parent.removeChild(shapeToRemove.graphics);
          }
        }

        if (shape.type === "container" && shape.children) {
          shape.children.forEach(removeShapeRecursively);
        }
      };

      shapesToRemove.forEach(removeShapeRecursively);
      updatedShapes = updatedShapes.filter(
        (shape) =>
          !shapesToRemove.some(
            (removedShape: CanvasItem) => removedShape.id === shape.id
          )
      );
      const containerCreationData = getStateToApply(action, isUndo, "UNGROUP")
        .shapes?.[0];
      if (containerCreationData && containerCreationData.type === "container") {
        try {
          const recreatedContainer = await recreateShape(
            containerCreationData,
            true,
            isUndo && stateToApply.context?.operation === "ungroup"
          );
          shapeContainer!.addChild(recreatedContainer.graphics);
          addShape(recreatedContainer);
          updatedShapes.push(recreatedContainer);
        } catch (error) {
          console.error("Failed to recreate container:", error);
        }
      }
      break;

    case "UNGROUP":
      console.log("ungroup action:", action);
      const containerData = stateToApply.shapes?.[0];
      if (containerData && containerData.type === "container") {
        const findContainerRecursively = (
          searchShapes: CanvasItem[],
          targetId: string
        ): ContainerGroup | null => {
          for (const shape of searchShapes) {
            if (shape.id === targetId && shape.type === "container") {
              return shape as ContainerGroup;
            }
            if (shape.type === "container") {
              const found = findContainerRecursively(
                (shape as ContainerGroup).children,
                targetId
              );
              if (found) return found;
            }
          }
          return null;
        };

        const existingContainer = findContainerRecursively(
          updatedShapes,
          containerData.id
        );

        if (existingContainer) {
          console.log(
            "Found existing container to ungroup:",
            existingContainer
          );
          const ungroupedShapes = ungroupContainer(existingContainer);

          const removeContainerFromParent = (
            targetId: string,
            shapeList: CanvasItem[]
          ): CanvasItem[] => {
            return shapeList.filter((shape) => {
              if (shape.id === targetId) {
                return false;
              }
              if (shape.type === "container") {
                (shape as ContainerGroup).children = removeContainerFromParent(
                  targetId,
                  (shape as ContainerGroup).children
                );
              }
              return true;
            });
          };

          updatedShapes = removeContainerFromParent(
            existingContainer.id,
            updatedShapes
          );

          const addUngroupedShapesToParent = (
            ungroupedShapes: CanvasItem[]
          ) => {
            const parentContainer = findParentContainer(existingContainer);

            if (parentContainer) {
              parentContainer.children.push(...ungroupedShapes);
            } else {
              updatedShapes.push(...ungroupedShapes);
            }
          };

          addUngroupedShapesToParent(ungroupedShapes);
        } else {
          try {
            const recreatedContainer = await recreateShape(
              containerData,
              true,
              true
            );
            shapeContainer!.addChild(recreatedContainer.graphics);
            addShape(recreatedContainer);
            updatedShapes.push(recreatedContainer);
          } catch (error) {
            console.error("Failed to recreate container for UNGROUP:", error);
          }
        }
      }
      break;

    case "MODIFY":
    default:
      console.log("modify action:", action);
      const applyChangesToShape = (
        shapeToApply: CanvasItem,
        searchShapes: CanvasItem[]
      ): boolean => {
        for (let i = 0; i < searchShapes.length; i++) {
          const existingShape = searchShapes[i];
          if (existingShape.id === shapeToApply.id) {
            Object.assign(existingShape, shapeToApply, {
              graphics: existingShape.graphics,
              ...(existingShape.type === "container"
                ? { children: existingShape.children }
                : {}),
            });

            if (existingShape.graphics) {
              existingShape.graphics.position.set(
                existingShape.x,
                existingShape.y
              );
              existingShape.graphics.rotation = existingShape.rotation || 0;
              existingShape.graphics.scale.set(
                existingShape.scaleX || 1,
                existingShape.scaleY || 1
              );
              existingShape.graphics.alpha = existingShape.opacity || 1;
              existingShape.graphics.visible = existingShape.visible;

              switch (existingShape.type) {
                case "polygon":
                  updatePolygonGraphics(existingShape as PolygonShape);
                  break;
                case "image":
                  updateImageGraphics(existingShape as ImageShape);
                  break;
                case "svg":
                  updateSVGGraphics(existingShape as SVGShape);
                  break;
                case "container":
                  updateContainerGraphics(existingShape as ContainerGroup);
                  break;
              }
            }
            return true;
          }
          if (existingShape.type === "container") {
            const found = applyChangesToShape(
              shapeToApply,
              (existingShape as ContainerGroup).children
            );
            if (found) return true;
          }
        }
        return false;
      };

      const shapesToApply = stateToApply.shapes || [];
      shapesToApply.forEach((shapeToApply) => {
        applyChangesToShape(shapeToApply, updatedShapes);
      });
      break;
  }

  setShapes(updatedShapes);

  if (!updateHistory) {
    store.updateShapes(updatedShapes, false, undefined, false);
  } else {
    store.updateShapes(updatedShapes, false, undefined, true);
  }

  const selectionTransform = getSelectionTransform();
  if (selectionTransform) {
    selectionTransform.updateSelection([]);
  }
};

/**
 * Recreate a shape from stored data without graphics
 */
export const recreateShape = async (
  shapeData: CanvasItem,
  addShapeEvents: boolean = true,
  useRelativePositioning: boolean = false,
  addShapeEventsToParentContainer: boolean = true
): Promise<CanvasItem> => {
  let recreatedShape: CanvasItem;
  switch (shapeData.type) {
    case "rectangle": {
      const rectData = shapeData as RectangleShape;
      recreatedShape = createRectangle(
        rectData.x - rectData.width / 2,
        rectData.y - rectData.height / 2,
        rectData.width,
        rectData.height,
        addShapeEvents,
        rectData.id
      );

      recreatedShape.name = rectData.name;
      (recreatedShape as RectangleShape).cornerRadius = rectData.cornerRadius;
      (recreatedShape as RectangleShape).color = rectData.color;
      (recreatedShape as RectangleShape).strokeColor = rectData.strokeColor;
      (recreatedShape as RectangleShape).strokeWidth = rectData.strokeWidth;
      break;
    }

    case "ellipse": {
      const ellipseData = shapeData as EllipseShape | SeatShape;

      if ((ellipseData as any).rowId && (ellipseData as any).gridId) {
        recreatedShape = recreateSeat(ellipseData as SeatShape, addShapeEvents);
      } else {
        recreatedShape = createEllipse(
          ellipseData.x,
          ellipseData.y,
          ellipseData.radiusX,
          ellipseData.radiusY,
          addShapeEvents,
          ellipseData.id
        );

        recreatedShape.name = ellipseData.name;
        (recreatedShape as EllipseShape).color = ellipseData.color;
        (recreatedShape as EllipseShape).strokeColor = ellipseData.strokeColor;
        (recreatedShape as EllipseShape).strokeWidth = ellipseData.strokeWidth;
      }
      break;
    }

    case "text": {
      const textData = shapeData as TextShape;
      recreatedShape = createText(
        textData.x,
        textData.y,
        textData.text,
        addShapeEvents,
        textData.id
      );

      recreatedShape.name = textData.name;
      (recreatedShape as TextShape).fontSize = textData.fontSize;
      (recreatedShape as TextShape).fontFamily = textData.fontFamily;
      (recreatedShape as TextShape).fontWeight = textData.fontWeight;
      (recreatedShape as TextShape).textAlign = textData.textAlign;
      (recreatedShape as TextShape).color = textData.color;

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
        polygonData.cornerRadius,
        addShapeEvents,
        polygonData.id
      );

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
        svgData.name,
        addShapeEvents,
        svgData.id
      );

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
        imageData.name,
        addShapeEvents,
        imageData.id
      );

      recreatedShape.name = imageData.name;
      (recreatedShape as ImageShape).originalWidth = imageData.originalWidth;
      (recreatedShape as ImageShape).originalHeight = imageData.originalHeight;

      break;
    }

    case "container": {
      const containerData = shapeData as ContainerGroup | AreaModeContainer;

      const isAreaModeContainer =
        containerData.id === "area-mode-container-id" &&
        "grids" in containerData &&
        "defaultSeatSettings" in containerData;

      if (isAreaModeContainer) {
        const areaModeData = containerData as AreaModeContainer;

        let container = areaModeContainer;
        if (!container) {
          container = initializeAreaModeContainer();
        }

        container.name = areaModeData.name;
        container.x = areaModeData.x;
        container.y = areaModeData.y;
        container.rotation = areaModeData.rotation || 0;
        container.scaleX = areaModeData.scaleX || 1;
        container.scaleY = areaModeData.scaleY || 1;
        container.opacity = areaModeData.opacity || 1;

        container.grids = areaModeData.grids || [];
        container.defaultSeatSettings =
          areaModeData.defaultSeatSettings || container.defaultSeatSettings;

        if (container.graphics instanceof PIXI.Container) {
          container.graphics.removeChildren();
        }
        container.children = [];

        if (areaModeData.children && areaModeData.children.length > 0) {
          console.log(
            `🎨 Recreating ${areaModeData.children.length} seats for area mode container...`
          );

          for (const childData of areaModeData.children) {
            try {
              if (
                childData.type === "ellipse" &&
                (childData as any).rowId &&
                (childData as any).gridId
              ) {
                const recreatedSeat = recreateSeat(
                  childData as SeatShape,
                  addShapeEvents
                );

                container.children.push(recreatedSeat);
                if (container.graphics instanceof PIXI.Container) {
                  container.graphics.addChild(recreatedSeat.graphics);
                }
              }
            } catch (error) {
              console.error(
                `❌ Failed to recreate child in area mode container:`,
                error
              );
            }
          }
        }

        if (container.graphics) {
          container.graphics.position.set(container.x, container.y);
          container.graphics.rotation = container.rotation;
          container.graphics.scale.set(container.scaleX, container.scaleY);
          container.interactive = false;
          container.graphics.visible = true;
          container.graphics.interactiveChildren = false;
          container.graphics.interactive = false;
          container.graphics.alpha = 0.3;
        }

        recreatedShape = container;
        return recreatedShape;
      } else {
        recreatedShape = createContainer(
          [],
          containerData.name,
          addShapeEventsToParentContainer,
          containerData.id
        );

        recreatedShape.name = containerData.name;
        (recreatedShape as ContainerGroup).expanded = containerData.expanded;

        if (containerData.children && containerData.children.length > 0) {
          const recreatedChildren = await Promise.all(
            containerData.children.map((child) =>
              recreateShape(child, false, useRelativePositioning, false)
            )
          );
          (recreatedShape as ContainerGroup).children = recreatedChildren;

          recreatedChildren.forEach((child, index) => {
            if (recreatedShape.graphics instanceof PIXI.Container) {
              const originalChild = containerData.children![index];
              console.log("useRelativePositioning:", useRelativePositioning);
              if (useRelativePositioning) {
                const relativeX = originalChild.x - containerData.x;
                const relativeY = originalChild.y - containerData.y;

                child.x = relativeX;
                child.y = relativeY;
                child.graphics.position.set(relativeX, relativeY);
              } else {
                child.x = originalChild.x;
                child.y = originalChild.y;
                child.graphics.position.set(originalChild.x, originalChild.y);
              }

              recreatedShape.graphics.addChild(child.graphics);
            }
          });
        }
      }
      break;
    }

    default:
      throw new Error(`Unknown shape type: ${shapeData}`);
  }

  recreatedShape.x = shapeData.x;
  recreatedShape.y = shapeData.y;
  recreatedShape.rotation = shapeData.rotation || 0;
  recreatedShape.scaleX = shapeData.scaleX || 1;
  recreatedShape.scaleY = shapeData.scaleY || 1;
  recreatedShape.opacity = shapeData.opacity || 1;
  recreatedShape.visible = shapeData.visible;
  recreatedShape.interactive = shapeData.interactive;
  recreatedShape.selected = shapeData.selected;

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
    before.context?.operation === "move" ||
    after.context?.operation === "move"
  ) {
    return "MOVE";
  }

  if (beforeShapes.length > 1 && afterShapes.length === 1) {
    const afterShape = afterShapes[0];

    if (afterShape.type === "container" && afterShape.children) {
      const beforeIds = beforeShapes.map((s: CanvasItem) => s.id);
      const childrenIds = afterShape.children.map((c: CanvasItem) => c.id);

      if (beforeIds.every((id: string) => childrenIds.includes(id))) {
        return "GROUP";
      }
    }
  }

  if (beforeShapes.length === 1 && afterShapes.length > 1) {
    const beforeShape = beforeShapes[0];

    if (beforeShape.type === "container" && beforeShape.children) {
      const afterIds = afterShapes.map((s: CanvasItem) => s.id);
      const childrenIds = beforeShape.children.map((c: CanvasItem) => c.id);

      if (childrenIds.every((id: string) => afterIds.includes(id))) {
        return "UNGROUP";
      }
    }
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

const getStateToApply = (
  action: UndoRedoAction,
  isUndo: boolean,
  operationType: string
): {
  shapes?: CanvasItem[] | undefined;
  selectedShapes?: CanvasItem[];
  affectedIds?: string[];
  context?: ShapeContext;
} => {
  let stateToApply = action.data.before;

  switch (operationType) {
    case "CREATE":
      stateToApply = isUndo ? action.data.before : action.data.after;
      break;
    case "DELETE":
      stateToApply = isUndo ? action.data.after : action.data.before;
      break;
    case "MOVE":
      stateToApply = isUndo ? action.data.before : action.data.after;
      break;
    case "GROUP":
      stateToApply =
        action.data.before.affectedIds?.length! >
        action.data.after.affectedIds?.length!
          ? action.data.before
          : action.data.after;
      break;
    case "UNGROUP":
      stateToApply =
        action.data.before.affectedIds?.length! >
        action.data.after.affectedIds?.length!
          ? action.data.after
          : action.data.before;
      break;
    case "MODIFY":
      stateToApply = isUndo ? action.data.before : action.data.after;
      break;
  }
  return stateToApply;
};

/**
 * Perform undo operation
 */
export const performUndo = async (): Promise<boolean> => {
  const actionToUndo = useSeatMapStore.getState().undo();

  if (!actionToUndo) {
    return false;
  }

  await applyDeltaRestore(actionToUndo, true, true);
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

  await applyDeltaRestore(actionToRedo, false, true);
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
setApplyDeltaRestoreReference(applyDeltaRestore);
setRecreateShapeReference(recreateShape);

export { applyDeltaRestore };
