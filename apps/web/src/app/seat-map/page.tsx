"use client";
import CanvasKonva from "@/components/CanvasExample";
import CanvasEditorClient from "@/components/canvas-editor-client";
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

export default function CanvasPage() {
  return (
    <div>
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
          <Button variant="ghost" size="icon">
            <RectangleHorizontal className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Undo2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Redo2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
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
      <CanvasKonva />
    </div>
  );
}
