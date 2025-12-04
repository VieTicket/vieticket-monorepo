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
  GridShape,
  RowShape,
  SeatGridSettings,
} from "../types";
import {
  useSeatMapStore,
  UndoRedoAction,
  ShapeContext,
  setApplyDeltaRestoreReference,
  loadHistoryFromStorage,
} from "../store/seat-map-store";
import {
  shapes,
  setShapes,
  shapeContainer,
  addShape,
  selectedContainer,
  areaModeContainer,
  initializeAreaModeContainer,
  setSelectedContainer,
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
import {
  findContainerRecursively,
  findParentContainer,
  findShapeAndParentRecursively,
  findShapeInContainerRecursive,
  findShapeRecursively,
} from "../shapes";
import {
  addToGroup,
  groupItems,
  removeFromGroup,
  ungroupContainer,
} from "./grouping";
import { setRecreateShapeReference } from "../collaboration/seatmap-socket-client";
import {
  createNewGridFromSelection,
  extractToNewGrid,
  getGridById,
  recreateGridShape,
  removeSeatFromGrid,
  updateGridGraphics,
} from "../shapes/grid-shape";
import {
  createRowLabel,
  createRowShape,
  recreateRowShape,
  updateMultipleRowLabelRotations,
  updateRowGraphics,
  updateRowLabelPosition,
  updateRowLabelRotation,
  updateSeatLabelNumberingInRow,
} from "../shapes/row-shape";
import { createPixiTextStyle, recreateSeat } from "../shapes/seat-shape";

const applyDeltaRestore = async (
  action: UndoRedoAction,
  isUndo: boolean,
  updateHistory: boolean = false,
  broadcastToOthers: boolean = true
) => {
  const store = useSeatMapStore.getState();
  const currentShapes = store.shapes;
  const eventManager = getEventManager();

  let updatedShapes = [...currentShapes];

  const operationType = getOperationType(
    isUndo ? action.data.after : action.data.before,
    isUndo ? action.data.before : action.data.after
  );
  let stateToApply = getStateToApply(action, isUndo, operationType);

  const affectedIds = stateToApply.affectedIds || [];
  console.log("------------------------------");
  console.log("currentShapes:", currentShapes);
  console.log("Operation Type:", operationType, null, 2);
  console.log("Action: ", action, null, 2);
  console.log("State to Apply:", stateToApply, null, 2);

  switch (operationType) {
    case "CREATE":
      const shapesToRecreate = stateToApply.shapes || [];
      const creationContext = stateToApply.context;

      if (creationContext?.nested.length || creationContext?.topLevel.length) {
        for (const topLevelItem of creationContext.topLevel) {
          const shapeData = shapesToRecreate.find(
            (s) => s.id === topLevelItem.id
          );
          if (shapeData) {
            try {
              const recreatedShape = await recreateShape(shapeData, true);
              shapeContainer!.addChild(recreatedShape.graphics);
              addShape(recreatedShape);
              updatedShapes.push(recreatedShape);
            } catch (error) {
              console.error("Failed to recreate top-level shape:", error);
            }
          }
        }
        let affectedRows = new Set<RowShape>();
        for (const nestedItem of creationContext.nested) {
          try {
            const shapeData =
              nestedItem.parentId === "area-mode-container-id" &&
              creationContext.operation === "create-seat-grid"
                ? (shapesToRecreate[0] as ContainerGroup).children.find(
                    (s) => s.id === nestedItem.id
                  )
                : shapesToRecreate.find((s) => s.id === nestedItem.id);
            const parentContainer = findShapeRecursively(
              updatedShapes,
              nestedItem.parentId!
            ) as ContainerGroup;
            if (parentContainer && "rowName" in parentContainer) {
              affectedRows.add(parentContainer as RowShape);
            }
            if (
              shapeData &&
              parentContainer &&
              parentContainer.type === "container"
            ) {
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
            }
          } catch (error) {
            console.error("Failed to recreate nested shape:", error);
          }
        }
        if (affectedRows.size > 0) {
          affectedRows.forEach((row) => {
            updateRowLabelPosition(row);
            updateRowLabelRotation(row);
            updateSeatLabelNumberingInRow(row, "numerical");
          });
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
        if (!itemToMove) {
          break;
        }

        const eventManager = getEventManager();
        if (eventManager) {
          eventManager.removeShapeEvents(itemToMove);

          if (itemToMove.graphics) {
            itemToMove.graphics.removeAllListeners();

            itemToMove.graphics.eventMode = "static";
            itemToMove.graphics.cursor = "pointer";
          }
        }

        const currentParent = findParentContainer(itemToMove);

        if (currentParent) {
          const childIndex = currentParent.children.findIndex(
            (child) => child.id === itemId
          );
          if (childIndex !== -1) {
            currentParent.children.splice(childIndex, 1);
            currentParent.graphics.removeChild(itemToMove.graphics);
          }
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

          const isInContainerContext = () => selectedContainer.length > 0;
          if (eventManager && !isInContainerContext()) {
            itemToMove.graphics.eventMode = "static";
            itemToMove.graphics.interactive = itemToMove.interactive;
            itemToMove.graphics.cursor = "pointer";

            eventManager.addShapeEvents(itemToMove);
          }
        }
      }
      break;

    case "GRID_EXTRACT":
      if (isUndo) {
        const extractedGridData = stateToApply.shapes?.[1];
        const originalGridData = stateToApply.shapes?.[0];
        if (extractedGridData && originalGridData) {
          const extractedGrid = findShapeRecursively(
            updatedShapes,
            extractedGridData.id
          ) as GridShape;
          const originalGrid = findShapeRecursively(
            updatedShapes,
            originalGridData.id
          ) as GridShape;

          if (extractedGrid && originalGrid) {
            const seatsToMergeBack: SeatShape[] = [];

            extractedGrid.children.forEach((extractedRow) => {
              let targetRow = originalGrid.children.find(
                (row) => row.rowName === extractedRow.rowName
              );

              if (!targetRow) {
                targetRow = createRowShape(
                  originalGrid.id,
                  extractedRow.rowName,
                  extractedRow.seatSpacing
                );

                const extractedRowWorldX = extractedGrid.x + extractedRow.x;
                const extractedRowWorldY = extractedGrid.y + extractedRow.y;
                targetRow.x = extractedRowWorldX - originalGrid.x;
                targetRow.y = extractedRowWorldY - originalGrid.y;

                targetRow.rotation = extractedRow.rotation;
                targetRow.scaleX = extractedRow.scaleX;
                targetRow.scaleY = extractedRow.scaleY;
                targetRow.opacity = extractedRow.opacity;
                targetRow.visible = extractedRow.visible;
                targetRow.interactive = extractedRow.interactive;
                targetRow.expanded = extractedRow.expanded;
                targetRow.seatSpacing = extractedRow.seatSpacing;
                targetRow.labelPlacement = extractedRow.labelPlacement;

                targetRow.graphics.position.set(targetRow.x, targetRow.y);
                targetRow.graphics.rotation = targetRow.rotation;
                targetRow.graphics.scale.set(
                  targetRow.scaleX,
                  targetRow.scaleY
                );
                targetRow.graphics.alpha = targetRow.opacity;
                targetRow.graphics.visible = targetRow.visible;

                originalGrid.children.push(targetRow);
                originalGrid.graphics.addChild(targetRow.graphics);
              }

              extractedRow.children.forEach((seat) => {
                if (seat.graphics.parent) {
                  seat.graphics.parent.removeChild(seat.graphics);
                }

                const seatWorldX = extractedGrid.x + extractedRow.x + seat.x;
                const seatWorldY = extractedGrid.y + extractedRow.y + seat.y;
                const newSeatX = seatWorldX - originalGrid.x - targetRow.x;
                const newSeatY = seatWorldY - originalGrid.y - targetRow.y;

                seat.gridId = originalGrid.id;
                seat.rowId = targetRow.id;
                seat.x = newSeatX;
                seat.y = newSeatY;
                seat.graphics.position.set(seat.x, seat.y);

                targetRow.children.push(seat);
                targetRow.graphics.addChild(seat.graphics);
                seatsToMergeBack.push(seat);
              });

              if (targetRow.labelPlacement !== "none") {
                if (!targetRow.labelGraphics) {
                  targetRow.labelGraphics = createRowLabel(targetRow);
                  targetRow.graphics.addChild(targetRow.labelGraphics);
                }
                updateRowLabelPosition(targetRow);
              }
              updateSeatLabelNumberingInRow(targetRow, "numerical");
            });

            const extractedGridIndex = areaModeContainer!.children.findIndex(
              (g) => g.id === extractedGrid.id
            );
            if (extractedGridIndex !== -1) {
              areaModeContainer!.children.splice(extractedGridIndex, 1);
            }

            if (extractedGrid.graphics.parent) {
              extractedGrid.graphics.parent.removeChild(extractedGrid.graphics);
            }

            originalGrid.children.forEach((row) => {
              updateRowGraphics(row, originalGrid, false);
            });

            useSeatMapStore.getState().setSelectedShapes(seatsToMergeBack);
            const selectionTransform = getSelectionTransform();
            if (selectionTransform) {
              selectionTransform.updateSelection(seatsToMergeBack);
            }
          }
        }
        return;
      } else {
        const originalGridData = stateToApply.shapes?.[0];
        const grid = getGridById(originalGridData?.id || "");
        const gridId = action.data.after.shapes?.filter(
          (shape) => shape.id !== originalGridData?.id
        )[0]?.id;
        if (grid) {
          const seatsToExtractData =
            (stateToApply.selectedShapes?.filter(
              (shape) =>
                shape.type === "ellipse" &&
                (shape as any).rowId &&
                (shape as any).gridId
            ) as SeatShape[]) || [];

          if (seatsToExtractData.length > 0) {
            const actualSeatsToExtract: SeatShape[] = [];

            const findSeatsInGrid = (
              container: GridShape,
              seatIds: string[]
            ): SeatShape[] => {
              const foundSeats: SeatShape[] = [];

              container.children.forEach((row) => {
                row.children.forEach((seat) => {
                  if (seatIds.includes(seat.id)) {
                    foundSeats.push(seat as SeatShape);
                  }
                });
              });

              return foundSeats;
            };

            const seatIdsToExtract = seatsToExtractData.map((seat) => seat.id);

            const foundSeats = findSeatsInGrid(grid, seatIdsToExtract);
            actualSeatsToExtract.push(...foundSeats);

            if (actualSeatsToExtract.length > 0) {
              extractToNewGrid(actualSeatsToExtract, grid, gridId);
            } else {
              console.warn("No actual seats found to extract during redo");
            }
          }
        } else {
          console.warn("Grid not found for re-extraction");
        }
      }
      break;

    case "GROUP":
      const shapesToRemove =
        action.data.after.shapes?.length! > 1
          ? action.data.after.shapes || []
          : action.data.before.shapes || [];
      const items = shapesToRemove.map((shape) =>
        findShapeRecursively(updatedShapes, shape.id)
      );
      if (stateToApply.selectedShapes) {
        const parentContainer = findParentContainer(items[0] as CanvasItem);
        if (parentContainer) {
          setSelectedContainer([parentContainer]);
        }
        groupItems(items as CanvasItem[], stateToApply.selectedShapes?.[0].id);
        store.updateShapes(shapes, false, undefined, false);
        return;
      }
      break;

    case "UNGROUP":
      const containerData = stateToApply.selectedShapes?.[0];
      if (containerData && containerData.type === "container") {
        const existingContainer = findContainerRecursively(
          updatedShapes,
          containerData.id
        );

        if (existingContainer) {
          ungroupContainer(existingContainer);
          store.updateShapes(shapes, false, undefined, false);
          return;
        }
      }
      break;

    case "MODIFY":
    default:
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
                  if ("gridName" in (existingShape as GridShape)) {
                    updateGridGraphics(existingShape as GridShape);
                  } else if ("rowName" in (existingShape as RowShape)) {
                    updateRowGraphics(existingShape as RowShape);
                  } else {
                    updateContainerGraphics(existingShape as ContainerGroup);
                  }
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
  console.log(updatedShapes);
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
        const seatData = ellipseData as SeatShape;
        let currentSeatSettings: SeatGridSettings | undefined;
        if (areaModeContainer) {
          const grid = getGridById(seatData.gridId);
          if (grid) {
            currentSeatSettings = grid.seatSettings;
          }
        }
        recreatedShape = recreateSeat(
          seatData,
          true,
          false,
          currentSeatSettings
        );

        const recreatedSeat = recreatedShape as SeatShape;
        recreatedSeat.showLabel = seatData.showLabel;
        recreatedSeat.labelStyle = seatData.labelStyle;
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
      const containerData = shapeData as
        | ContainerGroup
        | AreaModeContainer
        | GridShape
        | RowShape;

      if (containerData.id === "area-mode-container-id") {
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
        container.defaultSeatSettings =
          areaModeData.defaultSeatSettings || container.defaultSeatSettings;

        if (container.graphics instanceof PIXI.Container) {
          container.graphics.removeChildren();
        }
        container.children = [];

        if (areaModeData.children && areaModeData.children.length > 0) {
          for (const gridData of areaModeData.children) {
            try {
              const recreatedGrid = await recreateGridShape(gridData);
              container.children.push(recreatedGrid);
              if (container.graphics instanceof PIXI.Container) {
                container.graphics.addChild(recreatedGrid.graphics);
              }
            } catch (error) {
              console.error(
                `Failed to recreate grid in area mode container:`,
                error
              );
            }
          }
        }

        if (container.graphics) {
          container.graphics.position.set(container.x, container.y);
          container.graphics.rotation = container.rotation;
          container.graphics.scale.set(container.scaleX, container.scaleY);
          container.graphics.visible = true;
          container.graphics.alpha = 0.3;
        }

        recreatedShape = container;
        return recreatedShape;
      } else if ((containerData as GridShape).gridName !== undefined) {
        recreatedShape = await recreateGridShape(containerData as GridShape);
      } else if ((containerData as RowShape).rowName !== undefined) {
        const rowData = containerData as RowShape;

        let currentSeatSettings: SeatGridSettings | undefined;
        if (areaModeContainer) {
          const grid = getGridById(rowData.gridId);
          if (grid) {
            currentSeatSettings = grid.seatSettings;
          }
        }

        recreatedShape = await recreateRowShape(rowData, currentSeatSettings);
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

  if (
    before.context?.operation === "move" ||
    after.context?.operation === "move"
  ) {
    return "MOVE";
  }

  if (
    before.context?.operation === "grid-extract" ||
    after.context?.operation === "grid-extract"
  ) {
    return "GRID_EXTRACT";
  }

  if (
    (beforeShapes.length === 0 && afterShapes.length > 0) ||
    (beforeShapes[0].id === "area-mode-container-id" &&
      before.context !== undefined &&
      before.context.operation === "create-seat-grid" &&
      beforeShapes[0].children.length < afterShapes[0].children.length)
  ) {
    return "CREATE";
  }

  if (
    (beforeShapes.length > 0 && afterShapes.length === 0) ||
    (beforeShapes[0].id === "area-mode-container-id" &&
      before.context !== undefined &&
      before.context.operation === "create-seat-grid" &&
      beforeShapes[0].children.length > afterShapes[0].children.length)
  ) {
    return "DELETE";
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
    case "GRID_EXTRACT":
      stateToApply = isUndo ? action.data.after : action.data.before;
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
export const handleRemoteUndoRedo = async (
  actionId: string,
  operation: "undo" | "redo",
  fromUserId: string
): Promise<boolean> => {
  const store = useSeatMapStore.getState();
  const historyStack = store.historyStack;

  const actionIndex = historyStack.findIndex(
    (action) => action.id === actionId
  );

  if (actionIndex === -1) {
    return false;
  }

  const action = historyStack[actionIndex];

  await applyDeltaRestore(action, operation === "undo", false, false);

  const newHistoryStack = [...historyStack];
  newHistoryStack.splice(actionIndex, 1);

  let newCurrentIndex = store.currentHistoryIndex;
  if (actionIndex <= newCurrentIndex) {
    newCurrentIndex = Math.max(-1, newCurrentIndex - 1);
  }

  useSeatMapStore.setState({
    historyStack: newHistoryStack,
    currentHistoryIndex: newCurrentIndex,
  });

  return true;
};

export const restoreHistoryAfterSeatMapLoad = async (
  seatMapId: string
): Promise<boolean> => {
  const store = useSeatMapStore.getState();

  try {
    // Restore history from localStorage
    const storedData = loadHistoryFromStorage(seatMapId);

    if (storedData) {
      const { historyStack, currentIndex: currentHistoryIndex } = storedData;
      if (historyStack.length > 0 && currentHistoryIndex >= 0) {
        // Get the current state by applying all actions up to currentHistoryIndex
        for (let i = 0; i <= currentHistoryIndex; i++) {
          const action = historyStack[i];
          try {
            // Apply each action to build up the current state
            await applyDeltaRestore(action, false, false, false);
          } catch (error) {
            console.error(`Failed to apply stored action ${action.id}:`, error);
            store.clearHistory();
            return false;
          }
        }
      }
      store.setHistory(historyStack, currentHistoryIndex);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to restore history after seat map load:", error);
    // Clear corrupted history
    store.clearStoredHistory();
    return false;
  }
};

export const syncHistoryWithServer = (): void => {
  const store = useSeatMapStore.getState();

  if (store.collaboration.isConnected) {
    store.syncWithServerPendingChanges();
  }
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
