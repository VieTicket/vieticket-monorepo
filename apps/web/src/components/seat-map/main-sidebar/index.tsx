"use client";

import React, { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { MainSidebarHeader } from "./main-sidebar-header";
import { MainSidebarTabs } from "./main-sidebar-tabs";
import { useMainSidebarLogic } from "./use-main-sidebar-logic";

const MainSidebar = React.memo(function MainSidebar() {
  const {
    selectedShapes,
    selectedShapeIds,
    singleShape,
    isPolygonSelected,
    batchValues,
    handlers,
  } = useMainSidebarLogic();

  const [activeTab, setActiveTab] = useState<
    "props" | "style" | "text" | "transform"
  >("style");

  const isSingleShape = selectedShapes.length === 1;
  const isMultipleShapes = selectedShapes.length > 1;

  // Auto-switch away from props tab if multiple shapes are selected
  useEffect(() => {
    if (isMultipleShapes && activeTab === "props") {
      setActiveTab("style");
    }
  }, [isMultipleShapes, activeTab]);

  // No shapes selected
  if (selectedShapeIds.length === 0) {
    return (
      <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full">
        <MainSidebarHeader selectedCount={0} isSingleShape={false} />
        <div className="text-center text-gray-400 py-8">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select shapes to edit properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white p-4 shadow z-10 w-72 h-full overflow-y-auto">
      <MainSidebarHeader
        selectedCount={selectedShapeIds.length}
        isSingleShape={isSingleShape}
      />

      <MainSidebarTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedShapes={selectedShapes}
        singleShape={singleShape}
        isPolygonSelected={isPolygonSelected as boolean}
        batchValues={batchValues}
        singleShapeBatchValues={handlers.getSingleShapeBatchValues()}
        handlers={handlers}
        isSingleShape={isSingleShape}
      />
    </div>
  );
});

export default MainSidebar;
