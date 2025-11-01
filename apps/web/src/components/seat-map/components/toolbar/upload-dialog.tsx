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
import { areaModeContainer } from "../../variables";
import { GridData, CanvasItem } from "../../types";

export const UploadDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
        (typeof value === "object" &&
          value !== null &&
          (value.constructor?.name?.includes("PIXI") ||
            value.constructor?.name?.includes("Graphics") ||
            value.constructor?.name?.includes("Container") ||
            value.constructor?.name?.includes("Sprite")))
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

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!areaModeContainer?.grids) {
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

    areaModeContainer.grids
      .filter((grid: GridData) => grid.rows.some((row) => row.seats.length > 0))
      .forEach((grid: GridData) => {
        let gridSeats = 0;
        let gridRevenue = 0;

        grid.rows.forEach((row) => {
          gridSeats += row.seats.length;
          gridRevenue +=
            row.seats.length *
            (grid.seatSettings.price ||
              areaModeContainer!.defaultSeatSettings.price ||
              0);
        });

        totalSeats += gridSeats;
        totalRevenue += gridRevenue;

        gridBreakdown.push({
          name: grid.name || `Grid ${grid.id.slice(0, 8)}`,
          seatCount: gridSeats,
          revenue: gridRevenue,
        });
      });

    return {
      totalGrids: areaModeContainer.grids.filter((grid: GridData) =>
        grid.rows.some((row) => row.seats.length > 0)
      ).length,
      totalSeats,
      totalRevenue,
      gridBreakdown,
    };
  }, [areaModeContainer?.grids]);

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

    try {
      toast.info("Updating seat map...");

      // Serialize shapes to remove PIXI.js objects
      const serializedShapes = shapes.map((shape) => serializeShape(shape));

      console.log("📦 Serialized shapes:", serializedShapes);

      const result = await updateSeatMapAction(
        seatMap.id,
        serializedShapes,
        seatMap.name,
        seatMap.image
      );

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
                      Preview:
                    </span>
                    <img
                      src={seatMap.image}
                      alt="Seat map preview"
                      className="w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Area Mode Statistics */}
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
              {isUploading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
