import React, { useMemo, useState, useCallback } from "react";
import {
  Square,
  Circle as CircleIcon,
  Type,
  Hexagon,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Folder,
  FolderOpen,
  Ungroup,
  ImageIcon,
} from "lucide-react";
import { CanvasItem, ContainerGroup } from "../types";
import { ShapeContext, useSeatMapStore } from "../store/seat-map-store";
import { setPan, pixiApp, setPreviouslyClickedShape } from "../variables";
import { updateStageTransform } from "../utils/stageTransform";
import {
  ungroupContainerForCanvas,
  getItemsInContainers,
  addToGroup,
  removeFromGroup,
} from "../utils/grouping";
import { getSelectionTransform } from "../events/transform-events";
import {
  findParentContainer,
  findShapeById,
  getWorldCoordinates,
  findShapeInContainerRecursive,
} from "../shapes/index";

interface DragState {
  isDragging: boolean;
  draggedItemId: string | null;
  dragOverTarget: string | null;
  dragPosition: "above" | "below" | "inside" | null;
}

interface LayerListProps {
  onGroupSelected: () => void;
  canGroupSelected: boolean;
  selectedCount: number;
}

export const LayerList = React.memo(
  ({ onGroupSelected, canGroupSelected, selectedCount }: LayerListProps) => {
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(
      new Set()
    );

    const [dragState, setDragState] = useState<DragState>({
      isDragging: false,
      draggedItemId: null,
      dragOverTarget: null,
      dragPosition: null,
    });
    const shapes = useSeatMapStore((state) => state.shapes);
    const selectedShapes = useSeatMapStore((state) => state.selectedShapes);
    const setSelectedShapes = useSeatMapStore(
      (state) => state.setSelectedShapes
    );
    const updateShapes = useSeatMapStore((state) => state.updateShapes);
    const selectionTransform = getSelectionTransform();

    const selectedShapeIds = useMemo(
      () => selectedShapes.map((shape) => shape.id),
      [selectedShapes]
    );

    const rootItems = useMemo(() => {
      const itemsInContainers = getItemsInContainers();
      return shapes.filter(
        (shape) =>
          !itemsInContainers.has(shape.id) &&
          shape.id !== "area-mode-container-id"
      );
    }, [shapes]);

    const moveItem = useCallback(
      (
        itemId: string,
        targetContainerId: string | null,
        position: "above" | "below" | "inside" | null
      ) => {
        const item = findShapeById(itemId);
        const targetContainer = targetContainerId
          ? (findShapeById(targetContainerId) as ContainerGroup)
          : null;

        if (!item) return;

        if (item.type === "container" && targetContainer) {
          const isDescendant = (
            container: ContainerGroup,
            targetId: string
          ): boolean => {
            if (container.id === targetId) return true;
            return container.children.some(
              (child) =>
                child.type === "container" &&
                isDescendant(child as ContainerGroup, targetId)
            );
          };

          if (isDescendant(item as ContainerGroup, targetContainer.id)) {
            console.warn(
              "Cannot move container into itself or its descendants"
            );
            return;
          }
        }

        const originalWorldCoords = getWorldCoordinates(item);

        // ✅ Build context to track the move operation
        const buildMoveContext = (): {
          fromParentId: string | null;
          toParentId: string | null;
          movedItemId: string;
          operation: string;
        } => {
          const currentParent = findParentContainer(item);
          const newParent =
            targetContainer && position === "inside"
              ? targetContainer
              : targetContainer
                ? findParentContainer(targetContainer)
                : null;

          return {
            fromParentId: currentParent?.id || null,
            toParentId: newParent?.id || null,
            movedItemId: item.id,
            operation: "move",
          };
        };

        const moveContext = buildMoveContext();

        const currentParent = findParentContainer(item);
        if (currentParent) {
          removeFromGroup(currentParent, [item]);
        } else {
          const rootIndex = shapes.findIndex((s) => s.id === item.id);
          if (rootIndex !== -1) {
            shapes.splice(rootIndex, 1);
          }
        }

        if (targetContainer && position === "inside") {
          addToGroup(targetContainer, [item]);

          const targetWorldCoords = getWorldCoordinates(targetContainer);
          item.x = originalWorldCoords.x - targetWorldCoords.x;
          item.y = originalWorldCoords.y - targetWorldCoords.y;

          item.graphics.position.set(item.x, item.y);

          setExpandedContainers(
            (prev) => new Set([...prev, targetContainer.id])
          );
        } else {
          const targetParent = targetContainer
            ? findParentContainer(targetContainer)
            : null;

          if (targetParent) {
            addToGroup(targetParent, [item]);
            const targetParentWorldCoords = getWorldCoordinates(targetParent);
            item.x = originalWorldCoords.x - targetParentWorldCoords.x;
            item.y = originalWorldCoords.y - targetParentWorldCoords.y;
            item.graphics.position.set(item.x, item.y);
          } else {
            shapes.push(item);
            item.x = originalWorldCoords.x;
            item.y = originalWorldCoords.y;
            item.graphics.position.set(item.x, item.y);
          }
        }

        // ✅ Build ShapeContext for the move operation
        const shapeContext: ShapeContext = {
          topLevel: [],
          nested: [],
          operation: "move",
          // ✅ Add move-specific context
          moveContext: {
            itemId: moveContext.movedItemId,
            fromParentId: moveContext.fromParentId,
            toParentId: moveContext.toParentId,
            originalPosition: originalWorldCoords,
          },
        };

        // ✅ Classify the moved item in the new hierarchy
        const newParent = findParentContainer(item);
        if (newParent) {
          shapeContext.nested.push({
            id: item.id,
            type: item.type,
            parentId: newParent.id,
          });
        } else {
          shapeContext.topLevel.push({
            id: item.id,
            type: item.type,
            parentId: null,
          });
        }

        // ✅ Save to history with proper context
        useSeatMapStore.getState()._saveToHistory(
          {
            shapes: [],
            context: {
              topLevel:
                moveContext.fromParentId === null
                  ? [
                      {
                        id: item.id,
                        type: item.type,
                        parentId: null,
                      },
                    ]
                  : [],
              nested:
                moveContext.fromParentId !== null
                  ? [
                      {
                        id: item.id,
                        type: item.type,
                        parentId: moveContext.fromParentId,
                      },
                    ]
                  : [],
              operation: "move",
              moveContext: {
                itemId: moveContext.movedItemId,
                fromParentId: moveContext.toParentId,
                toParentId: moveContext.fromParentId,
                originalPosition: originalWorldCoords,
              },
            },
          },
          {
            shapes: shapes,
            context: shapeContext,
          }
        );

        // ✅ Update the store without saving history again (already saved above)
        updateShapes([...shapes], false);
      },
      [shapes, updateShapes, findShapeById]
    );

    const handleDragStart = useCallback(
      (e: React.DragEvent, itemId: string) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", itemId);

        setDragState({
          isDragging: true,
          draggedItemId: itemId,
          dragOverTarget: null,
          dragPosition: null,
        });
      },
      []
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        if (!dragState.isDragging || dragState.draggedItemId === targetId) {
          return;
        }

        const target = findShapeById(targetId);
        const isContainer = target?.type === "container";

        const position = isContainer ? "inside" : null;

        setDragState((prev) => ({
          ...prev,
          dragOverTarget: targetId,
          dragPosition: position,
        }));
      },
      [dragState.isDragging, dragState.draggedItemId]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragState((prev) => ({
          ...prev,
          dragOverTarget: null,
          dragPosition: null,
        }));
      }
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent, targetId: string) => {
        e.preventDefault();

        const draggedId = dragState.draggedItemId;
        if (!draggedId || draggedId === targetId) {
          setDragState({
            isDragging: false,
            draggedItemId: null,
            dragOverTarget: null,
            dragPosition: null,
          });
          return;
        }

        const target = findShapeById(targetId);
        const isContainer = target?.type === "container";

        if (isContainer) {
          moveItem(draggedId, targetId, "inside");
        } else {
          const targetParent = findParentContainer(target!);
          const targetParentId = targetParent ? targetParent.id : null;
          moveItem(draggedId, targetParentId, null);
        }

        setDragState({
          isDragging: false,
          draggedItemId: null,
          dragOverTarget: null,
          dragPosition: null,
        });
      },
      [dragState, moveItem]
    );

    const handleDragEnd = useCallback(() => {
      setDragState({
        isDragging: false,
        draggedItemId: null,
        dragOverTarget: null,
        dragPosition: null,
      });
    }, []);

    const handleContainerDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();

        const draggedId = dragState.draggedItemId;
        if (!draggedId) return;

        if (e.target === e.currentTarget) {
          moveItem(draggedId, null, null);
        }

        setDragState({
          isDragging: false,
          draggedItemId: null,
          dragOverTarget: null,
          dragPosition: null,
        });
      },
      [dragState.draggedItemId, moveItem]
    );

    const handleDragOverContainer = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }, []);

    const handleShapePan = useCallback(
      (shapeId: string) => {
        const shape = shapes.find((s) => s.id === shapeId);
        if (shape) {
          setPan({
            x: -shape.x + (pixiApp?.screen.width || 400) / 2,
            y: -shape.y + (pixiApp?.screen.height || 300) / 2,
          });
          updateStageTransform();
        }
      },
      [shapes]
    );

    const handleMultiSelect = useCallback(
      (shapeId: string, isCtrlHeld: boolean) => {
        let shape = shapes.find((s) => s.id === shapeId);
        if (!shape) {
          for (const mainShape of shapes) {
            if (mainShape.type === "container") {
              const containerGroup = mainShape as ContainerGroup;
              let found = findShapeInContainerRecursive(
                containerGroup,
                shapeId
              );
              if (found) {
                shape = found.shape;
                break;
              }
            }
          }
        }
        if (!shape) return;

        if (isCtrlHeld) {
          const isCurrentlySelected = selectedShapes.some(
            (s) => s.id === shapeId
          );
          if (isCurrentlySelected) {
            setSelectedShapes(selectedShapes.filter((s) => s.id !== shapeId));

            if (selectionTransform) {
              selectionTransform.updateSelection([
                ...selectedShapes.filter((s) => s.id !== shapeId),
              ]);
            }
          } else {
            setSelectedShapes([...selectedShapes, shape]);
            if (selectionTransform) {
              selectionTransform.updateSelection([...selectedShapes, shape]);
            }
          }
        } else {
          shape.selected = true;
          updateShapes([...shapes]);

          if (selectionTransform) {
            selectionTransform.updateSelection([shape]);
          }
          setPreviouslyClickedShape(selectedShapes[0] || null);
          setSelectedShapes([shape]);
        }
      },
      [shapes, selectedShapes, setSelectedShapes]
    );

    const handleShapeSelect = useCallback(
      (shapeId: string) => {
        let shape = shapes.find((s) => s.id === shapeId);

        if (!shape) {
          for (const mainShape of shapes) {
            if (mainShape.type === "container") {
              const containerGroup = mainShape as ContainerGroup;
              let found = findShapeInContainerRecursive(
                containerGroup,
                shapeId
              );
              if (found) {
                shape = found.shape;
                break;
              }
            }
          }
        }

        if (shape) {
          shape.selected = true;
          updateShapes([...shapes]);

          if (selectionTransform) {
            selectionTransform.updateSelection([shape]);
          }
          setPreviouslyClickedShape(selectedShapes[0] || null);
          setSelectedShapes([shape]);
        }
      },
      [shapes, setSelectedShapes]
    );

    const handleItemUpdate = useCallback(
      (id: string, updates: Partial<CanvasItem>) => {
        const shape = shapes.find((s) => s.id === id);
        if (!shape) return;

        Object.assign(shape, updates);

        if (updates.visible !== undefined) {
          shape.graphics.visible = shape.visible;
        }

        updateShapes([...shapes]);
      },
      [shapes, updateShapes]
    );

    const handleUngroupItems = useCallback((container: ContainerGroup) => {
      const ungroupedItems = ungroupContainerForCanvas(container);
    }, []);

    const handleShapeClick = useCallback(
      (shapeId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (e.ctrlKey || e.shiftKey) {
          if (e.shiftKey) {
            handleShapePan(shapeId);
          } else {
            handleMultiSelect(shapeId, true);
          }
        } else {
          handleShapeSelect(shapeId);
        }
      },
      [handleShapeSelect, handleShapePan, handleMultiSelect]
    );

    const toggleContainer = useCallback(
      (containerId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedContainers((prev) => {
          const newExpanded = new Set(prev);
          if (newExpanded.has(containerId)) {
            newExpanded.delete(containerId);
          } else {
            newExpanded.add(containerId);
          }
          return newExpanded;
        });
      },
      []
    );

    const toggleVisibility = useCallback(
      (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const item = shapes.find((s) => s.id === itemId);
        if (item) {
          handleItemUpdate(itemId, { visible: !item.visible });
        }
      },
      [shapes, handleItemUpdate]
    );

    const toggleLock = useCallback(
      (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const item = shapes.find((s) => s.id === itemId);
        if (item) {
          handleItemUpdate(itemId, { interactive: !item.interactive });
        }
      },
      [shapes, handleItemUpdate]
    );

    const getTypeIcon = useCallback((type: string, isExpanded?: boolean) => {
      const iconProps = { className: "w-3 h-3" };

      switch (type) {
        case "rectangle":
          return <Square {...iconProps} />;
        case "ellipse":
          return <CircleIcon {...iconProps} />;
        case "text":
          return <Type {...iconProps} />;
        case "polygon":
          return <Hexagon {...iconProps} />;
        case "image":
          return <ImageIcon {...iconProps} />;
        case "svg":
          return <ImageIcon {...iconProps} />;
        case "container":
          return isExpanded ? (
            <FolderOpen {...iconProps} />
          ) : (
            <Folder {...iconProps} />
          );
        default:
          return <Square {...iconProps} />;
      }
    }, []);

    const getShapeColor = useCallback((shape: CanvasItem): string => {
      switch (shape.type) {
        case "rectangle":
          return `#${shape.color?.toString(16).padStart(6, "0") || "3b82f6"}`;
        case "ellipse":
          return `#${shape.color?.toString(16).padStart(6, "0") || "10b981"}`;
        case "polygon":
          return `#${shape.color?.toString(16).padStart(6, "0") || "9b59b6"}`;
        case "text":
          return `#${shape.color?.toString(16).padStart(6, "0") || "374151"}`;
        case "image":
          return "#8b5cf6";
        case "svg":
          return "#f59e0b";
        default:
          return "#6b7280";
      }
    }, []);

    const getDragIndicatorClasses = useCallback(
      (itemId: string) => {
        if (!dragState.isDragging || dragState.dragOverTarget !== itemId) {
          return "";
        }

        if (dragState.dragPosition === "inside") {
          return "bg-blue-500/20 border border-blue-500/50 rounded";
        }

        return "";
      },
      [dragState]
    );

    const renderLayerItem = useCallback(
      (item: CanvasItem, level: number = 0): React.ReactNode => {
        const isSelected = selectedShapeIds.includes(item.id);
        const isContainer = item.type === "container";
        const isExpanded = expandedContainers.has(item.id);
        const paddingLeft = 8 + level * 16;
        const isDraggedItem = dragState.draggedItemId === item.id;

        return (
          <div key={item.id} className="select-none">
            <div
              className={`flex items-center py-1.5 px-2 group ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-700 text-gray-300"
              } ${isDraggedItem ? "opacity-50" : ""} ${getDragIndicatorClasses(item.id)} cursor-pointer text-xs`}
              style={{ paddingLeft: `${paddingLeft}px` }}
              draggable={item.interactive}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleShapeClick(item.id, e)}
            >
              {/* Expand/Collapse for containers */}
              {isContainer && (
                <button
                  className="mr-1 p-0.5 hover:bg-gray-600 rounded flex-shrink-0"
                  onClick={(e) => toggleContainer(item.id, e)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              )}
              {!isContainer && <div className="w-4" />}

              {/* Type icon or color indicator */}
              <div className="mr-2 flex-shrink-0">
                {isContainer ? (
                  getTypeIcon(item.type, isExpanded)
                ) : (
                  <div className="flex items-center">
                    {getTypeIcon(item.type)}
                    <div
                      className="w-2 h-2 ml-1 rounded-sm border border-gray-600"
                      style={{ backgroundColor: getShapeColor(item) }}
                    />
                  </div>
                )}
              </div>

              {/* Item name */}
              <span className="flex-1 truncate min-w-0">
                {item.name || `${item.type} ${item.id.slice(-4)}`}
              </span>

              {/* Action buttons - show on hover */}
              <div className="flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Ungroup button for containers */}
                {isContainer && (
                  <button
                    className="mr-1 p-0.5 hover:bg-gray-600 rounded flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUngroupItems(item as ContainerGroup);
                    }}
                    title="Ungroup"
                  >
                    <Ungroup className="w-3 h-3" />
                  </button>
                )}

                {/* Visibility toggle */}
                <button
                  className="p-0.5 hover:bg-gray-600 rounded flex-shrink-0"
                  onClick={(e) => toggleVisibility(item.id, e)}
                  title={item.visible ? "Hide" : "Show"}
                >
                  {item.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                </button>

                {/* Lock toggle */}
                <button
                  className="ml-1 p-0.5 hover:bg-gray-600 rounded flex-shrink-0"
                  onClick={(e) => toggleLock(item.id, e)}
                  title={item.interactive ? "Lock" : "Unlock"}
                >
                  {item.interactive ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Render children if container is expanded */}
            {isContainer && isExpanded && (
              <div>
                {(item as ContainerGroup).children.map((child) =>
                  renderLayerItem(child, level + 1)
                )}
              </div>
            )}
          </div>
        );
      },
      [
        selectedShapeIds,
        expandedContainers,
        dragState,
        handleShapeClick,
        toggleContainer,
        toggleVisibility,
        toggleLock,
        handleUngroupItems,
        getTypeIcon,
        getShapeColor,
        getDragIndicatorClasses,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
      ]
    );

    return (
      <div
        className="flex-1 border-b border-gray-700 overflow-y-auto [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-gray-900
          [&::-webkit-scrollbar-track]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-gray-700
          [&::-webkit-scrollbar-thumb]:rounded-full
          dark:[&::-webkit-scrollbar-track]:bg-neutral-700
          dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
        onDragOver={handleDragOverContainer}
        onDrop={handleContainerDrop}
      >
        {/* Group button */}
        {canGroupSelected && (
          <div className="p-2 border-b border-gray-700">
            <button
              onClick={onGroupSelected}
              className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
            >
              Group {selectedCount} items
            </button>
          </div>
        )}

        {/* Layer list */}
        {rootItems.length > 0 ? (
          <div className="p-1">
            {rootItems.map((item) => renderLayerItem(item))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-xs">
            No layers yet
            <div className="mt-1 text-gray-600">
              Create shapes to see them here
            </div>
          </div>
        )}
      </div>
    );
  }
);

LayerList.displayName = "LayerList";
