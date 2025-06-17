import React from "react";
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
  RectangleHorizontal,
  Redo2,
  Save,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { useCanvasStore } from "./store/main-store";

export default function MainToolbar() {
  const {
    addShape,
    deleteSelectedShapes,
    undo,
    redo,
    canUndo,
    canRedo,
    zoomIn,
    zoomOut,
    resetView,
    saveToHistory,
  } = useCanvasStore();

  const addRectangle = () => {
    addShape({
      type: "rect",
      x: 100,
      y: 100,
      width: 100,
      height: 60,
      fill: "#f0f0f0",
      stroke: "#000000",
    });
    saveToHistory();
  };

  const addCircle = () => {
    addShape({
      type: "circle",
      x: 150,
      y: 150,
      radius: 50,
      fill: "#e0e0ff",
      stroke: "#000000",
    });
    saveToHistory();
  };

  const addText = () => {
    addShape({
      type: "text",
      x: 200,
      y: 200,
      text: "Sample Text",
      fontSize: 16,
      fill: "#000000",
    });
    saveToHistory();
  };

  const addPolygon = () => {
    addShape({
      type: "polygon",
      x: 250,
      y: 250,
      points: [0, 0, 50, 0, 50, 50, 0, 50],
      fill: "#ffe0e0",
      stroke: "#000000",
      closed: true,
    });
    saveToHistory();
  };
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
        <Button variant="ghost" size="icon">
          <MousePointerClick className="w-5 h-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <RectangleHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={addRectangle}>
              <RectangleHorizontal className="w-4 h-4 mr-2" />
              Rectangle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addCircle}>
              <MousePointerClick className="w-4 h-4 mr-2" />
              Circle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addText}>
              <MousePointerClick className="w-4 h-4 mr-2" />
              Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addPolygon}>
              <MousePointerClick className="w-4 h-4 mr-2" />
              Polygon
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      <div className="text-xl font-semibold">Event Name</div>
      <div>
        <Button variant="ghost" size="icon">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
