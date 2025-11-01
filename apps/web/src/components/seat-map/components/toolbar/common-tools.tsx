import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const selectedShapes = useSeatMapStore((state) => state.selectedShapes);
  const shapes = useSeatMapStore((state) => state.shapes);
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
    if (isAreaMode && selectedShapes.length > 1) {
      alignSeats("left");
    }
  };

  const handleAlignCenter = () => {
    if (isAreaMode && selectedShapes.length > 1) {
      alignSeats("center");
    }
  };

  const handleAlignRight = () => {
    if (isAreaMode && selectedShapes.length > 1) {
      alignSeats("right");
    }
  };

  const handleOpenUploadDialog = () => {
    window.dispatchEvent(new CustomEvent("open-upload-dialog"));
  };

  const handleOpenImportDialog = () => {
    window.dispatchEvent(new CustomEvent("open-import-dialog"));
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
            <DropdownMenuItem onClick={handleOpenImportDialog}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Import Image/SVG
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

      {/* Shape Tools or Area Tools based on mode */}
      {!isAreaMode ? (
        <ShapeTools
          currentTool={selectedTool}
          onToolChange={handleToolChange}
        />
      ) : (
        <AreaTools currentTool={selectedTool} onToolChange={handleToolChange} />
      )}
      {/* Area Mode Alignment Tools */}
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
        onClick={() => deleteShapes()}
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
    </>
  );
};
