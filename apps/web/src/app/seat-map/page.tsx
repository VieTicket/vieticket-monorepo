"use client";
import CanvasEditorClient from "@/components/seat-map/canvas-editor-client";
import EditSidebar from "@/components/seat-map/edit-sidebar";
import MainToolbar from "@/components/seat-map/main-toolbar";
import { StageProvider } from "@/components/seat-map/providers/stage-provider";

export default function CanvasPage() {
  return (
    <StageProvider>
      <div className="overflow-hidden w-screen">
        <MainToolbar />
        <div className="flex h-[calc(100vh-64px)]">
          <CanvasEditorClient />
          <EditSidebar />
        </div>
      </div>
    </StageProvider>
  );
}
