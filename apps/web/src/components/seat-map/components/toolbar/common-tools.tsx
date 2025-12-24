import React, { useEffect, useState } from "react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CloudUpload,
  FlipHorizontal,
  FlipVertical,
  LogOut,
  Redo2,
  Trash2,
  Undo2,
  List,
  ImageIcon,
  Paperclip,
  AlignCenterIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertTriangle,
} from "lucide-react";
import { HiOutlineDuplicate } from "react-icons/hi";
import { clearCanvas, deleteShapes } from "../../shapes";
import { duplicateSelectedShapes } from "../../utils/duplication";
import { useSeatMapStore } from "../../store/seat-map-store";
import { mirrorHorizontally, mirrorVertically } from "../../utils/mirroring";
import { performUndo, performRedo } from "../../utils/undo-redo";
import { isAreaMode, setCurrentTool, setIsAreaMode } from "../../variables";
import {
  alignSeats,
  enterAreaMode,
  exitAreaMode,
} from "../../events/area-mode-events";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useKeyMap } from "../../hooks/useKeyMap";
import { getSelectionTransform } from "../../events/transform-events";
import { Tool } from "../../types";
import { ShapeTools } from "./shape-tools";
import { AreaTools } from "./area-tools";

export const CommonTools: React.FC = () => {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<Tool>("select");
  const [showEventProtectionDialog, setShowEventProtectionDialog] =
    useState(false);
  const [protectedShapesInfo, setProtectedShapesInfo] = useState<{
    grids: number;
    rows: number;
    seats: number;
  }>({ grids: 0, rows: 0, seats: 0 });

  const selectedShapes = useSeatMapStore((state) => state.selectedShapes);
  const shapes = useSeatMapStore((state) => state.shapes);
  const eventId = useSeatMapStore((state) => state.eventId);
  const shapesCount = selectedShapes.length;
  const hasSelectedShapes = selectedShapes.length > 0;
  const canUndoAction = useSeatMapStore((state) => state.canUndo());
  const canRedoAction = useSeatMapStore((state) => state.canRedo());

  useKeyMap(setSelectedTool);

  useEffect(() => {
    setCurrentTool(selectedTool);
    const selectionTransform = getSelectionTransform();
    selectionTransform?.updateSelection([]);
  }, [selectedTool]);

  const handleToolChange = (tool: Tool) => {
    setSelectedTool(tool);
  };

  const handleNewCanvas = () => {
    if (shapes.length > 0) {
      if (
        confirm(
          "Are you sure you want to create a new canvas? All unsaved changes will be lost."
        )
      ) {
        clearCanvas();
      }
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateSelectedShapes();
    } catch (error) {
      console.error("Duplication failed:", error);
    }
  };

  const handleMirrorHorizontally = () => {
    try {
      mirrorHorizontally();
    } catch (error) {
      console.error("Failed to mirror horizontally:", error);
    }
  };

  const handleMirrorVertically = () => {
    try {
      mirrorVertically();
    } catch (error) {
      console.error("Failed to mirror vertically:", error);
    }
  };

  const handleExit = () => {
    router.push("/organizer/seat-map");
    useSeatMapStore.getState().clearStoredHistory();
  };

  const handleEnterAreaMode = () => {
    const success = enterAreaMode();

    if (success) {
      setIsAreaMode(true);
    }
  };

  const handleExitAreaMode = () => {
    exitAreaMode();
    setIsAreaMode(false);
  };

  const handleAlignLeft = () => {
    if (isAreaMode) {
      alignSeats("left");
    }
  };

  const handleAlignCenter = () => {
    if (isAreaMode) {
      alignSeats("center");
    }
  };

  const handleAlignRight = () => {
    if (isAreaMode) {
      alignSeats("right");
    }
  };

  const handleOpenUploadDialog = () => {
    window.dispatchEvent(new CustomEvent("open-upload-dialog"));
  };

  const handleOpenImportDialog = () => {
    window.dispatchEvent(new CustomEvent("open-import-dialog"));
  };

  const validateEventProtectedDeletion = (): boolean => {
    if (!eventId) {
      return true;
    }

    let gridCount = 0;
    let rowCount = 0;
    let seatCount = 0;

    selectedShapes.forEach((shape) => {
      if (shape.type === "container" && "gridName" in shape) {
        gridCount++;
      } else if (shape.type === "container" && "rowName" in shape) {
        rowCount++;
      } else if (shape.type === "ellipse" && "seatNumber" in shape) {
        seatCount++;
      }
    });

    if (gridCount > 0 || rowCount > 0 || seatCount > 0) {
      setProtectedShapesInfo({
        grids: gridCount,
        rows: rowCount,
        seats: seatCount,
      });
      setShowEventProtectionDialog(true);
      return false;
    }

    return true;
  };

  const handleDelete = () => {
    if (validateEventProtectedDeletion()) {
      deleteShapes();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <List className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!isAreaMode && (
            <DropdownMenuItem onClick={handleOpenUploadDialog}>
              <CloudUpload className="w-4 h-4 mr-2" />
              Upload
            </DropdownMenuItem>
          )}
          {!isAreaMode && (
            <DropdownMenuItem onClick={handleNewCanvas}>
              <Paperclip className="w-4 h-4 mr-2" />
              Blank
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleExit}>
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="border-l mx-2 h-6" />

      {!isAreaMode ? (
        <ShapeTools
          currentTool={selectedTool}
          onToolChange={handleToolChange}
        />
      ) : (
        <AreaTools currentTool={selectedTool} onToolChange={handleToolChange} />
      )}

      {isAreaMode && (
        <>
          <div className="border-l mx-2 h-6" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <AlignCenterIcon className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleAlignLeft}>
                <AlignLeft className="w-4 h-4 mr-2" />
                Align Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAlignCenter}>
                <AlignCenter className="w-4 h-4 mr-2" />
                Align Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAlignRight}>
                <AlignRight className="w-4 h-4 mr-2" />
                Align Right
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <div className="border-l mx-2 h-6" />

      <Button
        variant="ghost"
        size="icon"
        title="Undo (Ctrl+Z)"
        onClick={performUndo}
        disabled={!canUndoAction}
      >
        <Undo2 className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Redo (Ctrl+Y)"
        onClick={performRedo}
        disabled={!canRedoAction}
      >
        <Redo2 className="w-5 h-5" />
      </Button>

      <Button
        onClick={handleDelete}
        variant="ghost"
        size="icon"
        title="Delete"
        disabled={shapesCount === 0}
      >
        <Trash2 className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Duplicate"
        onClick={handleDuplicate}
        disabled={!hasSelectedShapes}
      >
        <HiOutlineDuplicate className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Mirror Horizontally"
        onClick={handleMirrorHorizontally}
        disabled={!hasSelectedShapes}
      >
        <FlipHorizontal className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Mirror Vertically"
        onClick={handleMirrorVertically}
        disabled={!hasSelectedShapes}
      >
        <FlipVertical className="w-5 h-5" />
      </Button>

      {!isAreaMode ? (
        <Button
          variant="ghost"
          size="sm"
          title="Enter Area Mode"
          onClick={handleEnterAreaMode}
          className="border border-white"
        >
          Area Mode
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitAreaMode}
          title="Exit Area Mode"
          className="border border-white"
        >
          Return
        </Button>
      )}

      <Dialog
        open={showEventProtectionDialog}
        onOpenChange={setShowEventProtectionDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Cannot Delete Event Seating
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p className="text-base">
                This seat map is currently linked to an event. You cannot delete
                the following seating elements:
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                {protectedShapesInfo.grids > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Seating Areas (Grids)</span>
                    <span className="text-amber-700 font-semibold">
                      {protectedShapesInfo.grids}
                    </span>
                  </div>
                )}
                {protectedShapesInfo.rows > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Rows</span>
                    <span className="text-amber-700 font-semibold">
                      {protectedShapesInfo.rows}
                    </span>
                  </div>
                )}
                {protectedShapesInfo.seats > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Seats</span>
                    <span className="text-amber-700 font-semibold">
                      {protectedShapesInfo.seats}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Alternative:</strong> Instead of deleting, you can
                  mark seats as unavailable. This preserves the seating
                  structure while preventing customers from selecting those
                  seats.
                </p>
              </div>

              <p className="text-sm text-gray-600">
                To delete these elements, you must first unlink this seat map
                from the event or create a new seat map for the event.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEventProtectionDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowEventProtectionDialog(false);

                toast.info(
                  "Use the Properties Panel to mark seats as unavailable",
                  {
                    description:
                      "Select a seat and toggle its availability in the Properties Panel",
                  }
                );
              }}
            >
              Show Me How
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
