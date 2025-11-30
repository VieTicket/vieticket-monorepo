import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { updateSeatMapAction } from "@/lib/actions/organizer/seat-map-actions";
import { useRouter } from "next/navigation";
import { useSeatMapStore } from "../../store/seat-map-store";
import { areaModeContainer, pixiApp, stage } from "../../variables";
import {
  GridShape,
  RowShape,
  SeatShape,
  AreaModeContainer,
  CanvasItem,
} from "../../types";
import {
  calculateAllContentBounds,
  calculateGroupBounds,
} from "../../utils/bounds";
import * as PIXI from "pixi.js";
import { uploadBlobToCloudinary } from "@/components/ui/file-uploader";

export const UploadDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(0);
  const router = useRouter();

  const seatMap = useSeatMapStore((state) => state.seatMap);
  const shapes = useSeatMapStore((state) => state.shapes);

  useEffect(() => {
    const handleOpenDialog = () => {
      setIsOpen(true);
    };

    window.addEventListener("open-upload-dialog", handleOpenDialog);
    return () => {
      window.removeEventListener("open-upload-dialog", handleOpenDialog);
    };
  }, []);

  // ✅ Fixed captureScreenshot function in upload-dialog.tsx
  const captureScreenshot = async (): Promise<Blob | null> => {
    if (!pixiApp || !stage || shapes.length === 0) {
      console.warn(
        "Cannot capture screenshot: Missing PIXI app, stage, or no shapes"
      );
      return null;
    }

    try {
      // ✅ Calculate bounds of ALL content including area mode container
      let allShapes: CanvasItem[] = [...shapes];

      // ✅ Add all seats, rows, and grids from area mode container
      if (areaModeContainer && areaModeContainer.children.length > 0) {
        const collectAllNestedShapes = (container: any): CanvasItem[] => {
          let collected: CanvasItem[] = [container];

          if (container.children && container.children.length > 0) {
            container.children.forEach((child: any) => {
              collected = collected.concat(collectAllNestedShapes(child));
            });
          }

          return collected;
        };

        // Get all nested shapes from area mode container
        areaModeContainer.children.forEach((grid: any) => {
          allShapes = allShapes.concat(collectAllNestedShapes(grid));
        });
      }

      if (allShapes.length === 0) {
        console.warn("No shapes to capture");
        return null;
      }

      const worldBounds = calculateAllContentBounds(shapes, areaModeContainer);

      // ✅ Add generous padding
      const padding = 50;
      const captureX = worldBounds.x - padding;
      const captureY = worldBounds.y - padding;
      const captureWidth = worldBounds.width + padding * 2;
      const captureHeight = worldBounds.height + padding * 2;

      // ✅ Ensure minimum dimensions
      const minWidth = 800;
      const minHeight = 600;
      const finalWidth = Math.max(captureWidth, minWidth);
      const finalHeight = Math.max(captureHeight, minHeight);

      // ✅ Create render texture with higher resolution
      const renderTexture = PIXI.RenderTexture.create({
        width: finalWidth,
        height: finalHeight,
        resolution: 1.5, // Good balance between quality and performance
      });

      // ✅ Store original stage transform
      const originalTransform = {
        x: stage.x,
        y: stage.y,
        scaleX: stage.scale.x,
        scaleY: stage.scale.y,
      };

      // ✅ Calculate offset to center content in capture area
      const offsetX = (finalWidth - captureWidth) / 2;
      const offsetY = (finalHeight - captureHeight) / 2;

      // ✅ Reset stage transform and position to capture everything
      stage.scale.set(1, 1);
      stage.x = -captureX + offsetX;
      stage.y = -captureY + offsetY;

      // ✅ Render to texture
      pixiApp.renderer.render({
        container: stage,
        target: renderTexture,
      });

      // ✅ Restore original stage transform
      stage.x = originalTransform.x;
      stage.y = originalTransform.y;
      stage.scale.set(originalTransform.scaleX, originalTransform.scaleY);

      // ✅ Create canvas and extract image
      const canvas = document.createElement("canvas");
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.error("Failed to get canvas context");
        renderTexture.destroy();
        return null;
      }

      // ✅ Set white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, finalWidth, finalHeight);

      // ✅ Extract pixels from render texture
      try {
        // Method 1: Try modern extract method
        const extractedCanvas = pixiApp.renderer.extract.canvas(renderTexture);
        // Normalize PIXI's extracted canvas to a CanvasImageSource (HTMLCanvasElement)
        let canvasSource: CanvasImageSource;
        if (extractedCanvas instanceof HTMLCanvasElement) {
          canvasSource = extractedCanvas;
        } else if (
          (extractedCanvas as any)?.view instanceof HTMLCanvasElement
        ) {
          // Some PIXI builds return an object with a `view` property referencing the canvas
          canvasSource = (extractedCanvas as any).view;
        } else {
          // Fallback cast for differing typings/environments
          canvasSource = extractedCanvas as unknown as HTMLCanvasElement;
        }
        ctx.drawImage(canvasSource, 0, 0);
      } catch (extractError) {
        console.warn(
          "Modern extract failed, trying alternative method:",
          extractError
        );

        // Method 2: Fallback to base64 extraction
        try {
          const base64 = await pixiApp.renderer.extract.base64(renderTexture);
          const img = new Image();

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = reject;
            img.src = base64;
          });
        } catch (base64Error) {
          console.error("Both extract methods failed:", base64Error);
          renderTexture.destroy();
          return null;
        }
      }

      // ✅ Convert to blob
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            renderTexture.destroy();
            resolve(blob);
          },
          "image/png",
          0.9
        );
      });
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      return null;
    }
  };

  // Serialization helper to remove PIXI objects
  const serializeShape = (shape: CanvasItem): any => {
    const serialized: any = {};

    for (const [key, value] of Object.entries(shape)) {
      // Skip PIXI.js specific properties
      if (
        key === "graphics" ||
        key === "container" ||
        key === "sprite" ||
        key === "texture" ||
        key === "_bounds" ||
        key === "_mask" ||
        key === "parent" ||
        key === "filters" ||
        key === "hitArea" ||
        key === "cursor" ||
        key === "seatGraphics" || // ✅ Added seat-specific graphics
        key === "labelGraphics" || // ✅ Added label graphics
        (typeof value === "object" &&
          value !== null &&
          (value.constructor?.name?.includes("PIXI") ||
            value.constructor?.name?.includes("Graphics") ||
            value.constructor?.name?.includes("Container") ||
            value.constructor?.name?.includes("Sprite") ||
            value.constructor?.name?.includes("Text"))) // ✅ Added Text
      ) {
        continue;
      }

      // Handle children recursively
      if (key === "children" && Array.isArray(value)) {
        serialized[key] = value.map((child) => serializeShape(child));
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        serialized[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? JSON.parse(JSON.stringify(item))
            : item
        );
      }
      // Handle plain objects
      else if (typeof value === "object" && value !== null) {
        if (value.constructor === Object) {
          serialized[key] = JSON.parse(JSON.stringify(value));
        } else {
          continue;
        }
      }
      // Handle primitives
      else {
        serialized[key] = value;
      }
    }

    return serialized;
  };

  // ✅ Helper function to count seats in a grid
  const countSeatsInGrid = (grid: GridShape): number => {
    return grid.children.reduce((total, row) => {
      return total + row.children.length;
    }, 0);
  };

  // ✅ Helper function to calculate revenue for a grid
  const calculateGridRevenue = (grid: GridShape): number => {
    const seatCount = countSeatsInGrid(grid);
    const seatPrice = grid.seatSettings?.price || 0;
    return seatCount * seatPrice;
  };

  // Calculate statistics using new types
  const statistics = useMemo(() => {
    if (!areaModeContainer) {
      return {
        totalGrids: 0,
        totalSeats: 0,
        totalRevenue: 0,
        gridBreakdown: [],
      };
    }

    let totalSeats = 0;
    let totalRevenue = 0;
    const gridBreakdown: Array<{
      name: string;
      seatCount: number;
      revenue: number;
    }> = [];

    // ✅ Filter and process GridShape children from AreaModeContainer
    const grids = areaModeContainer.children.filter(
      (child): child is GridShape =>
        child.type === "container" &&
        "gridName" in child &&
        "seatSettings" in child
    );

    // ✅ Process each grid that has seats
    grids
      .filter((grid) => countSeatsInGrid(grid) > 0)
      .forEach((grid) => {
        const gridSeatCount = countSeatsInGrid(grid);
        const gridRevenue = calculateGridRevenue(grid);

        totalSeats += gridSeatCount;
        totalRevenue += gridRevenue;

        gridBreakdown.push({
          name: grid.gridName || grid.name || `Grid ${grid.id.slice(0, 8)}`,
          seatCount: gridSeatCount,
          revenue: gridRevenue,
        });
      });

    return {
      totalGrids: grids.filter((grid) => countSeatsInGrid(grid) > 0).length,
      totalSeats,
      totalRevenue,
      gridBreakdown,
    };
  }, [shapes]);

  const handleUpload = async () => {
    if (!seatMap || !seatMap.id) {
      toast.error("Seat map information is missing");
      return;
    }

    if (shapes.length === 0) {
      toast.error(
        "Cannot upload empty seat map. Please add some shapes first."
      );
      return;
    }

    setIsUploading(true);
    setScreenshotProgress(0);

    try {
      toast.info("Updating seat map...", {
        description: "Capturing screenshot and uploading data...",
      });

      // ✅ Capture screenshot first
      let screenshotUrl = seatMap.image; // Keep existing image as fallback

      try {
        setScreenshotProgress(10);
        toast.info("Capturing seat map screenshot...", {
          description: "Generating preview image...",
        });

        const screenshotBlob = await captureScreenshot();

        if (screenshotBlob) {
          setScreenshotProgress(30);

          // ✅ Generate filename for screenshot
          const sanitizedName =
            seatMap.name.replace(/[^a-zA-Z0-9]/g, "_") || "seatmap";
          const timestamp = new Date().getDate().toString();
          const filename = `${sanitizedName}_screenshot_${timestamp}.png`;

          toast.info("Uploading screenshot to cloud...", {
            description: "Please wait while we process the image...",
          });

          // ✅ Upload screenshot to Cloudinary with progress tracking
          const uploadResponse = await uploadBlobToCloudinary(
            screenshotBlob,
            filename,
            "seat-maps",
            (progress) => {
              // Map upload progress to our overall progress (30% to 70%)
              const mappedProgress = 30 + progress * 0.4;
              setScreenshotProgress(mappedProgress);
            },
            true // Overwrite existing files
          );

          screenshotUrl = uploadResponse.secure_url;
          setScreenshotProgress(70);

          toast.success("Screenshot captured and uploaded!", {
            description: "Now saving seat map data...",
          });
        } else {
          console.warn(
            "Failed to capture screenshot, proceeding without updating image"
          );
          toast.warning("Screenshot capture failed, keeping existing image", {
            description: "Continuing with seat map save...",
          });
        }
      } catch (screenshotError) {
        console.error("Screenshot capture/upload failed:", screenshotError);
        toast.warning("Screenshot update failed, keeping existing image", {
          description: "Continuing with seat map save...",
        });
      }

      setScreenshotProgress(80);

      // ✅ Serialize shapes to remove PIXI.js objects
      const serializedShapes = shapes.map((shape) => serializeShape(shape));

      setScreenshotProgress(90);

      // ✅ Update seat map with new screenshot
      const result = await updateSeatMapAction(
        seatMap.id,
        serializedShapes,
        seatMap.name,
        screenshotUrl // Use the new screenshot URL
      );

      setScreenshotProgress(100);

      if (result.success) {
        toast.success("Seat map updated successfully!", {
          description: "Screenshot and data have been saved",
        });
        setIsOpen(false);
        router.push("/organizer/seat-map");
      } else {
        toast.error(result.error || "Failed to update seat map");
      }
    } catch (error) {
      console.error("Error updating seat map:", error);
      toast.error("An unexpected error occurred while updating");
    } finally {
      setIsUploading(false);
      setScreenshotProgress(0);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setIsOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Seat Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* ✅ Show screenshot progress when uploading */}
          {isUploading && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  Saving Progress
                </span>
                <span className="text-sm text-blue-600">
                  {Math.round(screenshotProgress)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${screenshotProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-700 mt-2">
                {screenshotProgress < 30
                  ? "Capturing screenshot..."
                  : screenshotProgress < 70
                    ? "Uploading image..."
                    : screenshotProgress < 95
                      ? "Saving seat map data..."
                      : "Finalizing..."}
              </p>
            </div>
          )}

          {/* Seat Map Info */}
          {seatMap && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Seat Map Information</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{seatMap.name}</span>
                </div>

                {seatMap.image && (
                  <div className="mt-2">
                    <span className="text-gray-600 text-xs block mb-2">
                      Current Preview:
                    </span>
                    <img
                      src={seatMap.image}
                      alt="Seat map preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ✨ A new screenshot will be automatically generated when
                      you save
                    </p>
                  </div>
                )}

                {!seatMap.image && (
                  <div className="mt-2 p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-green-700">
                      📸 A preview screenshot will be automatically generated
                      from your current seat map design
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ Updated Area Mode Statistics using new types */}
          {areaModeContainer && statistics.totalGrids > 0 ? (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Seat Statistics</h3>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded p-3 text-center">
                  <p className="text-xs text-gray-600">Total Grids</p>
                  <p className="text-lg font-bold text-blue-600">
                    {statistics.totalGrids}
                  </p>
                </div>
                <div className="bg-green-50 rounded p-3 text-center">
                  <p className="text-xs text-gray-600">Total Seats</p>
                  <p className="text-lg font-bold text-green-600">
                    {statistics.totalSeats}
                  </p>
                </div>
                <div className="bg-purple-50 rounded p-3 text-center">
                  <p className="text-xs text-gray-600">Total Revenue</p>
                  <p className="text-xs font-bold text-purple-600">
                    {formatCurrency(statistics.totalRevenue)}
                  </p>
                </div>
              </div>

              {/* Grid Breakdown */}
              {statistics.gridBreakdown.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2">
                    Grid Breakdown
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {statistics.gridBreakdown.map((grid, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-xs bg-gray-50 rounded p-2"
                      >
                        <span className="font-medium">{grid.name}</span>
                        <div className="flex gap-3 text-gray-600">
                          <span>{grid.seatCount} seats</span>
                          <span className="font-medium text-purple-600">
                            {formatCurrency(grid.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                ⚠️ No seat grids found. Consider adding seats in area mode
                before saving.
              </p>
            </div>
          )}

          {/* General Shape Count */}
          <div className="text-xs text-gray-500">
            {shapes.length > 0 ? (
              <p>✅ {shapes.length} total shape(s) in canvas</p>
            ) : (
              <p className="text-amber-600">⚠️ Add some shapes before saving</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                isUploading || !seatMap || !seatMap.id || shapes.length === 0
              }
            >
              {isUploading ? "Saving..." : "Save with Screenshot"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
