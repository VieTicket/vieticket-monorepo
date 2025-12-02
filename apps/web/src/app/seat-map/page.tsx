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
  shapes,
  setShapes,
  shapeContainer,
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
// import ClientConnection from "@/components/seat-map/components/client-connection"; // ✅ Commented out
import { useSeatMapStore } from "@/components/seat-map/store/seat-map-store";
import {
  createGuideLines,
  destroyGuideLines,
} from "@/components/seat-map/guide-lines";
import { authClient } from "@/lib/auth/auth-client";
import { recreateShape } from "@/components/seat-map/utils/undo-redo"; // ✅ Import recreateShape
import { CanvasItem } from "@/components/seat-map/types";

const SeatMapV2Page = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingSeatMap, setIsLoadingSeatMap] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const seatMapId = searchParams.get("seatMapId");
  const { data: session } = authClient.useSession();

  // ✅ Direct API fetch function (copied from socket server)
  const fetchSeatMapAndOrganizer = async (
    seatMapId: string,
    userId: string
  ) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const url = `${base}/api/seatmap`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatMapId, userId }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to fetch seatmap from ${url}: ${res.status} ${res.statusText} ${text}`
      );
    }

    const json = await res.json();
    return json; // Expecting { seatMap, organizer } shape from the route
  };

  // ✅ Load seat map data directly without socket
  const loadSeatMapData = async () => {
    if (!seatMapId || !session?.user?.id) {
      return;
    }

    setIsLoadingSeatMap(true);
    setLoadingError(null);

    try {
      console.log("🚀 Loading seat map data directly via API...");

      // Set store loading state
      useSeatMapStore.setState({ isLoading: true });

      // Fetch seat map data
      const data = await fetchSeatMapAndOrganizer(seatMapId, session.user.id);

      if (!data.seatMap) {
        throw new Error("Seat map not found");
      }

      // ✅ Update store with seat map info
      useSeatMapStore.setState({
        seatMap: {
          id: data.seatMap.id,
          name: data.seatMap.name,
          image: data.seatMap.image,
          createdBy: data.seatMap.createdBy,
          publicity: data.seatMap.publicity,
          createdAt: data.seatMap.createdAt,
          updatedAt: data.seatMap.updatedAt,
        },
        isLoading: false,
      });

      // ✅ Recreate shapes if they exist
      if (data.seatMap.shapes && Array.isArray(data.seatMap.shapes)) {
        console.log("🔄 Recreating", data.seatMap.shapes.length, "shapes...");

        try {
          const recreatedShapes: CanvasItem[] = [];

          for (const shapeData of data.seatMap.shapes) {
            try {
              const recreatedShape = await recreateShape(
                shapeData,
                true, // addShapeEvents
                false // useRelativePositioning
              );

              if (shapeContainer) {
                shapeContainer.addChild(recreatedShape.graphics);
              }

              recreatedShapes.push(recreatedShape);
            } catch (error) {
              console.error("Failed to recreate shape:", shapeData.id, error);
            }
          }

          // ✅ Check if we have area mode container
          const hasAreaModeContainer = recreatedShapes.find(
            (shape: any) => shape.id === "area-mode-container-id"
          );

          if (!hasAreaModeContainer) {
            setShapes([...shapes, ...recreatedShapes]);
          } else {
            setShapes(recreatedShapes);
          }

          // ✅ Update store with recreated shapes
          useSeatMapStore
            .getState()
            .updateShapes([...shapes], false, undefined, false);

          console.log(
            "✅ Successfully recreated",
            recreatedShapes.length,
            "shapes"
          );
        } catch (error) {
          console.error("Failed to recreate shapes:", error);
          throw new Error("Failed to recreate seat map shapes");
        }
      }

      console.log("✅ Seat map loaded successfully");
    } catch (error) {
      console.error("Error loading seat map:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load seat map";
      setLoadingError(errorMessage);
      useSeatMapStore.setState({ isLoading: false });
    } finally {
      setIsLoadingSeatMap(false);
    }
  };

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
        showGrid: false,
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

      // ✅ Load seat map data after PIXI initialization
      if (seatMapId && session?.user?.id) {
        await loadSeatMapData();
      }
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

  // ✅ Load seat map when session and seatMapId are available
  useEffect(() => {
    if (seatMapId && session?.user?.id && pixiApp && !isLoadingSeatMap) {
      loadSeatMapData();
    }
  }, [seatMapId, session?.user?.id, pixiApp]);

  // ✅ Show loading/error states
  const isLoading =
    useSeatMapStore((state) => state.isLoading) || isLoadingSeatMap;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ✅ Commented out ClientConnection */}
      {/* <ClientConnection /> */}

      {/* ✅ Loading overlay for seat map loading */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-3 border-blue-600"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Seat Map
            </h3>
            <p className="text-gray-600">
              {isLoadingSeatMap
                ? "Fetching seat map data..."
                : "Initializing canvas..."}
            </p>
          </div>
        </div>
      )}

      {/* ✅ Error overlay */}
      {loadingError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center max-w-md mx-4 p-6 bg-white rounded-lg shadow-lg border">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Seat Map
            </h3>
            <p className="text-gray-600 mb-4">{loadingError}</p>
            <div className="space-x-3">
              <button
                onClick={loadSeatMapData}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

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
