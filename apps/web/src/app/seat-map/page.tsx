"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  areaModeContainer,
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

import { useSeatMapStore } from "@/components/seat-map/store/seat-map-store";
import {
  createGuideLines,
  destroyGuideLines,
} from "@/components/seat-map/guide-lines";
import { authClient } from "@/lib/auth/auth-client";
import {
  recreateShape,
  restoreHistoryAfterSeatMapLoad,
} from "@/components/seat-map/utils/undo-redo";
import { CanvasItem, RowShape } from "@/components/seat-map/types";
import { ValidationManager } from "@/components/seat-map/components/toolbar/validation-notification";
import { updateRowLabelRotation } from "@/components/seat-map/shapes/row-shape";
import { updateSeatLabelRotation } from "@/components/seat-map/shapes/seat-shape";

const SeatMapV2PageInner = () => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingSeatMap, setIsLoadingSeatMap] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const seatMapId = searchParams.get("seatMapId");
  const eventId = searchParams.get("eventId");
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const fetchSeatMapAndOrganizer = async (
    seatMapId: string,
    userId: string
  ) => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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
    return json;
  };

  useEffect(() => {
    if (!seatMapId) {
      router.push("/organizer");
    }
  }, [seatMapId, router]);

  const loadSeatMapData = async () => {
    if (!seatMapId || !session?.user?.id) {
      return;
    }

    setIsLoadingSeatMap(true);
    setLoadingError(null);

    try {
      useSeatMapStore.setState({ isLoading: true });

      const data = await fetchSeatMapAndOrganizer(seatMapId, session.user.id);

      if (data.status === "") {
      }

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
        eventId: eventId ? eventId : null,
        isLoading: false,
      });

      if (data.seatMap.shapes && Array.isArray(data.seatMap.shapes)) {
        try {
          const recreatedShapes: CanvasItem[] = [];

          for (const shapeData of data.seatMap.shapes) {
            try {
              const recreatedShape = await recreateShape(
                shapeData,
                true,
                false
              );

              if (shapeContainer) {
                shapeContainer.addChild(recreatedShape.graphics);
              }

              recreatedShapes.push(recreatedShape);
            } catch (error) {
              console.error("Failed to recreate shape:", shapeData.id, error);
            }
          }

          const hasAreaModeContainer = recreatedShapes.find(
            (shape: any) => shape.id === "area-mode-container-id"
          );

          if (!hasAreaModeContainer) {
            setShapes([...shapes, ...recreatedShapes]);
          } else {
            setShapes(recreatedShapes);
          }
          useSeatMapStore
            .getState()
            .updateShapes([...shapes], false, undefined, false);
        } catch (error) {
          console.error("Failed to recreate shapes:", error);
          throw new Error("Failed to recreate seat map shapes");
        }
      }

      try {
        const historyRestored = await restoreHistoryAfterSeatMapLoad(seatMapId);
      } catch (error) {
        console.warn(
          "⚠️ Failed to restore history, continuing without it:",
          error
        );
      }
      if (areaModeContainer) {
        areaModeContainer.children.forEach((grid) => {
          grid.children.forEach((row) => {
            updateRowLabelRotation(row, grid);

            row.children.forEach((seat) => {
              updateSeatLabelRotation(seat, row, grid);
            });
          });
        });
      }
      useSeatMapStore
        .getState()
        .updateShapes([...shapes], false, undefined, false);
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

  const handleResize = useCallback(() => {
    if (pixiApp && pixiContainerRef.current) {
      const container = pixiContainerRef.current;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      pixiApp.renderer.resize(newWidth, newHeight);

      updateStageHitArea();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);

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

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (pixiContainerRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

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

      if (seatMapId && session?.user?.id) {
        await loadSeatMapData();
      }
    };

    init();

    return () => {
      cancelled = true;
      if (pixiApp) {
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
  }, []);

  useEffect(() => {
    if (seatMapId && session?.user?.id && pixiApp && !isLoadingSeatMap) {
      loadSeatMapData();
    }
  }, [seatMapId, session?.user?.id, pixiApp]);

  const isLoading =
    useSeatMapStore((state) => state.isLoading) || isLoadingSeatMap;

  const renderLoadingError = (error: string) => {
    if (error.includes("403"))
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center max-w-md mx-4 p-6 bg-white rounded-lg shadow-lg border">
            <div className="text-red-600 text-5xl mb-4">🚫</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Unauthorized Access
            </h3>
            <p className="text-gray-600 mb-4">
              You do not have permission to access this seat map.
            </p>
            <div className="space-x-3">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    if (error.includes("404")) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center max-w-md mx-4 p-6 bg-white rounded-lg shadow-lg border">
            <div className="text-red-600 text-5xl mb-4">🚫</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Unauthorized Access
            </h3>
            <p className="text-gray-600 mb-4">
              You do not have permission to access this seat map.
            </p>
            <div className="space-x-3">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

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
      {loadingError && renderLoadingError(loadingError)}

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

      <ValidationManager />
    </div>
  );
};

function SeatMapV2Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading seat map...</p>
          </div>
        </div>
      }
    >
      <SeatMapV2PageInner />
    </Suspense>
  );
}

export default SeatMapV2Page;
