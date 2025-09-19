import React, { useState, useRef } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CloudUpload,
  FlipHorizontal,
  FlipVertical,
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
  List,
  Circle,
  Hand,
  ImageIcon,
  Upload,
} from "lucide-react";
import { HiOutlineDuplicate } from "react-icons/hi";
import { FaDrawPolygon } from "react-icons/fa";
import { ToolbarProps, Tool } from "../types";
import { deleteShapes } from "../shapes";
import { importImageToCanvas } from "../utils/image-importer";

export function MainToolbar({
  currentTool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onClearCanvas,
  shapesCount,
}: ToolbarProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [seatMapName, setSeatMapName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "pan", icon: Hand, label: "Pan" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "ellipse", icon: Circle, label: "Ellipse" },
    { id: "polygon", icon: FaDrawPolygon, label: "Polygon" },
    { id: "text", icon: Type, label: "Text" },
  ] as const;

  const handleUpload = async () => {
    if (!seatMapName.trim()) {
      alert("Please enter a seat map name");
      return;
    }

    setIsUploading(true);
    try {
      // Simulate upload process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert(`Seat map "${seatMapName}" uploaded successfully!`);
      setIsUploadDialogOpen(false);
      setSeatMapName("");
    } catch (error) {
      alert("Failed to upload seat map");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportClick = () => {
    setIsImportDialogOpen(true);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, GIF, WebP, SVG)");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert("Please select a file to import");
      return;
    }

    setIsImporting(true);
    try {
      await importImageToCanvas(selectedFile);
      alert(`Image "${selectedFile.name}" imported successfully!`);
      setIsImportDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import image. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleNewCanvas = () => {
    if (shapesCount > 0) {
      if (
        confirm(
          "Are you sure you want to create a new canvas? All unsaved changes will be lost."
        )
      ) {
        onClearCanvas();
      }
    }
  };

  const handleExit = () => {
    if (shapesCount > 0) {
      if (
        confirm(
          "Are you sure you want to exit? All unsaved changes will be lost."
        )
      ) {
        window.location.href = "/";
      }
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex justify-between items-center bg-gray-900 text-white px-4 py-2 shadow z-10">
      <div className="flex items-center gap-2">
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <List className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setIsUploadDialogOpen(true)}>
              <CloudUpload className="w-4 h-4 mr-2" />
              Upload
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportClick}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Import Image/SVG
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

        <div className="border-l mx-2 h-6" />

        {/* Tool Buttons */}
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={currentTool === tool.id ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onToolChange(tool.id as Tool)}
              title={tool.label}
            >
              <IconComponent className="w-4 h-4" />
            </Button>
          );
        })}

        <div className="border-l mx-2 h-6" />

        {/* Edit Actions */}
        <Button variant="ghost" size="icon" title="Undo" disabled>
          <Undo2 className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Redo" disabled>
          <Redo2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => deleteShapes()}
          variant="ghost"
          size="icon"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Duplicate" disabled>
          <HiOutlineDuplicate className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Mirror Horizontally"
          disabled
        >
          <FlipHorizontal className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" title="Mirror Vertically" disabled>
          <FlipVertical className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xl font-semibold">Seat Map Editor V2 (PixiJS)</div>
      </div>

      <div className="flex gap-2 items-center">
        <Button onClick={onZoomOut} size="sm" variant="ghost" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button onClick={onZoomIn} size="sm" variant="ghost" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="border-l mx-2 h-6" />

        <Button
          onClick={onResetView}
          size="sm"
          variant="ghost"
          title="Center Canvas"
        >
          <Move className="w-4 h-4 mr-2" />
          Center
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Upload Dialog */}
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Image or SVG</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Image File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-green-600" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFileSelect}
                      disabled={isImporting}
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to select an image or SVG file
                    </p>
                    <p className="text-xs text-gray-500">
                      Supports JPEG, PNG, GIF, WebP, SVG (max 10MB)
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleFileSelect}
                      disabled={isImporting}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || !selectedFile}
              >
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
