"use client";
import CanvasEditorClient from "@/components/seat-map/canvas-editor-client";
import EditSidebar from "@/components/seat-map/edit-sidebar";
import MainToolbar from "@/components/seat-map/main-toolbar";

export default function CanvasPage() {
  return (
    <div className="overflow-hidden w-screen">
      <MainToolbar />
      <div className="flex h-[calc(100vh-64px)]">
        <CanvasEditorClient />
        <EditSidebar />
      </div>
    </div>
  );
}
