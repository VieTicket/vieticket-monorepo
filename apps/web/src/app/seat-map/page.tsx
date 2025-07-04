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

function PageContent() {
  const { isInAreaMode } = useAreaMode();

  return (
    <div className="overflow-hidden w-screen">
      <MainToolbar />
      <div className="flex h-[calc(100vh-64px)]">
        <CanvasEditorClient />
        {/* FIX: Conditionally render sidebar based on mode */}
        {isInAreaMode ? <AreaSidebar /> : <MainSidebar />}
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
