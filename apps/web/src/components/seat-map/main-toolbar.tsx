import {
  useAreaActions,
  useAreaMode,
  useCanvasActions,
  useCanvasStore,
  useCurrentTool,
  useZoom,
  useShapes,
} from "@/components/seat-map/store/main-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Circle,
  CloudUpload,
  FolderOpen,
  Grid,
  List,
  LogOut,
  Minus,
  MousePointer,
  Move,
  Paperclip,
  Redo2,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { FaDrawPolygon } from "react-icons/fa";
import { HelpModal } from "./help-modal";
import { usePanZoom } from "./hooks/usePanZoom";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";

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
  const router = useRouter();

  const currentTool = useCurrentTool();
  const zoom = useZoom();
  const shapes = useShapes();

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
    clearStorage,
  } = useCanvasActions();

  const { centerCanvas } = usePanZoom();
  const { isInAreaMode, zoomedArea } = useAreaMode();
  const {
    exitAreaMode,
    deleteSelectedRows,
    deleteSelectedSeats,
    deleteSelectedAreaItems,
  } = useAreaActions();
  const { saveToHistory } = useCanvasStore();

  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [seatMapName, setSeatMapName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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
    saveToHistory();
    alert(
      "Canvas state saved to session storage. Your work will be available if you reload the page."
    );
  }, []);

  const handleNewCanvas = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to create a new canvas? All unsaved changes will be lost."
      )
    ) {
      // Clear storage and reset state
      clearStorage();
      window.location.reload();
    }
  }, []);

  const handleLoad = useCallback(() => {
    console.log("Load");
  }, []);

  const handleExit = useCallback(() => {
    console.log("Exit");
  }, []);

  const handleUpload = useCallback(async () => {
    if (!seatMapName.trim()) {
      toast.error("Please enter a seat map name");
      return;
    }

    setIsUploading(true);
    try {
      // TODO: Replace with actual image capture logic
      // Steps for getting image URL:
      // 1. Take a snapshot of the current seat map canvas
      // 2. Request cloudinary upload URL
      // 3. Upload to cloudinary
      // 4. Get the upload key and pass down to the server action
      const imageUrl = "https://res.luxerent.shop/assets/lameass.png";

      const result = await saveSeatMapAction(shapes, seatMapName, imageUrl);
      
      if (result.success) {
        toast.success("Seat map uploaded successfully!");
        setIsUploadDialogOpen(false);
        setSeatMapName("");
        router.push("/organizer/seat-map");
      } else {
        toast.error(result.error || "Failed to upload seat map");
      }
    } catch (error) {
      console.error("Error uploading seat map:", error);
      toast.error("An unexpected error occurred while uploading");
    } finally {
      setIsUploading(false);
    }
  }, [seatMapName, shapes, router]);

  const handleToolSelect = useCallback(
    (toolId: ToolType) => {
      setCurrentTool(toolId);
    },
    [setCurrentTool]
  );

  const handleAreaDelete = useCallback(() => {
    deleteSelectedAreaItems();
  }, [deleteSelectedAreaItems]);

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
              <DropdownMenuItem onClick={handleNewCanvas}>
                <Paperclip className="w-4 h-4 mr-2" />
                Blank
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
          onClick={!isInAreaMode ? deleteSelectedShapes : handleAreaDelete}
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

        {/* Upload Button */}
        {!isInAreaMode && (
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Upload">
                <CloudUpload className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Seat Map</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="seatMapName">Seat Map Name</Label>
                  <Input
                    id="seatMapName"
                    placeholder="Enter seat map name..."
                    value={seatMapName}
                    onChange={(e) => setSeatMapName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !seatMapName.trim()}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
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
