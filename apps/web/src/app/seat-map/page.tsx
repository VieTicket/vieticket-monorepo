"use client";
import CanvasEditorClient from "@/components/seat-map/canvas-editor-client";
import MainToolbar from "@/components/seat-map/main-toolbar";

export default function CanvasPage() {
  return (
    <div>
      <MainToolbar />
      <CanvasEditorClient />
    </div>
  );
}
