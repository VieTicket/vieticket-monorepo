"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import * as PIXI from "pixi.js";

import {
  pixiApp,
  setPixiApp,
  setStage,
  setShapeContainer,
  setPreviewContainer,
  resetVariables,
  setSelectionContainer,
  initializeAreaModeContainer,
} from "@/components/seat-map/variables";
import {
  createSelectionTransform,
  destroySelectionTransform,
} from "@/components/seat-map/events/transform-events";
import {
  createEventManager,
  destroyEventManager,
} from "@/components/seat-map/events/event-manager";
import { MainToolbar } from "@/components/seat-map/components/main-toolbar";
import { CanvasInventory } from "@/components/seat-map/components/canvas-inventory";
import { PropertiesSidebar } from "@/components/seat-map/components/properties-sidebar";
import { updateStageHitArea } from "@/components/seat-map/utils/stageTransform";
import ClientConnection from "@/components/seat-map/components/client-connection";
import { useSeatMapStore } from "@/components/seat-map/store/seat-map-store";
import {
  createGuideLines,
  destroyGuideLines,
} from "@/components/seat-map/guide-lines";

const SeatMapV2Page = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (pixiApp && pixiContainerRef.current) {
      const container = pixiContainerRef.current;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      // Resize the PIXI application
      pixiApp.renderer.resize(newWidth, newHeight);

      // Update stage hit area to match new dimensions
      updateStageHitArea();
    }
  }, []);

  // Window resize effect
  useEffect(() => {
    window.addEventListener("resize", handleResize);

    // Also handle container resize with ResizeObserver
    let resizeObserver: ResizeObserver | null = null;

    if (pixiContainerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(pixiContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [handleResize]);

  // Prevent browser zoom on the canvas area
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      // Check if the event is coming from our canvas area
      if (pixiContainerRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Add event listeners with passive: false to ensure preventDefault works
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // ✅ PIXI initialization effect
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!pixiContainerRef.current || pixiApp) return;

      const container = pixiContainerRef.current;
      const initialWidth = container.clientWidth;
      const initialHeight = container.clientHeight;

      const app = new PIXI.Application();
      await app.init({
        width: initialWidth,
        height: initialHeight,
        backgroundColor: 0xf8f9fa,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: container,
      });

      if (cancelled) return;

      container.appendChild(app.canvas as HTMLCanvasElement);
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

      createGuideLines({
        showGrid: true,
        showSnapGuides: true,
        gridSpacing: 25,
        snapDistance: 15,
        gridColor: 0xdddddd,
        snapGuideColor: 0xff4081,
        gridAlpha: 0.4,
        snapGuideAlpha: 0.9,
      });

      initializeAreaModeContainer();

      const canvas = app.canvas;
      const preventZoom = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      canvas.addEventListener("wheel", preventZoom, { passive: false });

      (canvas as any).__preventZoomCleanup = () => {
        canvas.removeEventListener("wheel", preventZoom);
      };

      console.log("✅ PIXI application initialized successfully");
    };

    init();

    return () => {
      cancelled = true;
      if (pixiApp) {
        console.log("🧹 Cleaning up PIXI application");

        // Clean up the wheel event listener
        const canvas = pixiApp.canvas;
        if ((canvas as any).__preventZoomCleanup) {
          (canvas as any).__preventZoomCleanup();
        }

        destroyEventManager();
        destroySelectionTransform();
        destroyGuideLines();
        pixiApp.destroy(true, { children: true, texture: true });
        resetVariables();
      }
    };
  }, []); // ✅ Empty dependency array - only run once

  // ✅ Show loading state while existing seat map is being fetched
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ✅ Only show ClientConnection for existing seat maps */}
      <ClientConnection />
      <MainToolbar />

      <div className="flex-1 flex overflow-hidden">
        <CanvasInventory />

        <div className="flex-1 relative bg-gray-100">
          <div
            ref={pixiContainerRef}
            className="w-full h-full absolute inset-0"
            style={{
              touchAction: "none",
            }}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>

        <PropertiesSidebar />
      </div>
    </div>
  );
};

export default SeatMapV2Page;
