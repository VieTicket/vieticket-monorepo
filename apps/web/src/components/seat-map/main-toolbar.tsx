import React, { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  List,
  LogOut,
  Move,
  Redo2,
  Save,
  Search,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Eye,
  Bug,
  ArrowLeft,
  MousePointer,
  Square,
  Circle,
  Type,
  Grid,
  Minus,
  Plus,
} from "lucide-react";
import {
  useCurrentTool,
  useZoom,
  useShowGrid,
  useShowHitCanvas,
  useAreaMode,
  useAreaActions,
  useCanvasActions,
} from "@/components/seat-map/store/main-store";
import { usePanZoom } from "./hooks/usePanZoom";
import { FaDrawPolygon } from "react-icons/fa";
import { HelpModal } from "./help-modal";

export type ToolType =
  | "select"
  | "rect"
  | "circle"
  | "polygon"
  | "text"
  | "seat-grid"
  | "seat-row";

const MainToolbar = React.memo(function MainToolbar() {
  const fileMenuRef = useRef<HTMLButtonElement>(null);

  const currentTool = useCurrentTool();
  const zoom = useZoom();

  const {
    setCurrentTool,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomIn,
    zoomOut,
    duplicateShapes,
    deleteSelectedShapes,
  } = useCanvasActions();

  const { centerCanvas } = usePanZoom();
  const { isInAreaMode, zoomedArea } = useAreaMode();
  const { exitAreaMode } = useAreaActions();

  const mainTools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "rect", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "polygon", icon: FaDrawPolygon, label: "Area" },
    { id: "text", icon: Type, label: "Text" },
  ];

  const areaTools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "seat-grid", icon: Grid, label: "Seat Grid" },
    { id: "seat-row", icon: Minus, label: "Seat Row" },
  ];

  const currentTools = isInAreaMode ? areaTools : mainTools;

  const handleSave = useCallback(() => {
    console.log("Save");
  }, []);

  const handleLoad = useCallback(() => {
    console.log("Load");
  }, []);

  const handleSearch = useCallback(() => {
    console.log("Search");
  }, []);

  const handleExit = useCallback(() => {
    console.log("Exit");
  }, []);

  const handleToolSelect = useCallback(
    (toolId: ToolType) => {
      setCurrentTool(toolId);
    },
    [setCurrentTool]
  );

  return (
    <div className="flex justify-between items-center bg-gray-900 text-white px-4 py-2 shadow z-10">
      <div className="flex items-center gap-2">
        {/* File Menu - FIX: Use uncontrolled dropdown */}
        {!isInAreaMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" ref={fileMenuRef}>
                <List className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLoad}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Load
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExit}>
                <LogOut className="w-4 h-4 mr-2" />
                Exit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={exitAreaMode}
            size="sm"
            variant="ghost"
            className="text-gray-300"
            title="Exit Area Mode"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="border-l mx-2 h-6" />

        {/* Tool Buttons */}
        {currentTools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={currentTool === tool.id ? "secondary" : "ghost"}
              size="icon"
              onClick={() => handleToolSelect(tool.id as ToolType)}
              title={tool.label}
            >
              <IconComponent className="w-4 h-4" />
            </Button>
          );
        })}

        <div className="border-l mx-2 h-6" />

        {/* Edit Actions */}
        <Button
          onClick={undo}
          disabled={!canUndo}
          variant="ghost"
          size="icon"
          title="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={redo}
          disabled={!canRedo}
          variant="ghost"
          size="icon"
          title="Redo"
        >
          <Redo2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={deleteSelectedShapes}
          variant="ghost"
          size="icon"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={duplicateShapes}
          variant="ghost"
          size="icon"
          title="Duplicate"
        >
          <Save className="w-5 h-5" />
        </Button>
      </div>

      {!isInAreaMode ? (
        <div className="flex items-center gap-4">
          <div className="text-xl font-semibold">Event Name</div>
        </div>
      ) : (
        <div className="text-xl font-semibold">
          Area Mode - {zoomedArea?.name || zoomedArea?.areaName || "Unnamed"}
        </div>
      )}
      <div className="flex gap-2 items-center">
        <Button onClick={zoomOut} size="sm" variant="ghost" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm font-mono min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button onClick={zoomIn} size="sm" variant="ghost" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="border-l mx-2 h-6" />

        <Button
          onClick={centerCanvas}
          size="sm"
          variant="ghost"
          title="Center Canvas"
        >
          <Move className="w-4 h-4 mr-2" />
          Center
        </Button>

        <HelpModal />
      </div>
    </div>
  );
});

export default MainToolbar;
