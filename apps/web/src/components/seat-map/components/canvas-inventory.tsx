import React, { useMemo, useState, useCallback } from "react";
import { Layers } from "lucide-react";
import { useSeatMapStore } from "../store/seat-map-store";
import {
  canGroup,
  getItemsInContainers,
  canGroupInSameContainer,
  groupItemsForCanvas,
  createEmptyContainer,
} from "../utils/grouping";
import { ContextMenu } from "./context-menu";
import { LayerList } from "./layer-list";
import { AreaList } from "./area-list";
import { isAreaMode } from "../variables";

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

export const CanvasInventory = React.memo(() => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });
  const shapes = useSeatMapStore((state) => state.shapes);
  const selectedShapes = useSeatMapStore((state) => state.selectedShapes);

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

  const canGroupSelectedInContainer = useMemo(() => {
    return selectedShapes.length > 1 && canGroupInSameContainer(selectedShapes);
  }, [selectedShapes]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0 });
  }, []);

  const handleCreateEmptyContainer = useCallback(() => {
    createEmptyContainer();
  }, []);

  const handleGroupItems = useCallback((items: any[]) => {
    if (canGroupInSameContainer(items)) {
      const container = groupItemsForCanvas(items);
      if (container) {
        console.log("Items grouped within container");
      }
    } else {
      console.warn(
        "Cannot group these items - they may be in different containers or insufficient count"
      );
    }
  }, []);

  const handleGroupSelected = useCallback(() => {
    if (selectedShapeIds.length > 1) {
      handleGroupItems(selectedShapes);
    }
  }, [selectedShapeIds, selectedShapes, handleGroupItems]);

  const selectedCount = selectedShapeIds.length;
  const totalCount = shapes.length;

  const canGroupSelected =
    selectedCount > 1 &&
    (canGroup(selectedShapes) || canGroupSelectedInContainer) &&
    !isAreaMode;

  return (
    <div
      className="bg-gray-900 text-white shadow z-10 w-64 flex flex-col border border-gray-700"
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center">
            <Layers className="w-4 h-4 mr-2" />
            Canvas Management
          </h2>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        <LayerList
          onGroupSelected={handleGroupSelected}
          canGroupSelected={canGroupSelected}
          selectedCount={selectedCount}
        />
        <AreaList />
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onCreateEmptyContainer={handleCreateEmptyContainer}
        />
      )}
    </div>
  );
});

CanvasInventory.displayName = "CanvasInventory";
