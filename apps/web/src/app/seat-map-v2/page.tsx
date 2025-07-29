"use client";

import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Square,
  Circle,
  Type,
  Move,
  Hand,
} from "lucide-react";

interface PixiShape {
  id: string;
  type: "rectangle" | "circle" | "text" | "polygon";
  graphics: PIXI.Graphics | PIXI.Text;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: number;
  selected: boolean;
}

type Tool = "select" | "rectangle" | "circle" | "text" | "polygon" | "pan";

// Global state for performance (outside React)
let pixiApp: PIXI.Application | null = null;
let stage: PIXI.Container | null = null;
let shapeContainer: PIXI.Container | null = null;
let shapes: PixiShape[] = [];
let currentTool: Tool = "select";
let isDrawing = false;
let dragStart: { x: number; y: number } | null = null;
let zoom = 1;
let pan = { x: 0, y: 0 };

// Utility functions
const generateShapeId = () =>
  `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const updateStageTransform = () => {
  if (stage) {
    stage.scale.set(zoom);
    stage.position.set(pan.x, pan.y);
  }
};

const createRectangle = (
  x: number,
  y: number,
  width: number,
  height: number
): PixiShape => {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(0x3b82f6);
  graphics.lineStyle(2, 0x1e40af);
  graphics.drawRect(0, 0, width, height);
  graphics.endFill();
  graphics.x = x;
  graphics.y = y;
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "rectangle",
    graphics,
    x,
    y,
    width,
    height,
    color: 0x3b82f6,
    selected: false,
  };

  graphics.on("pointerdown", (event) => onShapeClick(event, shape));
  return shape;
};

const createCircle = (x: number, y: number, radius: number): PixiShape => {
  const graphics = new PIXI.Graphics();

  // Apply proper stroke
  graphics.stroke({
    width: 2,
    color: 0x047857,
  });

  // Create gradient with numeric color stops
  const radialGradient = new PIXI.FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.5 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.5,
    colorStops: [
      { offset: 0, color: 0xffff00 },
      { offset: 1, color: 0x00ff00 },
    ],
    textureSpace: "local",
  });

  // Fill then draw
  graphics.circle(radius / 2, radius / 2, radius).fill(radialGradient);

  graphics.x = x;
  graphics.y = y;
  graphics.eventMode = "static";
  graphics.cursor = "pointer";

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "circle",
    graphics,
    x,
    y,
    radius,
    color: 0x10b981,
    selected: false,
  };

  graphics.on("pointerdown", (event: PIXI.FederatedPointerEvent) =>
    onShapeClick(event, shape)
  );
  return shape;
};

const createText = (x: number, y: number, text: string): PixiShape => {
  const textGraphics = new PIXI.Text(text, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0x374151,
    align: "center",
  });
  textGraphics.x = x;
  textGraphics.y = y;
  textGraphics.eventMode = "static";
  textGraphics.cursor = "pointer";

  const shape: PixiShape = {
    id: generateShapeId(),
    type: "text",
    graphics: textGraphics,
    x,
    y,
    color: 0x374151,
    selected: false,
  };

  textGraphics.on("pointerdown", (event) => onShapeClick(event, shape));
  return shape;
};

const addShapeToStage = (shape: PixiShape) => {
  if (shapeContainer) {
    shapeContainer.addChild(shape.graphics);
    shapes.push(shape);
  }
};

const updateShapeSelection = (shapeId: string, selected: boolean) => {
  shapes.forEach((shape) => {
    if (shape.id === shapeId) {
      shape.selected = selected;
      // Update visual selection
      if (shape.graphics instanceof PIXI.Graphics) {
        shape.graphics.clear();
        if (shape.type === "rectangle" && shape.width && shape.height) {
          shape.graphics.beginFill(shape.color);
          shape.graphics.lineStyle(
            selected ? 3 : 2,
            selected ? 0xfbbf24 : 0x1e40af
          );
          shape.graphics.drawRect(0, 0, shape.width, shape.height);
        } else if (shape.type === "circle" && shape.radius) {
          shape.graphics.beginFill(shape.color);
          shape.graphics.lineStyle(
            selected ? 3 : 2,
            selected ? 0xfbbf24 : 0x047857
          );
          shape.graphics.drawCircle(0, 0, shape.radius);
        }
        shape.graphics.endFill();
      }
    } else {
      shape.selected = false; // Deselect others
    }
  });
};

// Event handlers (outside React component)
const onStagePointerDown = (event: PIXI.FederatedPointerEvent) => {
  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  dragStart = { x: localPoint.x, y: localPoint.y };
  isDrawing = true;

  if (currentTool === "text") {
    const shape = createText(localPoint.x, localPoint.y, "Sample Text");
    addShapeToStage(shape);
  }
};

const onStagePointerMove = (event: PIXI.FederatedPointerEvent) => {
  if (!isDrawing || !dragStart) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  if (currentTool === "pan") {
    const deltaX = localPoint.x - dragStart.x;
    const deltaY = localPoint.y - dragStart.y;
    pan.x += deltaX * zoom;
    pan.y += deltaY * zoom;
    updateStageTransform();
  }
};

const onStagePointerUp = (event: PIXI.FederatedPointerEvent) => {
  if (!isDrawing || !dragStart) return;

  const globalPoint = event.global;
  const localPoint = stage?.toLocal(globalPoint);
  if (!localPoint) return;

  if (currentTool === "rectangle") {
    const width = Math.abs(localPoint.x - dragStart.x);
    const height = Math.abs(localPoint.y - dragStart.y);
    if (width > 10 && height > 10) {
      const x = Math.min(dragStart.x, localPoint.x);
      const y = Math.min(dragStart.y, localPoint.y);
      const shape = createRectangle(x, y, width, height);
      addShapeToStage(shape);
    }
  } else if (currentTool === "circle") {
    const radius =
      Math.sqrt(
        Math.pow(localPoint.x - dragStart.x, 2) +
          Math.pow(localPoint.y - dragStart.y, 2)
      ) / 2;
    if (radius > 10) {
      const shape = createCircle(dragStart.x, dragStart.y, radius);
      addShapeToStage(shape);
    }
  }

  isDrawing = false;
  dragStart = null;
};

const onStageWheel = (event: PIXI.FederatedWheelEvent) => {
  event.preventDefault();
  const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
  zoom = Math.max(0.1, Math.min(5, zoom * scaleFactor));
  updateStageTransform();
};

const onShapeClick = (event: PIXI.FederatedPointerEvent, shape: PixiShape) => {
  event.stopPropagation();
  if (currentTool === "select") {
    updateShapeSelection(shape.id, true);
  }
};

const clearCanvas = () => {
  shapes.forEach((shape) => {
    if (shapeContainer) {
      shapeContainer.removeChild(shape.graphics);
      shape.graphics.destroy();
    }
  });
  shapes = [];
};

const SeatMapV2Page = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("select");

  // Sync global tool state with React state
  useEffect(() => {
    currentTool = selectedTool;
  }, [selectedTool]);

  // Initialize PixiJS Application
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!pixiContainerRef.current || pixiApp) return;

      const app = new PIXI.Application();
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0xf8f9fa,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (cancelled) return;

      pixiContainerRef.current.appendChild(app.canvas as HTMLCanvasElement);
      pixiApp = app;

      // Create main stage container
      const stageContainer = new PIXI.Container();
      app.stage.addChild(stageContainer);
      stage = stageContainer;

      // Create container for shapes
      const shapesContainer = new PIXI.Container();
      stageContainer.addChild(shapesContainer);
      shapeContainer = shapesContainer;

      // Enable interactivity
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      // Add event listeners
      app.stage.on("pointerdown", onStagePointerDown);
      app.stage.on("pointermove", onStagePointerMove);
      app.stage.on("pointerup", onStagePointerUp);
      app.stage.on("wheel", onStageWheel);
    };

    init();

    return () => {
      cancelled = true;
      if (pixiApp) {
        pixiApp.destroy(true, { children: true, texture: true });
        pixiApp = null;
        stage = null;
        shapeContainer = null;
        shapes = [];
      }
    };
  }, []);
  console.log("SeatMapV2Page rendered");

  const handleZoomIn = () => {
    zoom = Math.min(5, zoom * 1.2);
    updateStageTransform();
  };

  const handleZoomOut = () => {
    zoom = Math.max(0.1, zoom / 1.2);
    updateStageTransform();
  };

  const handleResetView = () => {
    zoom = 1;
    pan = { x: 0, y: 0 };
    updateStageTransform();
  };

  const tools = [
    { id: "select", icon: Move, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ] as const;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Seat Map Editor V2 (PixiJS - Optimized)
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Zoom: {Math.round(zoom * 100)}% | Shapes: {shapes.length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Toolbar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Button
                    key={tool.id}
                    variant={selectedTool === tool.id ? "default" : "outline"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSelectedTool(tool.id as Tool)}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {tool.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">View Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleZoomIn}
              >
                <ZoomIn className="w-4 h-4 mr-2" />
                Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleZoomOut}
              >
                <ZoomOut className="w-4 h-4 mr-2" />
                Zoom Out
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleResetView}
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Reset View
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={clearCanvas}
              >
                Clear Canvas
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Renderer: PixiJS WebGL</div>
                <div>FPS: ~60fps</div>
                <div>Memory: Optimized</div>
                <div>React State: Minimal</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-100 p-2 border-b border-gray-200">
            <div className="text-sm text-gray-600">
              Active Tool:{" "}
              <span className="font-medium capitalize">{selectedTool}</span>
              {selectedTool === "select" && " - Click shapes to select them"}
              {selectedTool === "rectangle" &&
                " - Click and drag to create rectangles"}
              {selectedTool === "circle" &&
                " - Click and drag to create circles"}
              {selectedTool === "text" && " - Click to place text"}
              {selectedTool === "pan" && " - Click and drag to pan the canvas"}
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-gray-100 p-4">
            <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
              <div
                ref={pixiContainerRef}
                className="w-full h-full"
                style={{
                  cursor: selectedTool === "pan" ? "grab" : "crosshair",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatMapV2Page;
