import {
  useAreaActions,
  useAreaMode,
  useCanvasActions,
  useCanvasStore,
  useCurrentTool,
  useZoom,
  useShapes,
  useSelectedShapeIds,
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
  FlipHorizontal,
  FlipVertical,
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
  ZoomOut,
} from "lucide-react";
import { HiOutlineDuplicate } from "react-icons/hi";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaDrawPolygon } from "react-icons/fa";
import { HelpModal } from "./help-modal";
import { usePanZoom } from "./hooks/usePanZoom";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  saveSeatMapAction,
  updateSeatMapAction,
} from "@/lib/actions/organizer/seat-map-actions";
import { useStageRef } from "./providers/stage-provider";
import { uploadBlobToCloudinary } from "@/components/ui/file-uploader";
import { captureSeatMapImageOptimized } from "./utils/seat-map-image-capture";

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
  const searchParams = useSearchParams();
  const seatMapId = searchParams.get("id");
  const isEditingExisting = !!seatMapId;

  const stageRef = useStageRef();

  const currentTool = useCurrentTool();
  const zoom = useZoom();
  const shapes = useShapes();
  const selectedShapeIds = useSelectedShapeIds();

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
    setCurrentSeatMapId,
    mirrorHorizontally,
    mirrorVertically,
  } = useCanvasActions();

  const { centerCanvas } = usePanZoom();
  const { isInAreaMode, zoomedArea } = useAreaMode();
  const { exitAreaMode, deleteSelectedAreaItems } = useAreaActions();

  // Upload dialog state - only for new seat maps
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [seatMapName, setSeatMapName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Save state - for existing seat maps
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = useCallback(async () => {
    if (!isEditingExisting) {
      return; // This shouldn't happen, but just in case
    }

    if (!stageRef?.current) {
      toast.error("Canvas not ready for saving");
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Capture the current seat map as an image
      toast.info("Capturing updated seat map image...");
      const imageBlob = await captureSeatMapImageOptimized(
        stageRef.current,
        shapes
      );

      // Step 2: Upload new image to Cloudinary (this will override the old one with same public_id)
      const filename = `seatmap_${seatMapId}_preview.png`;

      toast.info("Uploading updated image...");
      const uploadResponse = await uploadBlobToCloudinary(
        imageBlob,
        filename,
        "seat-maps",
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      );

      // Step 3: Update seat map with new image URL and shapes
      toast.info("Saving seat map...");
      const result = await updateSeatMapAction(
        seatMapId!,
        shapes,
        undefined, // Don't change the name
        uploadResponse.secure_url // Update with new image URL
      );

      if (result.success) {
        toast.success("Seat map saved successfully with updated preview!");
      } else {
        toast.error(result.error || "Failed to save seat map");
      }
    } catch (error) {
      console.error("Error saving seat map:", error);
      toast.error("An unexpected error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  }, [seatMapId, shapes, stageRef, isEditingExisting]);

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

  // FIX: Set the current seat map ID when component mounts
  useEffect(() => {
    if (seatMapId) {
      setCurrentSeatMapId(seatMapId);
    } else {
      setCurrentSeatMapId(null);
    }
  }, [seatMapId, setCurrentSeatMapId]);

  const handleExit = useCallback(() => {
    clearStorage();
    router.push("/organizer/seat-map");
  }, [clearStorage, router]);

  const handleUpload = useCallback(async () => {
    if (!seatMapName.trim()) {
      toast.error("Please enter a seat map name");
      return;
    }

    if (!stageRef?.current) {
      toast.error("Canvas not ready for capture");
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Capture the seat map as an optimized image
      toast.info("Capturing seat map image...");
      const imageBlob = await captureSeatMapImageOptimized(
        stageRef.current,
        shapes
      );

      // Step 2: Upload blob directly to Cloudinary (more efficient)
      const filename = `${seatMapName.replace(/[^a-zA-Z0-9]/g, "_")}_preview.png`;

      toast.info("Uploading image to cloud storage...");
      const uploadResponse = await uploadBlobToCloudinary(
        imageBlob,
        filename,
        "seat-maps",
        (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      );

      // Step 3: Save seat map with the uploaded image URL
      toast.info("Saving seat map...");
      const result = await saveSeatMapAction(
        shapes,
        seatMapName,
        uploadResponse.secure_url
      );

      if (result.success) {
        clearStorage();
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
  }, [seatMapName, shapes, router, stageRef, clearStorage]);

  const handleToolSelect = useCallback(
    (toolId: ToolType) => {
      setCurrentTool(toolId);
    },
    [setCurrentTool]
  );

  const handleAreaDelete = useCallback(() => {
    deleteSelectedAreaItems();
  }, [deleteSelectedAreaItems]);

  const handleMirrorHorizontally = useCallback(() => {
    mirrorHorizontally();
  }, [mirrorHorizontally]);

  const handleMirrorVertically = useCallback(() => {
    mirrorVertically();
  }, [mirrorVertically]);

  return (
    <div className="flex justify-between items-center bg-gray-900 text-white px-4 py-2 shadow z-10">
      <div className="flex items-center gap-2">
        {/* File Menu */}
        {!isInAreaMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" ref={fileMenuRef}>
                <List className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {isEditingExisting ? (
                <DropdownMenuItem onClick={handleSave} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setIsUploadDialogOpen(true)}>
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Upload
                </DropdownMenuItem>
              )}
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
          <HiOutlineDuplicate className="w-5 h-5" />
        </Button>

        {/* NEW: Mirror Buttons */}
        {!isInAreaMode && (
          <>
            <Button
              onClick={handleMirrorHorizontally}
              variant="ghost"
              size="icon"
              title="Mirror Horizontally"
              disabled={!selectedShapeIds.length}
            >
              <FlipHorizontal className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleMirrorVertically}
              variant="ghost"
              size="icon"
              title="Mirror Vertically"
              disabled={!selectedShapeIds.length}
            >
              <FlipVertical className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {!isInAreaMode ? (
        <div className="flex items-center gap-4">
          <div className="text-xl font-semibold">
            {isEditingExisting ? "Edit Seat Map" : "Create New Seat Map"}
          </div>
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

      {/* Upload Dialog - Only for new seat maps */}
      {!isEditingExisting && (
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload New Seat Map</DialogTitle>
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
  );
});

export default MainToolbar;
