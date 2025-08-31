import React, { useMemo, useState, useCallback } from "react";
import {
  Layers,
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
} from "lucide-react";
import { CanvasItem, ContainerGroup } from "../types";
import { useSeatMapStore } from "../store/seat-map-store";
import { setPan, pixiApp, setPreviouslyClickedShape } from "../variables";
import { updateStageTransform } from "../utils/stageTransform";
import {
  groupItems,
  ungroupContainer,
  canGroup,
  getItemsInContainers,
} from "../utils/grouping";
import { getSelectionTransform } from "../events/transform-events";
import { findShapeInContainer } from "../shapes/index";

interface CanvasInventoryProps {}

export const CanvasInventory = React.memo(() => {
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(
    new Set()
  );

  // Get state from store with selectors to minimize re-renders
  const shapes = useSeatMapStore((state) => state.shapes);
  const selectedShapes = useSeatMapStore((state) => state.selectedShapes);
  const setSelectedShapes = useSeatMapStore((state) => state.setSelectedShapes);
  const updateShapes = useSeatMapStore((state) => state.updateShapes);
  const selectionTransform = getSelectionTransform();

  const selectedShapeIds = useMemo(
    () => selectedShapes.map((shape) => shape.id),
    [selectedShapes]
  );

  // Get root level items (items not inside any container)
  const rootItems = useMemo(() => {
    const itemsInContainers = getItemsInContainers();
    return shapes.filter((shape) => !itemsInContainers.has(shape.id));
  }, [shapes]);

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
            shape = findShapeInContainer(containerGroup, shapeId);
            if (shape) break;
          }
        }
      }
      if (!shape) return;

      if (isCtrlHeld) {
        // Toggle selection
        const isCurrentlySelected = selectedShapes.some(
          (s) => s.id === shapeId
        );
        if (isCurrentlySelected) {
          setSelectedShapes(selectedShapes.filter((s) => s.id !== shapeId));
        } else {
          setSelectedShapes([...selectedShapes, shape]);
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
            shape = findShapeInContainer(containerGroup, shapeId);
            if (shape) break;
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

      // Apply updates to the shape object
      Object.assign(shape, updates);

      // Handle graphics updates
      if (updates.visible !== undefined) {
        shape.graphics.visible = shape.visible;
      }

      // Update the store
      updateShapes([...shapes]);
    },
    [shapes, updateShapes]
  );

  const handleGroupItems = useCallback((items: CanvasItem[]) => {
    if (!canGroup(items)) {
      console.warn(
        "Cannot group these items - they may already be in containers or insufficient count"
      );
      return;
    }

    const container = groupItems(items);
    if (container) {
    }
  }, []);

  const handleUngroupItems = useCallback((container: ContainerGroup) => {
    const ungroupedItems = ungroupContainer(container);
    if (ungroupedItems.length > 0) {
    }
  }, []);

  const handleShapeClick = useCallback(
    (shapeId: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (e.ctrlKey || e.shiftKey) {
        // Multi-select or pan
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
        handleItemUpdate(itemId, { locked: !item.locked });
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
      default:
        return "#6b7280";
    }
  }, []);

  const renderLayerItem = useCallback(
    (item: CanvasItem, level: number = 0): React.ReactNode => {
      const isSelected = selectedShapeIds.includes(item.id);
      const isContainer = item.type === "container";
      const isExpanded = expandedContainers.has(item.id);
      const paddingLeft = 8 + level * 16;

      return (
        <div key={item.id} className="select-none">
          <div
            className={`flex items-center py-1.5 px-2 group ${
              isSelected
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-700 text-gray-300"
            } cursor-pointer text-xs`}
            style={{ paddingLeft: `${paddingLeft}px` }}
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
            {!isContainer && <div className="w-4" />}{" "}
            {/* Spacer for non-containers */}
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
                title={item.locked ? "Unlock" : "Lock"}
              >
                {item.locked ? (
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
      handleShapeClick,
      toggleContainer,
      toggleVisibility,
      toggleLock,
      handleUngroupItems,
      getTypeIcon,
      getShapeColor,
    ]
  );

  const handleGroupSelected = useCallback(() => {
    if (selectedShapeIds.length > 1) {
      const selectedItems = shapes.filter((shape) =>
        selectedShapeIds.includes(shape.id)
      );
      handleGroupItems(selectedItems);
    }
  }, [selectedShapeIds, shapes, handleGroupItems]);

  const selectedCount = selectedShapeIds.length;
  const totalCount = shapes.length;
  const canGroupSelected = selectedCount > 1 && canGroup(selectedShapes);

  return (
    <div className="bg-gray-900 text-white shadow z-10 w-64 flex flex-col border border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Layers
          </h2>
          <div className="text-xs text-gray-400">{totalCount} items</div>
        </div>

        {/* Group button */}
        {canGroupSelected && (
          <button
            onClick={handleGroupSelected}
            className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
          >
            Group {selectedCount} items
          </button>
        )}
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto">
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

      {/* Footer with instructions */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-400">
        <div>Click to select</div>
        <div>Ctrl+Click to multi-select</div>
        <div>Shift+Ctrl+Click to pan to item</div>
        <div>Select multiple items to group</div>
      </div>
    </div>
  );
});

CanvasInventory.displayName = "CanvasInventory";
