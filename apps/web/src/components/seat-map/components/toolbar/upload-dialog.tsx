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
import {
  areaModeContainer,
  pixiApp,
  stage,
  initialAreaModeState,
} from "../../variables";
import {
  GridShape,
  RowShape,
  SeatShape,
  AreaModeContainer,
  CanvasItem,
} from "../../types";
import * as PIXI from "pixi.js";
import { uploadBlobToCloudinary } from "@/components/ui/file-uploader";
import { syncSeatMapToEventAction } from "@/lib/actions/organizer/events-action";

export const UploadDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(0);
  const router = useRouter();
  const eventId = useSeatMapStore.getState().eventId;

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

  const captureScreenshot = async (): Promise<Blob | null> => {
    if (pixiApp && stage) {
      const bounds = stage.getBounds();
      const padding = 400;
      const captureWidth = bounds.width + padding * 2;
      const captureHeight = bounds.height + padding * 2;

      const renderTexture = PIXI.RenderTexture.create({
        width: captureWidth,
        height: captureHeight,
      });

      const matrix = new PIXI.Matrix().translate(
        padding - bounds.x,
        padding - bounds.y
      );

      pixiApp.renderer.render({
        container: stage,
        target: renderTexture,
        transform: matrix,
      });

      const canvas = pixiApp.renderer.extract.canvas(renderTexture);
      const imageData = canvas.toDataURL!("image/png");

      renderTexture.destroy(true);

      const response = await fetch(imageData);
      const blob = await response.blob();
      return blob;
    }
    return null;
  };

  const serializeShape = (shape: CanvasItem): any => {
    const serialized: any = {};

    for (const [key, value] of Object.entries(shape)) {
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
        key === "seatGraphics" ||
        key === "labelGraphics" ||
        (typeof value === "object" &&
          value !== null &&
          (value.constructor?.name?.includes("PIXI") ||
            value.constructor?.name?.includes("Graphics") ||
            value.constructor?.name?.includes("Container") ||
            value.constructor?.name?.includes("Sprite") ||
            value.constructor?.name?.includes("Text")))
      ) {
        continue;
      }

      if (key === "children" && Array.isArray(value)) {
        serialized[key] = value.map((child) => serializeShape(child));
      } else if (Array.isArray(value)) {
        serialized[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? JSON.parse(JSON.stringify(item))
            : item
        );
      } else if (typeof value === "object" && value !== null) {
        if (value.constructor === Object) {
          serialized[key] = JSON.parse(JSON.stringify(value));
        } else {
          continue;
        }
      } else {
        serialized[key] = value;
      }
    }

    return serialized;
  };

  const countSeatsInGrid = (grid: GridShape): number => {
    return grid.children.reduce((total, row) => {
      return total + row.children.length;
    }, 0);
  };

  const calculateGridRevenue = (grid: GridShape): number => {
    const seatCount = countSeatsInGrid(grid);
    const seatPrice = grid.seatSettings?.price || 0;
    return seatCount * seatPrice;
  };

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

    const grids = areaModeContainer.children.filter(
      (child): child is GridShape =>
        child.type === "container" &&
        "gridName" in child &&
        "seatSettings" in child
    );

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

  const getNewEntities = () => {
    if (!areaModeContainer || !initialAreaModeState) {
      return captureAllEntities();
    }

    const newGrids: string[] = [];
    const newRows: Array<{ id: string; gridId: string }> = [];
    const newSeats: Array<{ id: string; rowId: string; gridId: string }> = [];

    const initialGridIds = initialAreaModeState.children.map((g) => g.id);
    const initialRowsByGrid: Record<string, string[]> = {};
    const initialSeatsByRow: Record<string, string[]> = {};

    initialAreaModeState.children.forEach((grid) => {
      initialRowsByGrid[grid.id] = grid.children.map((r) => r.id);
      grid.children.forEach((row) => {
        initialSeatsByRow[row.id] = row.children.map((s) => s.id);
      });
    });

    areaModeContainer.children.forEach((grid) => {
      if (grid.type === "container" && "gridName" in grid) {
        const isNewGrid = !initialGridIds.includes(grid.id);

        if (isNewGrid) {
          newGrids.push(grid.id);
        }

        grid.children.forEach((row) => {
          if (row.type === "container" && "rowName" in row) {
            const isNewRow = !initialRowsByGrid[grid.id]?.includes(row.id);

            if (isNewRow) {
              newRows.push({ id: row.id, gridId: grid.id });
            }

            row.children.forEach((seat) => {
              const isNewSeat = !initialSeatsByRow[row.id]?.includes(seat.id);

              if (isNewSeat) {
                newSeats.push({
                  id: seat.id,
                  rowId: row.id,
                  gridId: grid.id,
                });
              }
            });
          }
        });
      }
    });

    return { grids: newGrids, rows: newRows, seats: newSeats };
  };

  const captureAllEntities = () => {
    const grids: string[] = [];
    const rows: Array<{ id: string; gridId: string }> = [];
    const seats: Array<{ id: string; rowId: string; gridId: string }> = [];

    if (!areaModeContainer) {
      return { grids, rows, seats };
    }

    areaModeContainer.children.forEach((grid) => {
      if (grid.type === "container" && "gridName" in grid) {
        grids.push(grid.id);

        grid.children.forEach((row) => {
          if (row.type === "container" && "rowName" in row) {
            rows.push({ id: row.id, gridId: grid.id });

            row.children.forEach((seat) => {
              seats.push({ id: seat.id, rowId: row.id, gridId: grid.id });
            });
          }
        });
      }
    });

    return { grids, rows, seats };
  };

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

      let screenshotUrl = seatMap.image;

      try {
        setScreenshotProgress(10);
        toast.info("Capturing seat map screenshot...");

        console.log("Event ID for sync:", eventId, areaModeContainer);
        if (eventId && areaModeContainer) {
          const createdEntities = getNewEntities();

          console.log("📊 New entities to sync:", {
            eventId,
            seatMapId: seatMap.id,
            newGrids: createdEntities.grids.length,
            newRows: createdEntities.rows.length,
            newSeats: createdEntities.seats.length,
          });

          if (createdEntities.grids.length > 0) {
            const grids = areaModeContainer.children.filter(
              (child): child is GridShape =>
                child.type === "container" &&
                "gridName" in child &&
                "seatSettings" in child
            );

            const syncResult = await syncSeatMapToEventAction({
              eventId,
              seatMapId: seatMap.id,
              grids,
              createdEntityIds: createdEntities,
            });

            if (!syncResult.success) {
              toast.error("Failed to sync changes to event", {
                description: syncResult.error,
              });
              return;
            }

            if (syncResult.data) {
              toast.success("Event seating updated!", {
                description: `Added ${syncResult.data.areasCreated} areas with ${syncResult.data.totalSeats} seats`,
              });
            }
          } else {
            console.log("✅ No new entities to sync");
          }
        }

        setScreenshotProgress(30);
        const screenshotBlob = await captureScreenshot();

        if (screenshotBlob) {
          setScreenshotProgress(50);

          const sanitizedName =
            seatMap.name.replace(/[^a-zA-Z0-9]/g, "_") || "seatmap";
          const timestamp = new Date().getDate().toString();
          const filename = `${sanitizedName}_screenshot_${timestamp}.png`;

          toast.info("Uploading screenshot to cloud...");

          const uploadResponse = await uploadBlobToCloudinary(
            screenshotBlob,
            filename,
            "seat-maps",
            (progress) => {
              const mappedProgress = 30 + progress * 0.4;
              setScreenshotProgress(mappedProgress);
            },
            true
          );

          screenshotUrl = uploadResponse.secure_url;
          useSeatMapStore.getState().clearStoredHistory();

          toast.success("Screenshot captured and uploaded!");
        } else {
          console.warn(
            "Failed to capture screenshot, proceeding without updating image"
          );
          toast.warning("Screenshot capture failed, keeping existing image");
        }
      } catch (screenshotError) {
        console.error("Screenshot capture/upload failed:", screenshotError);
        toast.warning("Screenshot update failed, keeping existing image");
      }

      setScreenshotProgress(80);

      const serializedShapes = shapes.map((shape) => serializeShape(shape));

      setScreenshotProgress(90);

      const result = await updateSeatMapAction(
        seatMap.id,
        serializedShapes,
        seatMap.name,
        screenshotUrl
      );

      setScreenshotProgress(100);

      if (result.success) {
        toast.success("Seat map updated successfully!");
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

          {areaModeContainer && statistics.totalGrids > 0 ? (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-sm">Seat Statistics</h3>

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

          <div className="text-xs text-gray-500">
            {shapes.length > 0 ? (
              <p>✅ {shapes.length} total shape(s) in canvas</p>
            ) : (
              <p className="text-amber-600">⚠️ Add some shapes before saving</p>
            )}
          </div>

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
              {isUploading ? "Saving..." : "Save Seat Map"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
