"use client";

import dynamic from "next/dynamic";
import { StageProvider } from "@/components/seat-map/providers/stage-provider";
import {
  useAreaMode,
  useCanvasStore,
} from "@/components/seat-map/store/main-store";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import { toast } from "sonner";

// FIX: Use dynamic imports with SSR disabled for components that use the store
const CanvasEditorClient = dynamic(
  () => import("@/components/seat-map/canvas-editor-client"),
  { ssr: false }
);

const MainToolbar = dynamic(
  () => import("@/components/seat-map/main-toolbar"),
  { ssr: false }
);

const MainSidebar = dynamic(
  () => import("@/components/seat-map/main-sidebar"),
  { ssr: false }
);

const AreaSidebar = dynamic(
  () => import("@/components/seat-map/area-sidebar"),
  { ssr: false }
);

const CanvasInventory = dynamic(
  () => import("@/components/seat-map/main-sidebar/canvas-inventory"),
  { ssr: false }
);

// Create a component to handle state persistence
function StatePersistence() {
  const loadFromStorage = useCanvasStore((state) => state.loadFromStorage);
  const clearStorage = useCanvasStore((state) => state.clearStorage);
  const loadSeatMapData = useCanvasStore((state) => state.loadSeatMapData);
  const setCurrentSeatMapId = useCanvasStore(
    (state) => state.setCurrentSeatMapId
  );
  const currentSeatMapId = useCanvasStore((state) => state.currentSeatMapId);
  const [isLoaded, setIsLoaded] = useState(false);
  const searchParams = useSearchParams();
  const seatMapId = searchParams.get("id");

  useEffect(() => {
    if (!isLoaded) {
      if (!seatMapId) {
        clearStorage();
        setCurrentSeatMapId(null);
        console.log("Creating new seat map - cleared session storage");
        setIsLoaded(true);
      } else {
        checkStoredStateAndLoad(seatMapId);
      }
    }
  }, [
    loadFromStorage,
    clearStorage,
    loadSeatMapData,
    setCurrentSeatMapId,
    isLoaded,
    seatMapId,
    currentSeatMapId,
  ]);

  const checkStoredStateAndLoad = async (id: string) => {
    try {
      // FIX: Check stored state directly from sessionStorage first
      const storedState = sessionStorage.getItem("canvas-editor-state");

      if (storedState) {
        const parsedState = JSON.parse(storedState);
        const storedSeatMapId = parsedState.currentSeatMapId;

        // If stored seatMapId matches the current one, load from storage
        if (storedSeatMapId === id) {
          console.log("Found matching seat map in session storage, loading...");
          const success = loadFromStorage();

          if (success) {
            console.log(
              "Successfully restored canvas state from previous session for same seat map"
            );
            setIsLoaded(true);
            return;
          }
        }
      }

      // If no stored state or different seat map, load from server
      console.log(
        "Loading seat map from server - different seat map or no session data"
      );
      await loadSeatMapFromServer(id);
    } catch (error) {
      console.error("Error checking stored state:", error);
      // Fallback to loading from server
      await loadSeatMapFromServer(id);
    }
  };

  const loadSeatMapFromServer = async (id: string) => {
    try {
      toast.info("Loading seat map...");

      const result = await loadSeatMapAction(id);

      if (result.success && result.data) {
        const success = loadSeatMapData(result.data);

        if (success) {
          toast.success(`Seat map "${result.data.name}" loaded successfully`);
        } else {
          toast.error("Failed to load seat map data into editor");
        }
      } else {
        toast.error(result.error || "Failed to load seat map from server");
      }
    } catch (error) {
      console.error("Error loading seat map from server:", error);
      toast.error("An unexpected error occurred while loading the seat map");
    } finally {
      setIsLoaded(true);
    }
  };

  // This component doesn't render anything
  return null;
}

function PageContent() {
  const { isInAreaMode } = useAreaMode();

  return (
    <div className="overflow-hidden w-screen h-screen flex flex-col">
      {/* Add the persistence component at the top level */}
      <Suspense>
        <StatePersistence />
      </Suspense>

      <Suspense>
        <MainToolbar />
      </Suspense>
      <div className="flex flex-1 overflow-hidden">
        <div className="bg-gray-900 text-white p-3 shadow z-10 w-64 overflow-y-auto border border-gray-700">
          <CanvasInventory />
        </div>

        <div className="flex-1 relative bg-gray-950">
          <CanvasEditorClient />
        </div>

        <div className="bg-gray-900 text-white shadow z-10 w-72 overflow-y-auto border border-gray-700">
          {isInAreaMode ? <AreaSidebar /> : <MainSidebar />}
        </div>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <StageProvider>
      <PageContent />
    </StageProvider>
  );
}
