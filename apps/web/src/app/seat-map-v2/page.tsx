"use client";

import React, { useEffect, useRef, useState } from "react";
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
  setPan,
  resetVariables,
  setSelectionContainer,
} from "@/components/seat-map-v2/variables";
import {
  createSelectionTransform,
  getSelectionTransform,
  destroySelectionTransform,
} from "@/components/seat-map-v2/events/transform-events";
import { updateStageTransform } from "@/components/seat-map-v2/utils";
import {
  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp,
  onStageWheel,
  onStageRightClick,
} from "@/components/seat-map-v2/events/index";
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
import { polygonDrawingState } from "@/components/seat-map-v2/variables";
import { updateShapeSelectionRectangle } from "@/components/seat-map-v2/shapes/index";

const SeatMapV2Page = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  console.log("SeatMapV2Page rendered");

  // Use Zustand store
  const { shapes, selectedShapes, setSelectedShapes } = useSeatMapStore();

  // Update selection rectangle when selected shapes change
  useEffect(() => {
    const selectionTransform = getSelectionTransform();
    if (selectionTransform && selectedTool === "select") {
      selectionTransform.updateSelection(selectedShapes);
    }
  }, [selectedShapes, selectedTool]);

  // Sync global tool state with React state
  useEffect(() => {
    setCurrentTool(selectedTool);
  }, [selectedTool]);

  // Initialize PixiJS Application
  useEffect(() => {
    let cancelled = false;
    console.log("Initializing PixiJS Application");

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

      // Create main stage container
      const stageContainer = new PIXI.Container();
      app.stage.addChild(stageContainer);
      setStage(stageContainer);

      // Create container for shapes
      const shapesContainer = new PIXI.Container();
      stageContainer.addChild(shapesContainer);
      setShapeContainer(shapesContainer);

      // Create container for preview shapes
      const previewShapeContainer = new PIXI.Container();
      stageContainer.addChild(previewShapeContainer);
      setPreviewContainer(previewShapeContainer);

      // Create container for selection rectangle
      const selectionRectContainer = new PIXI.Container();
      stageContainer.addChild(selectionRectContainer);
      setSelectionContainer(selectionRectContainer);

      // Create selection transform
      createSelectionTransform(selectionRectContainer);

      // Enable interactivity
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      // Add event listeners
      app.stage.on("pointerdown", onStagePointerDown);
      app.stage.on("pointermove", onStagePointerMove);
      app.stage.on("pointerup", onStagePointerUp);
      app.stage.on("wheel", onStageWheel);
      app.stage.on("rightclick", onStageRightClick);
    };

    init();

    return () => {
      cancelled = true;
      if (pixiApp) {
        destroySelectionTransform();
        pixiApp.destroy(true, { children: true, texture: true });
        resetVariables();
      }
    };
  }, []);

  // Handle keyboard events for polygon
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

  const getToolInstructions = () => {
    switch (selectedTool) {
      case "select":
        return "Click shapes to select them";
      case "rectangle":
        return "Click and drag to create rectangles";
      case "ellipse":
        return "Click and drag to create ellipses";
      case "polygon":
        return polygonDrawingState.isDrawing
          ? `Drawing polygon (${polygonDrawingState.points.length} points) - Click to add points, click near first point or right-click to finish, ESC to cancel`
          : "Click to start drawing a polygon - Click multiple points to create any shape";
      case "text":
        return "Click to place text";
      case "pan":
        return "Click and drag to pan the canvas";
      default:
        return "";
    }
  };

  const handleShapeSelect = (shapeId: string) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (shape) {
      setSelectedShapes([shape]);
    }
  };

  const handleShapePan = (shapeId: string) => {
    const shape = shapes.find((s) => s.id === shapeId);
    if (shape) {
      setPan({
        x: -shape.x + (pixiApp?.screen.width || 400) / 2,
        y: -shape.y + (pixiApp?.screen.height || 300) / 2,
      });
      updateStageTransform();
    }
  };

  const handleShapeUpdate = (id: string, updates: any) => {
    const shape = shapes.find((s) => s.id === id);
    if (shape) {
      Object.assign(shape, updates);

      // Update the graphics position if x or y changed
      if (updates.x !== undefined || updates.y !== undefined) {
        shape.graphics.x = shape.x;
        shape.graphics.y = shape.y;
      }

      // Apply transformations if they changed
      if (updates.rotation !== undefined) {
        shape.graphics.rotation = shape.rotation || 0;
      }

      if (updates.scaleX !== undefined || updates.scaleY !== undefined) {
        const scaleX = shape.scaleX || 1;
        const scaleY = shape.scaleY || scaleX;
        shape.graphics.scale.set(scaleX, scaleY);
      }

      // Update the visual appearance
      updateShapeSelectionRectangle(shape);
    }
  };

  const selectedShapeIds = selectedShapes.map((shape) => shape.id);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Toolbar */}
      <MainToolbar
        currentTool={selectedTool}
        onToolChange={setSelectedTool}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onClearCanvas={clearCanvas}
        shapesCount={shapes.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Canvas Inventory */}
        <CanvasInventory
          shapes={shapes}
          selectedShapeIds={selectedShapeIds}
          onShapeSelect={handleShapeSelect}
          onShapePan={handleShapePan}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 relative bg-gray-100">
          <div
            ref={pixiContainerRef}
            className="w-full h-full absolute inset-0"
            style={{
              cursor: selectedTool === "pan" ? "grab" : "crosshair",
            }}
          />

          {/* Canvas Info Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-sm shadow-lg">
            <div className="flex items-center space-x-4 text-gray-700">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <span>|</span>
              <span>Shapes: {shapes.length}</span>
              <span>|</span>
              <span>Tool: {selectedTool}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {getToolInstructions()}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <PropertiesSidebar
          selectedShapes={selectedShapes}
          onShapeUpdate={handleShapeUpdate}
        />
      </div>
    </div>
  );
};

export default SeatMapV2Page;
