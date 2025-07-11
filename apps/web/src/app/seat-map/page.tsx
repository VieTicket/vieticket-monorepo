"use client";
import dynamic from "next/dynamic";
import { StageProvider } from "@/components/seat-map/providers/stage-provider";
import {
  useAreaMode,
  useCanvasStore,
} from "@/components/seat-map/store/main-store";
import { useEffect, useState } from "react";

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Only attempt to load once when the component mounts
    if (!isLoaded) {
      const success = loadFromStorage();
      setIsLoaded(true);

      if (success) {
        console.log("Successfully restored canvas state from previous session");
      }
    }
  }, [loadFromStorage, isLoaded]);

  // This component doesn't render anything
  return null;
}

function PageContent() {
  const { isInAreaMode } = useAreaMode();

  return (
    <div className="overflow-hidden w-screen h-screen flex flex-col">
      {/* Add the persistence component at the top level */}
      <StatePersistence />

      <MainToolbar />
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
