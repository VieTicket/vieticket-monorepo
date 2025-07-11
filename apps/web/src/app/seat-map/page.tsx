"use client";
import dynamic from "next/dynamic";
import { StageProvider } from "@/components/seat-map/providers/stage-provider";
import { useAreaMode } from "@/components/seat-map/store/main-store";

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

function PageContent() {
  const { isInAreaMode } = useAreaMode();

  return (
    <div className="overflow-hidden w-screen h-screen flex flex-col">
      <MainToolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Canvas inventory */}
        {!isInAreaMode && (
          <div className="bg-gray-900 text-white p-3 shadow z-10 w-64 overflow-y-auto border border-gray-700">
            <CanvasInventory />
          </div>
        )}

        {/* Main canvas area */}
        <div className="flex-1 relative bg-gray-950">
          <CanvasEditorClient />
        </div>

        {/* Right sidebar - Properties editor */}
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
