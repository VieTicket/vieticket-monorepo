import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  HelpCircle,
  List,
  LogOut,
  MousePointerClick,
  Move,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Circle,
  Type,
} from "lucide-react";
import { useCanvasStore } from "./store/main-store";
import { usePanZoom } from "./hooks/usePanZoom";
import { FaDrawPolygon } from "react-icons/fa";
import { HelpModal } from "./help-modal";

export type ToolType = "select" | "rect" | "circle" | "text" | "polygon";

export default function MainToolbar() {
  const {
    currentTool,
    setCurrentTool,
    deleteSelectedShapes,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomIn,
    zoomOut,
    zoom,
  } = useCanvasStore();

  const { centerCanvas } = usePanZoom();

  const tools = [
    { id: "select", icon: MousePointerClick, label: "Select" },
    { id: "rect", icon: RectangleHorizontal, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "polygon", icon: FaDrawPolygon, label: "Polygon" },
  ];

  return (
    <div className="flex justify-between items-center bg-gray-900 text-white px-4 py-2 shadow z-10">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <List className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => console.log("Save")}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FolderOpen className="w-4 h-4 mr-2" />
              Load
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Search className="w-4 h-4 mr-2" />
              Search
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="w-4 h-4 mr-2" />
              Exit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="border-l mx-2 h-6" />

        {/* Tool Buttons */}
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={currentTool === tool.id ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setCurrentTool(tool.id as ToolType)}
              title={tool.label}
            >
              <IconComponent className="w-5 h-5" />
            </Button>
          );
        })}

        <div className="border-l mx-2 h-6" />

        <Button onClick={undo} disabled={!canUndo} variant="ghost" size="icon">
          <Undo2 className="w-5 h-5" />
        </Button>
        <Button onClick={redo} disabled={!canRedo} variant="ghost" size="icon">
          <Redo2 className="w-5 h-5" />
        </Button>
        <Button onClick={deleteSelectedShapes} variant="ghost" size="icon">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xl font-semibold">Event Name</div>

        {/* Current Tool Indicator */}
        <div className="px-3 py-1 bg-gray-700 rounded-md text-sm">
          Mode: {tools.find((t) => t.id === currentTool)?.label}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Button onClick={zoomOut} size="sm" variant="ghost">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm font-mono min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button onClick={zoomIn} size="sm" variant="ghost">
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="border-l mx-2 h-6" />

        <Button onClick={centerCanvas} size="sm" variant="ghost">
          <Move className="w-4 h-4 mr-2" />
          Center
        </Button>

        <HelpModal />
      </div>
    </div>
  );
}
