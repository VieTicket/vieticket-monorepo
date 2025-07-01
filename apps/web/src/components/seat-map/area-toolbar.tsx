// Create: area-toolbar.tsx
import React from "react";
import { Button } from "../ui/button";
import { ArrowLeft, Plus, Settings, Users } from "lucide-react";
import { useCanvasStore } from "@/components/seat-map/store/main-store";

interface AreaToolbarProps {
  onExitArea: () => void;
  areaName?: string;
}

export type AreaToolType = "row" | "select";

export default function AreaToolbar({
  onExitArea,
  areaName,
}: AreaToolbarProps) {
  const { currentTool, setCurrentTool } = useCanvasStore();

  const areaTools = [
    { id: "select", icon: Users, label: "Select" },
    { id: "row", icon: Plus, label: "Add Row" },
  ];

  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur border rounded-lg px-3 py-2">
      {/* Exit Area Mode */}
      <Button
        onClick={onExitArea}
        size="sm"
        variant="ghost"
        className="text-gray-700 hover:text-gray-900"
        title="Exit Area Mode"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Main
      </Button>

      <div className="border-l mx-2 h-6" />

      {/* Area Name */}
      <span className="text-sm font-medium text-gray-700">
        Area: {areaName || "Unnamed"}
      </span>

      <div className="border-l mx-2 h-6" />

      {/* Area Tools */}
      {areaTools.map((tool) => (
        <Button
          key={tool.id}
          onClick={() => setCurrentTool(tool.id as any)}
          size="sm"
          variant={currentTool === tool.id ? "default" : "ghost"}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
        </Button>
      ))}

      <div className="border-l mx-2 h-6" />

      {/* Settings */}
      <Button size="sm" variant="ghost" title="Area Settings">
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  );
}
