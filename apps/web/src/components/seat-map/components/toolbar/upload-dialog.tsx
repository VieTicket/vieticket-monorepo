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
      // ✅ Calculate bounds using PIXI's built-in bounds calculation
      const getActualBounds = (): PIXI.Rectangle => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        // Helper function to get bounds of a graphics object
        const addGraphicsBounds = (
          graphics: PIXI.Graphics | PIXI.Container
        ) => {
          if (!graphics || !graphics.getBounds) return;

          const bounds = graphics.getBounds();
          if (bounds.width > 0 && bounds.height > 0) {
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
          }
        };

        // ✅ Process all shapes in the main shapes array
        shapes.forEach((shape) => {
          if (shape.graphics) {
            addGraphicsBounds(shape.graphics);
          }
        });

        // ✅ Process area mode container and all its nested children
        if (areaModeContainer && areaModeContainer.children) {
          const processContainerRecursively = (container: any) => {
            // Add the container itself
            if (container.graphics) {
              addGraphicsBounds(container.graphics);
            }

            // Process all children recursively
            if (container.children && Array.isArray(container.children)) {
              container.children.forEach((child: any) => {
                // Add child graphics
                if (child.graphics) {
                  addGraphicsBounds(child.graphics);
                }

                // Add seat graphics specifically for seats
                if (child.seatGraphics) {
                  addGraphicsBounds(child.seatGraphics);
                }

                // Add label graphics for seats
                if (child.labelGraphics) {
                  addGraphicsBounds(child.labelGraphics);
                }

                // Recursively process nested children
                processContainerRecursively(child);
              });
            }
          };

          areaModeContainer.children.forEach((grid: any) => {
            processContainerRecursively(grid);
          });
        }

        // ✅ Fallback to stage bounds if no content bounds found
        if (minX === Infinity || minY === Infinity) {
          console.warn("No content bounds found, using stage bounds");
          const stageBounds = stage!.getBounds();
          return new PIXI.Rectangle(
            stageBounds.x,
            stageBounds.y,
            stageBounds.width,
            stageBounds.height
          );
        }

        return new PIXI.Rectangle(minX, minY, maxX - minX, maxY - minY);
      };

      const contentBounds = getActualBounds();
      console.log("Content bounds:", contentBounds);

      // ✅ Validate bounds
      if (contentBounds.width <= 0 || contentBounds.height <= 0) {
        console.warn("Invalid content bounds, using default");
        return null;
      }

      // ✅ Add generous padding
      const padding = 100; // Increased padding for better results
      const captureX = contentBounds.x - padding;
      const captureY = contentBounds.y - padding;
      const captureWidth = contentBounds.width + padding * 2;
      const captureHeight = contentBounds.height + padding * 2;

      // ✅ Ensure reasonable dimensions
      const minWidth = 800;
      const minHeight = 600;
      const maxWidth = 4000;
      const maxHeight = 4000;

      const finalWidth = Math.min(Math.max(captureWidth, minWidth), maxWidth);
      const finalHeight = Math.min(
        Math.max(captureHeight, minHeight),
        maxHeight
      );

      console.log(`Capture dimensions: ${finalWidth}x${finalHeight}`);

      // ✅ Create render texture with appropriate resolution
      const resolution = Math.min(
        1.5, // Max resolution
        Math.min(maxWidth / finalWidth, maxHeight / finalHeight) // Scale down if too large
      );

      const renderTexture = PIXI.RenderTexture.create({
        width: finalWidth,
        height: finalHeight,
        resolution: resolution,
      });

      // ✅ Store original stage transform
      const originalTransform = {
        x: stage.x,
        y: stage.y,
        scaleX: stage.scale.x,
        scaleY: stage.scale.y,
      };

      // ✅ Calculate center offset for better composition
      const offsetX = (finalWidth - captureWidth) / 2;
      const offsetY = (finalHeight - captureHeight) / 2;

      try {
        // ✅ Temporarily adjust stage for capture
        stage.scale.set(1, 1);
        stage.x = -captureX + offsetX;
        stage.y = -captureY + offsetY;

        // ✅ Ensure all graphics are visible before rendering
        stage.alpha = 1;
        stage.visible = true;

        // ✅ Render to texture
        pixiApp.renderer.render({
          container: stage,
          target: renderTexture,
          clear: true,
        });

        // ✅ Create canvas with proper background
        const canvas = document.createElement("canvas");
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext("2d", { alpha: false });

        if (!ctx) {
          console.error("Failed to get canvas context");
          throw new Error("Canvas context creation failed");
        }

        // ✅ Set white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, finalWidth, finalHeight);

        // ✅ Extract and draw the rendered content
        try {
          // Method 1: Try direct canvas extraction
          const extractedCanvas =
            pixiApp.renderer.extract.canvas(renderTexture);

          let canvasSource: CanvasImageSource;
          if (extractedCanvas instanceof HTMLCanvasElement) {
            canvasSource = extractedCanvas;
          } else if (
            (extractedCanvas as any)?.view instanceof HTMLCanvasElement
          ) {
            canvasSource = (extractedCanvas as any).view;
          } else {
            canvasSource = extractedCanvas as unknown as HTMLCanvasElement;
          }

          ctx.drawImage(canvasSource, 0, 0, finalWidth, finalHeight);
        } catch (extractError) {
          console.warn(
            "Direct extraction failed, trying base64 method:",
            extractError
          );

          // Method 2: Base64 fallback
          const base64 = await pixiApp.renderer.extract.base64(renderTexture);
          const img = new Image();

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
              resolve();
            };
            img.onerror = reject;
            img.src = base64;
          });
        }

        // ✅ Convert to blob with optimized quality
        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            "image/png",
            0.95 // Higher quality for better results
          );
        });
      } finally {
        // ✅ Always restore original transform
        stage.x = originalTransform.x;
        stage.y = originalTransform.y;
        stage.scale.set(originalTransform.scaleX, originalTransform.scaleY);

        // ✅ Clean up render texture
        renderTexture.destroy();
      }
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
