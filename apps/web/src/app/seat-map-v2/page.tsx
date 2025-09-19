"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as PIXI from "pixi.js";

import { Tool } from "@/components/seat-map-v2/types";
import {
  pixiApp,
  zoom,
  setPixiApp,
  setStage,
  setShapeContainer,
  setPreviewContainer,
  setCurrentTool,
  resetVariables,
  setSelectionContainer,
  setPan,
} from "@/components/seat-map-v2/variables";
import {
  createSelectionTransform,
  destroySelectionTransform,
} from "@/components/seat-map-v2/events/transform-events";
import {
  createEventManager,
  destroyEventManager,
} from "@/components/seat-map-v2/events/event-manager";
import { clearCanvas } from "@/components/seat-map-v2/shapes";
import { MainToolbar } from "@/components/seat-map-v2/components/main-toolbar";
import { CanvasInventory } from "@/components/seat-map-v2/components/canvas-inventory";
import { PropertiesSidebar } from "@/components/seat-map-v2/components/properties-sidebar";
import { useSeatMapStore } from "@/components/seat-map-v2/store/seat-map-store";
import {
  handleZoomIn,
  handleZoomOut,
  handleResetView,
} from "@/components/seat-map-v2/events/zoom-events";

const SeatMapV2Page = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("select");

  const shapesCount = useSeatMapStore((state) => state.shapes.length);

  useEffect(() => {
    setCurrentTool(selectedTool);
  }, [selectedTool]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!pixiContainerRef.current || pixiApp) return;

      const app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0xf8f9fa,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (cancelled) return;

      pixiContainerRef.current.appendChild(app.canvas as HTMLCanvasElement);
      setPixiApp(app);

      const stageContainer = new PIXI.Container();
      app.stage.addChild(stageContainer);
      setStage(stageContainer);

      const shapesContainer = new PIXI.Container();
      stageContainer.addChild(shapesContainer);
      setShapeContainer(shapesContainer);

      const previewShapeContainer = new PIXI.Container();
      stageContainer.addChild(previewShapeContainer);
      setPreviewContainer(previewShapeContainer);

      const selectionRectContainer = new PIXI.Container();
      stageContainer.addChild(selectionRectContainer);
      setSelectionContainer(selectionRectContainer);

      createSelectionTransform(selectionRectContainer);

      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      createEventManager();
    };

    init();

    return () => {
      cancelled = true;
      if (pixiApp) {
        destroyEventManager();
        destroySelectionTransform();
        pixiApp.destroy(true, { children: true, texture: true });
        resetVariables();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedTool === "polygon") {
        const {
          cancelPolygonDrawing,
        } = require("@/components/seat-map-v2/events/polygon-events");
        cancelPolygonDrawing();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTool]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Toolbar - Memoized to prevent unnecessary re-renders */}
      <MainToolbar
        currentTool={selectedTool}
        onToolChange={setSelectedTool}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onClearCanvas={clearCanvas}
        shapesCount={shapesCount}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Canvas Inventory */}
        <CanvasInventory />

        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-gray-100">
          <div
            ref={pixiContainerRef}
            className="w-full h-full absolute inset-0"
            style={{
              cursor: selectedTool === "pan" ? "grab" : "crosshair",
            }}
          />
        </div>

        {/* Right Sidebar - Properties */}
        <PropertiesSidebar />
      </div>
    </div>
  );
};

export default SeatMapV2Page;
